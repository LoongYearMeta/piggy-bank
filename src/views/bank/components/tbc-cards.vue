<template>
	<div class="detail-content">
		<!-- 空状态 -->
		<div v-if="!hasItems" class="empty-state">
			<img :src="emptyImage" class="empty-icon" />
			<p>{{ emptyText }}</p>
		</div>
		<!-- cards list -->
		<template v-else>
			<div
				class="detail-carousel"
				:class="{ 'is-static': isSingleRow }"
				ref="carouselRef"
				@scroll.passive="handleScroll"
				@wheel="handleCarouselWheel"
			>
				<div
					class="detail-card"
					v-for="(item, index) in items"
					:key="item.id"
					:class="{ active: index === activeCardIndex }"
					:style="cardStyle"
				>
					<div class="detail-card-main">
						<div class="amount-block">
							<div class="amount-block-header">
								<p class="card-label">{{ t('card_amount_label') }}</p>
								<button
										v-if="isWithdrawable"
										class="withdraw-btn"
										type="button"
										@click="handleWithdraw(item)"
										:disabled="isUnfreezing"
									>
										{{ t('withdraw') }}
									</button>
							</div>
							<!-- <div class="amount-value-block" :class="{ 'with-action': isWithdrawable }"> -->
								<!-- amount value -->
								<div class="amount-value-wrapper">
									<span class="amount-value">{{ formatAmount(item.satoshis) }}</span>
								</div>
						</div>
					</div>
					<div class="detail-card-divider"></div>
					<div class="detail-card-info">
						<div class="info-row">
							<span class="card-label">{{ t('card_storage_term') }}</span>
							<span class="info-value" :class="{ danger: isWithdrawable }">
								{{ isWithdrawable ? t('status_matured') : blockHeightToDate(item.lockTime) }}
							</span>
						</div>
						<div class="info-row">
							<span class="card-label">{{ t('card_block_height') }}</span>
							<span class="info-value">{{ formatBlockHeight(item.lockTime) }}</span>
						</div>
					</div>
				</div>
			</div>
			<div class="detail-pagination">
				<button
					v-for="pageIndex in totalPages"
					:key="`page-${pageIndex}`"
					class="pagination-dot"
					type="button"
					:class="{ active: pageIndex - 1 === activePageIndex }"
					@click="scrollToPage(pageIndex - 1)"
				></button>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useWalletStore } from '../../../stores/wallet';
import { t } from '../../../i18n';

interface Asset {
	id: string;
	satoshis: number;
	lockTime: number;
	[key: string]: any;
}

type CardMode = 'withdrawable' | 'frozen';

interface Props {
	items: Asset[];
	mode: CardMode;
	isUnfreezing?: boolean;
	currentBlockHeight?: number;
	emptyImage: string;
	emptyText: string;
}

const props = withDefaults(defineProps<Props>(), {
	items: () => [],
	mode: 'withdrawable',
	isUnfreezing: false,
	currentBlockHeight: 0,
	emptyImage: '',
	emptyText: '',
});

const emit = defineEmits<{
	withdraw: [asset: Asset];
}>();

// ===== Stores & derived state =====
const walletStore = useWalletStore();
const { walletInfo } = walletStore;
const curBlockHeight = computed(() => props.currentBlockHeight || walletInfo.curBlockHeight || 0);
const isWithdrawable = computed(() => props.mode === 'withdrawable');
const hasItems = computed(() => props.items.length > 0);

// ===== Layout measurements =====
const windowWidth = ref(window.innerWidth);

const carouselRef = ref<HTMLDivElement | null>(null);
const activeCardIndex = ref(0);
const activePageIndex = ref(0);
const cardWidth = ref(165);
const cardHeight = ref(198);
let scrollRaf = 0;
let resizeObserver: ResizeObserver | null = null;
let lastWheelTime = 0;

// ===== Constants =====
const CARD_GAP = 16;
const CARD_RATIO = 165 / 198;
const CARD_MAX_WIDTH = 165;
const CARD_MAX_HEIGHT = 198;
const CARD_MIN_WIDTH = 120;
const CARD_MIN_HEIGHT = Math.round(CARD_MIN_WIDTH / CARD_RATIO);
const MOBILE_BREAKPOINT = 768;
const PC_CARDS_PER_VIEW = 5;
const MOBILE_CARDS_PER_VIEW = 2;
const BASE_CARD_WIDTH = CARD_MAX_WIDTH;
const WHEEL_PAGE_DELAY = 320;

// 卡片尺寸计算
const clampCardSize = (nextWidth: number) => {
	const safeWidth = Math.min(CARD_MAX_WIDTH, Math.max(CARD_MIN_WIDTH, Math.round(nextWidth)));
	const rawHeight = Math.round(safeWidth / CARD_RATIO);
	const safeHeight = Math.min(CARD_MAX_HEIGHT, Math.max(CARD_MIN_HEIGHT, rawHeight));
	return { safeWidth, safeHeight };
};

// 构建卡片样式
const buildCardStyle = (width: number, height: number) => {
	const { safeWidth, safeHeight } = clampCardSize(width || BASE_CARD_WIDTH);
	const appliedHeight = height
		? Math.min(CARD_MAX_HEIGHT, Math.max(CARD_MIN_HEIGHT, Math.round(height)))
		: safeHeight;
	const scale = Number((safeWidth / BASE_CARD_WIDTH).toFixed(4));
	return {
		width: `${safeWidth}px`,
		height: `${appliedHeight}px`,
		'--card-scale': `${scale}`,
	};
};

// 卡片样式
const cardStyle = computed(() => buildCardStyle(cardWidth.value, cardHeight.value));

// ===== Format helpers =====
// 格式化金额
const formatAmount = (satoshis: number): string => {
	return (satoshis / 1000000).toFixed(2);
};
// 格式化区块高度
const formatBlockHeight = (blockHeight: number): string => {
	if (!blockHeight) return '0';
	return blockHeight.toLocaleString('en-US');
};
// 区块高度转换日期
const blockHeightToDate = (blockHeight: number): string => {
	if (!blockHeight || blockHeight <= 0) return t('status_invalid_block_height');
	try {
		const currentBlockHeight = curBlockHeight.value;
		const currentTime = new Date();
		if (blockHeight <= currentBlockHeight) {
			return t('status_matured');
		}
		const blockDifference = blockHeight - currentBlockHeight;
		const blockTimeMinutes = 10;
		const timeDifferenceMs = blockDifference * blockTimeMinutes * 60 * 1000;
		const targetTime = new Date(currentTime.getTime() + timeDifferenceMs);
		const targetDate = new Date(
			targetTime.getFullYear(),
			targetTime.getMonth(),
			targetTime.getDate(),
		);
		const year = targetDate.getFullYear();
		const month = String(targetDate.getMonth() + 1).padStart(2, '0');
		const day = String(targetDate.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	} catch (error) {
		console.error('区块高度转换日期失败:', error);
		return t('status_convert_failed');
	}
};
// 处理提现
const handleWithdraw = (asset: Asset) => {
	if (!isWithdrawable.value) return;
	emit('withdraw', asset);
};

// ===== Carousel pagination helpers =====
// 计算每页显示的卡片数量
const paginationPerView = computed(() => {
	const isMobile = windowWidth.value <= MOBILE_BREAKPOINT;
	return isMobile ? MOBILE_CARDS_PER_VIEW : PC_CARDS_PER_VIEW;
});
// 是否单行显示
const isSingleRow = computed(() => {
	return props.items.length <= paginationPerView.value;
});
// 计算总页数
const totalPages = computed(() => {
	const perView = paginationPerView.value;
	return Math.max(1, Math.ceil(props.items.length / perView));
});

// ===== Measurement & resize handling =====
// 应用测量
const applyMeasurements = () => {
	const el = carouselRef.value;
	if (!el) return;
	const containerWidth = el.clientWidth;
	if (!containerWidth) return;
	windowWidth.value = window.innerWidth;
	const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
	const perView = isMobile ? MOBILE_CARDS_PER_VIEW : PC_CARDS_PER_VIEW;
	const usableWidth = containerWidth - CARD_GAP * (perView - 1);
	const distributedWidth = usableWidth / perView;
	const { safeWidth, safeHeight } = clampCardSize(distributedWidth);
	cardWidth.value = safeWidth;
	cardHeight.value = safeHeight;
	requestAnimationFrame(() => {
		updateActiveIndex();
	});
};

// 设置resize观察器
const setupResizeObserver = () => {
	if (resizeObserver || !carouselRef.value) return;
	resizeObserver = new ResizeObserver(() => {
		applyMeasurements();
	});
	resizeObserver.observe(carouselRef.value);
	applyMeasurements();
};

// 更新活动卡片索引
const updateActiveIndex = () => {
	const el = carouselRef.value;
	if (!el) return;
	const cards = Array.from(el.children) as HTMLElement[];
	if (!cards.length) return;

	const viewportCenter = el.scrollLeft + el.clientWidth / 2;
	let closestIndex = 0;
	let minDistance = Number.POSITIVE_INFINITY;

	cards.forEach((card, index) => {
		const cardCenter = card.offsetLeft + card.offsetWidth / 2;
		const distance = Math.abs(cardCenter - viewportCenter);
		if (distance < minDistance) {
			minDistance = distance;
			closestIndex = index;
		}
	});

	if (Math.abs(el.scrollLeft + el.clientWidth - el.scrollWidth) <= 1) {
		closestIndex = cards.length - 1;
	}

	activeCardIndex.value = closestIndex;
	const perView = paginationPerView.value;
	const nextPageIndex = Math.floor(closestIndex / perView);
	activePageIndex.value = Math.min(totalPages.value - 1, nextPageIndex);
};

// 处理滚动
const handleScroll = () => {
	cancelAnimationFrame(scrollRaf);
	scrollRaf = requestAnimationFrame(updateActiveIndex);
};

// 滚动到指定页
const scrollToPage = (pageIndex: number) => {
	const el = carouselRef.value;
	if (!el) return;
	const perView = paginationPerView.value;
	const targetIndex = pageIndex * perView;
	if (targetIndex >= props.items.length) return;
	const target = el.children[targetIndex] as HTMLElement | undefined;
	if (!target) return;
	el.scrollTo({
		left: target.offsetLeft,
		behavior: 'smooth',
	});
};

// 处理滚动轮
const handleCarouselWheel = (event: WheelEvent) => {
	if (window.innerWidth <= MOBILE_BREAKPOINT) return;
	if (totalPages.value <= 1) return;

	event.preventDefault();
	const now = performance.now();
	if (now - lastWheelTime < WHEEL_PAGE_DELAY) return;
	lastWheelTime = now;

	const deltaMagnitude =
		Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
	if (deltaMagnitude === 0) return;

	const currentPage = activePageIndex.value;
	const nextPage =
		deltaMagnitude > 0
			? Math.min(totalPages.value - 1, currentPage + 1)
			: Math.max(0, currentPage - 1);
	if (nextPage === currentPage) return;

	scrollToPage(nextPage);
};

// ===== Watchers =====
watch(
	() => props.items.length,
	() => {
		nextTick(() => {
			if (hasItems.value) {
				applyMeasurements();
			} else {
				activeCardIndex.value = 0;
				activePageIndex.value = 0;
			}
		});
	},
);

// ===== Lifecycle =====
onMounted(() => {
	setupResizeObserver();
	requestAnimationFrame(() => {
		updateActiveIndex();
	});
});

onBeforeUnmount(() => {
	window.cancelAnimationFrame(scrollRaf);
	resizeObserver?.disconnect();
	resizeObserver = null;
});
</script>

<style scoped lang="less">
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40px 20px;
	text-align: center;
}

.empty-icon {
	width: 20%;
	margin-bottom: 16px;
}

.empty-state p {
	font-family: PingFangSC-Regular;
	font-size: 12px;
	color: rgba(0, 0, 0, 0.45);
	margin: 0;
}

.detail-content {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.detail-carousel {
	display: flex;
	gap: 16px;
	overflow-x: auto;
	// margin: 0 16px;
	scrollbar-width: none;
	padding-bottom: 8px;
	scroll-snap-type: x mandatory;
	-webkit-overflow-scrolling: touch;
}

.detail-carousel.is-static {
	overflow-x: hidden;
	scroll-snap-type: none;
}

.detail-carousel::-webkit-scrollbar {
	display: none;
}

.detail-card {
	--card-scale: 1;
	flex: 0 0 auto;
	height: 198px;
	width: 165px;
	box-sizing: border-box;
	padding: 12px;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	background: url('../../../assets/images/total-assets-card-bg@2x.png') no-repeat center center;
	background-size: cover;
	scroll-snap-align: center;
	color: #312515;
	overflow: hidden;
}

.detail-card-divider {
	width: 100%;
	height: 1px;
	background: rgba(255, 255, 255, 0.35);
	mix-blend-mode: multiply;
}

.detail-card-main {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.amount-block {
	display: flex;
	flex-direction: column;
	width: 100%;
	gap: 4px;
}

.amount-block-header {
	position: relative;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex: 1;
	flex-wrap: nowrap;
	gap: 8px;
	box-sizing: border-box;
}

.amount-value-wrapper {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: flex-start;
}

.card-label {
	font-family: PingFangSC-Semibold;
	font-size: 12px;
	color: rgba(0, 0, 0, 0.3);
	letter-spacing: 0.5px;
	font-weight: 600;
}

.amount-value {
	flex: 1 1 auto;
	min-width: 0;
	display: block;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-size: 24px;
	font-weight: 700;
	line-height: 1.1;
}

.withdraw-btn {
	border: none;
	outline: none;
	border-radius: calc(8px * var(--card-scale));
	width: clamp(40px, calc(var(--card-scale) * 48px), 48px);
	height: clamp(20px, calc(var(--card-scale) * 24px), 24px);
	padding: 0;
	line-height: 1.1;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: #ffb03a;
	color: #000000;
	font-family: DemoItalicBold;
	font-size: clamp(11px, calc(var(--card-scale) * 14px), 14px);
	font-weight: 600;
	cursor: pointer;
	flex-shrink: 0;
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;
}

.withdraw-btn:active {
	transform: scale(0.96);
	box-shadow: 0 4px 8px rgba(255, 149, 0, 0.25);
}

.withdraw-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.detail-card-info {
	display: flex;
	flex-direction: column;
	gap: 12px;
	font-size: 13px;
}

.info-row {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 6px;
}

.info-value {
	font-family: PingFangSC-Semibold;
	font-weight: 600;
	color: #000000;
	font-size: 12px;
}

.detail-pagination {
	display: flex;
	justify-content: center;
	gap: 8px;
}

.pagination-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: #d8d8d8;
	border: none;
	outline: none;
	padding: 0;
	cursor: pointer;
	transition:
		width 0.3s ease,
		background 0.3s ease,
		border-radius 0.3s ease;
}

.pagination-dot.active {
	width: 36px;
	border-radius: 6px;
	background: linear-gradient(90deg, #ffb53a 0%, #ff9138 100%);
}

@media (max-width: 768px) {
	.detail-card {
		scroll-snap-align: start;
		scroll-snap-stop: always;
	}
	.detail-carousel {
		margin: 0 16px;
	}
	.empty-icon {
		width: 40%;
		margin-bottom: 16px;
	}
	.amount-label {
		font-size: 11px;
		color: rgba(0, 0, 0, 0.55);
	}
	.amount-value {
		font-size: 24px;
	}
	.detail-card-info {
		font-size: 12px;
		gap: 8px;
	}
	.detail-pagination {
		gap: 6px;
	}
	.pagination-dot {
		width: 8px;
		height: 8px;
	}
	.pagination-dot.active {
		width: 28px;
	}
}
</style>
