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
						<span>{{ tab.label }}</span>
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
	gap: 10px;
	justify-content: flex-start;
}

.tab-btn {
	position: relative;
	border: none;
	padding: 12px 28px;
	background: none;
	font-family: 'DemoItalicBold';
	font-size: 16px;
	font-weight: 700;
	color: rgba(39, 40, 45, 0.4);
	cursor: pointer;
	transition: color 0.2s ease;
}

.tab-btn::after {
	content: '';
	position: absolute;
	bottom: 4px;
	left: 46px;
	width: 60px;
	height: 16px;
	background: url('../../assets/images/table-selected@2x.png') no-repeat center center;
	background-size: cover;
	z-index: -1;
	transform: scaleY(0);
	transform-origin: center;
	transition: transform 0.3s ease;
}

.tab-btn.active {
	background: none;
	color: #000000;
}

.tab-btn.active::after {
	transform: scaleY(1);
}

.tab-btn:not(.active):hover {
	color: rgba(39, 40, 45, 0.7);
}

.tabs-panel {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
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
		padding: 10px 22px;
		font-size: 14px;
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