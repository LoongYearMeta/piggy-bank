<template>
	<div class="page-container">
		<!-- 钱包信息区域 -->
		<WalletCard
			:wallet-info="walletInfo"
			:locale="locale"
			:is-loading-balance="isLoadingBalance"
			:is-loading-height="isLoadingHeight"
			@set-locale="setLocale"
			@refresh-address="handleRefreshAddress"
		/>
		<!-- 功能区域 -->
			<div class="form-container" :class="{ 'switching': isSwitching }">
			<section class="tabs-shell">
				<div class="tabs-nav">
					<button
						v-for="tab in tabs"
						:key="tab.key"
						type="button"
						class="tab-btn"
						:class="{ active: activeTab === tab.key }"
						@click="handleTabChange(tab.key)"
					>
						<span class="tab-btn__label">{{ tab.label }}</span>
						<!-- icon -->
						<span class="tab-btn__icon" aria-hidden="true">
							<svg viewBox="0 0 63 24" xmlns="http://www.w3.org/2000/svg" role="presentation">
								<path
									class="tab-btn__icon-path"
									d="M9,17 C44.0735077,2.87930749 55.406841,0.87832299 43,10.9970465 C30.593159,21.11577 34.448476,21.0602491 54.5659512,10.8304839"
									fill="none"
									stroke="#FFB03A"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</button>
				</div>
			<div class="tabs-panel" :class="{ 'switching': isSwitching }">
				<Transition name="tab-fade" mode="out-in" @before-enter="handleBeforeEnter" @after-enter="handleAfterEnter">
					<FormDeposit
						v-if="activeTab === 'deposit'"
						key="deposit"
						:balance="walletInfo.tbcBalance"
						:should-animate="shouldAnimateDeposit"
						@animation-complete="shouldAnimateDeposit = false"
					/>
					<Detail v-else key="detail" />
				</Transition>
			</div>
			</section>
		</div>
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, nextTick, computed } from 'vue';
import { locale as localeRef, setLocale, t } from '../../i18n';
import { useWalletStore } from '../../stores/wallet';
import WalletCard from './components/wallet-card.vue';
import FormDeposit from './components/form-deposit.vue';
import Detail from './components/detail.vue';

const locale = localeRef;
const walletStore = useWalletStore();
const { walletInfo, isLoadingBalance, isLoadingHeight, getAddress, getWalletInfo } = walletStore;

type TabKey = 'deposit' | 'detail';

const activeTab = ref<TabKey>('deposit');
const shouldAnimateDeposit = ref(false);
const isSwitching = ref(false);
const tabs = computed<Array<{ key: TabKey; label: string }>>(() => [
	{ key: 'deposit', label: t('tab_deposit') },
	{ key: 'detail', label: t('tab_detail') }
]);

// 切换前的处理
const handleBeforeEnter = () => {
	isSwitching.value = true;
	const isMobile = window.innerWidth <= 768;
	
	if (isMobile) {
		// 移动端：在切换前先隐藏滚动条，重置滚动位置
		document.body.classList.add('switching-tabs');
		window.scrollTo({ top: 0, behavior: 'instant' });
		const formContainer = document.querySelector('.form-container') as HTMLElement;
		if (formContainer) {
			formContainer.scrollTop = 0;
		}
	} else {
		// PC端：重置 form-container 和 tabs-panel 的滚动位置
		const formContainer = document.querySelector('.form-container') as HTMLElement;
		const tabsPanel = document.querySelector('.tabs-panel') as HTMLElement;
		if (formContainer) {
			formContainer.scrollTop = 0;
		}
		if (tabsPanel) {
			tabsPanel.scrollTop = 0;
		}
	}
};

// 切换后的处理
const handleAfterEnter = () => {
	const isMobile = window.innerWidth <= 768;
	
	// 使用 requestAnimationFrame 确保 DOM 完全渲染后再恢复
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			if (isMobile) {
				// 移动端：再次确保滚动位置在顶部
				window.scrollTo({ top: 0, behavior: 'instant' });
				// 延迟一小段时间后移除切换状态和 body 类名，确保滚动条不会再出现
				setTimeout(() => {
					window.scrollTo({ top: 0, behavior: 'instant' });
					isSwitching.value = false;
					setTimeout(() => {
						document.body.classList.remove('switching-tabs');
					}, 50);
				}, 150);
			} else {
				// PC端：再次确保滚动位置在顶部
				const formContainer = document.querySelector('.form-container') as HTMLElement;
				const tabsPanel = document.querySelector('.tabs-panel') as HTMLElement;
				if (formContainer) {
					formContainer.scrollTop = 0;
				}
				if (tabsPanel) {
					tabsPanel.scrollTop = 0;
				}
				// 延迟移除切换状态，确保滚动条不会再出现
				setTimeout(() => {
					isSwitching.value = false;
				}, 150);
			}
		});
	});
};

// 监听标签页切换，检测从 detail 切换到 deposit 的情况
watch(activeTab, (newTab, oldTab) => {
	if (newTab === 'deposit' && oldTab === 'detail') {
		// 从储值明细切换到存入资产，触发动画
		shouldAnimateDeposit.value = false;
		nextTick(() => {
			shouldAnimateDeposit.value = true;
		});
	} else {
		shouldAnimateDeposit.value = false;
	}
});

const handleTabChange = (key: TabKey) => {
	activeTab.value = key;
};

// 刷新地址
const handleRefreshAddress = async () => {
	await getAddress();
};

// 组件挂载时检查钱包状态
onMounted(async () => {
	const checkWalletWithRetry = async (retryCount = 0, maxRetries = 10) => {
		if (window.Turing) {
			await getWalletInfo();
		} else if (retryCount < maxRetries) {
			setTimeout(() => checkWalletWithRetry(retryCount + 1, maxRetries), 200);
		}
	};
	checkWalletWithRetry();
});
</script>

<style>
@import '../../assets/css/new-global.css';

@media (min-width: 769px) {
	.tabs-panel,
	.deposit-wrapper {
		scrollbar-width: none;
	}

	.tabs-panel::-webkit-scrollbar,
	.deposit-wrapper::-webkit-scrollbar {
		display: none;
	}
}
</style>
<style scoped>
.page-container {
	display: flex;
	flex-direction: column;
	width: 100%;
	max-width: 1270px;
	margin: 80px auto 0px;
	padding: 0 20px;
	box-sizing: border-box;
	row-gap: 24px;
	min-height: calc(100vh - 80px);
}

.form-container {
	display: flex;
	flex-direction: column;
	width: 100%;
	min-width: 480px;
	margin: 0 auto;
	margin-top: -90px;
	box-sizing: border-box;
	position: relative;
	z-index: 0;
	padding: 100px 40px calc(40px + env(safe-area-inset-bottom, 0px));
	border-radius: 40px 40px 0px 0px;
	background-color: #fff;
	overflow: visible;
	isolation: isolate;
	box-shadow: 0px -10px 20px rgba(255, 210, 143, 0.6);
	flex: 1 1 auto;
	min-height: 0;
}

.tabs-shell {
	display: flex;
	flex-direction: column;
	background: transparent;
	width: 100%;
	max-width: 900px;
	margin: 0 auto;
	row-gap: 24px;
	flex: 1 1 auto;
	min-height: 0;
}

.tabs-nav {
	display: flex;
	gap: 60px;
	justify-content: flex-start;
}

.tab-btn {
	position: relative;
	display: inline-flex;
	align-items: center;
	border: none;
	padding: 12px 28px 12px 0px;
	background: none;
	font-family: 'DemoItalicBold';
	font-size: 16px;
	font-weight: 700;
	color: rgba(39, 40, 45, 0.4);
	cursor: pointer;
	transition: color 0.2s ease;
}

.tab-btn__label {
	position: relative;
	z-index: 1;
}

.tab-btn__icon {
	position: absolute;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 64px;
	height: 24px;
	bottom: 0px;
	left: 16px;
	opacity: 0;
	transition: opacity 0.2s ease;
}

.tab-btn__icon svg {
	width: 100%;
	height: 100%;
}

.tab-btn__icon-path {
	stroke: #ffb03a;
	stroke-width: 3;
	stroke-linecap: round;
	stroke-linejoin: round;
	stroke-dasharray: 120;
	stroke-dashoffset: 120;
	animation: none;
}

.tab-btn.active {
	background: none;
	color: #000000;
}

.tab-btn.active .tab-btn__icon {
	opacity: 1;
}

.tab-btn.active .tab-btn__icon-path {
	animation: tab-icon-draw 0.7s ease forwards;
}

.tab-btn:not(.active):hover {
	color: rgba(39, 40, 45, 0.7);
}

@keyframes tab-icon-draw {
	to {
		stroke-dashoffset: 0;
	}
}

.tabs-panel {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	/* 允许内部内容的阴影在四周自然延展 */
	overflow: visible;
	flex: 1 1 auto;
	min-height: 0;
}

/* 标签页切换过渡动画 */
.tab-fade-enter-active,
.tab-fade-leave-active {
	transition: opacity 0.15s ease;
}

.tab-fade-enter-from,
.tab-fade-leave-to {
	opacity: 0;
}

/* 切换期间暂时隐藏滚动条 */
.tabs-panel.switching {
	/* 切换期间暂时禁用滚动，避免滚动条闪现 */
	overflow: hidden;
}

/* 移动端：切换期间隐藏滚动条 */
@media (max-width: 768px) {
	body.switching-tabs {
		overflow: hidden !important;
	}
}

/* 移动端适配 */
@media (max-width: 768px) {
	.page-container {
		/* 移动端：距离顶部10px，无左右padding */
		margin: 16px auto 0;
		padding: 0;
		width: 100%;
		max-width: 100%;
		/* 移除固定高度，允许整个页面滚动 */
		height: auto;
		min-height: 100vh;
		overflow: visible;
	}
	.form-container {
		/* 移动端：form容器贴住屏幕边缘，宽度100% */
		/* card宽度 = calc(100% - 32px) + margin 0 16px，所以form比card左右各宽16px */
		width: 100%;
		min-width: 100%;
		margin: 0;
		/* 移动端调整margin-top，确保与card正确重叠 */
		margin-top: -160px;
		/* 保留圆角和阴影，提升用户体验 */
		border-radius: 20px 20px 0 0;
		box-shadow: 0px -10px 20px rgba(255, 210, 143, 0.6);
		padding: 160px 16px calc(24px + env(safe-area-inset-bottom, 0px));
		position: relative;
		overflow: visible;
		/* 优化移动端触摸反馈 */
		touch-action: pan-y;
		flex: 1 1 auto;
		min-height: 0;
	}

	.tabs-shell {
		/* width: calc(100% - 32px); */
		/* margin: 0 auto; */
		/* padding-top: 24px; */
		/* 移动端：移除高度限制 */
		height: auto;
		min-height: 0;
		flex: 1 1 auto;
	}

	.tabs-nav {
		justify-content: center;
		flex-wrap: wrap;
		gap: 64px;
	}

	.tab-btn {
		padding: 10px 22px 10px 0;
		font-size: 14px;
	}

	.tab-btn__icon {
		width: 54px;
		height: 20px;
	}

	.tabs-panel {
		/* padding: 12px 0px 0; */
		border-radius: 24px;
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-height: 0;
		overflow: visible;
	}
}
</style>