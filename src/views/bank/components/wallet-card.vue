<template>
	<div class="card-container">
		<div class="card-header">
			<div class="card-title">
				<img src="../../../assets/images/logo@2x.png" class="logo-img" />
				<span>{{ t('app_title') }}</span>
			</div>
			<div class="lang-btns">
				<button
					type="button"
					class="lang-btn"
					:class="{ active: locale === 'zh' }"
					@click="handleSetLocale('zh')"
				>
					<span class="lang-text">中文</span>
				</button>
				<button
					type="button"
					class="lang-btn"
					:class="{ active: locale === 'en' }"
					@click="handleSetLocale('en')"
				>
					<span class="lang-text">English</span>
				</button>
			</div>
		</div>
		<div class="card-content">
			<div class="info-item">
				<label class="info-label">{{ t('current_balance') }}</label>
				<div class="info-num">
					{{ isLoadingBalance || walletInfo.tbcBalance === null ? t('loading') : walletInfo.tbcBalance }}
				</div>
			</div>
			<div class="info-item">
				<label class="info-label">
					{{ t('current_address') }}
					<button class="refresh-btn" @click.stop="handleRefreshAddress">{{ t('click_get_address') }}</button>
				</label>
				<div class="info-value">
					{{ walletInfo.curAddress || '--' }}
				</div>
			</div>
			<div class="info-item">
				<label class="info-label">{{ t('current_height') }}</label>
				<div class="info-value">
					{{ isLoadingHeight || walletInfo.curBlockHeight === null ? t('loading') : walletInfo.curBlockHeight }}
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { t } from '../../../i18n';

type LocaleType = 'zh' | 'en';

interface WalletInfo {
	curAddress: string | null;
	tbcBalance: number | null;
	curBlockHeight: number | null;
}

const props = defineProps<{
	locale: string;
	walletInfo: WalletInfo;
	isLoadingBalance: boolean;
	isLoadingHeight: boolean;
}>();

const emit = defineEmits<{
	(e: 'set-locale', value: LocaleType): void;
	(e: 'refresh-address'): void;
}>();

const handleSetLocale = (value: LocaleType) => {
	if (props.locale === value) {
		return;
	}
	emit('set-locale', value);
};

const handleRefreshAddress = () => {
	emit('refresh-address');
};
</script>

<style scoped>
.card-container {
	display: flex;
	flex-direction: column;
	height: 182px;
	flex-shrink: 0;
	width: min(1150px, calc(100% - 80px));
	min-width: 400px;
	background: url('../../../assets/images/pc-bg@2x.png') no-repeat center center;
	background-size: cover;
	background-position: center;
	margin: 0 auto;
	border-radius: 40px;
	box-sizing: border-box;
	padding: 30px 30px 30px 60px;
	z-index: 1;
	position: relative;
}

.card-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 24px;
}

.card-title {
	font-family: DemoItalicBold;
	font-size: 20px;
	color: #000000;
	letter-spacing: 1.11px;
	font-weight: 900;
	margin: 0;
	display: flex;
	align-items: flex-start;
	gap: 8px;
}

.card-title span {
	display: inline-flex;
	align-items: flex-start;
	line-height: 1;
}

.logo-img {
	width: 24px;
	height: 24px;
	display: block;
}

.lang-btns {
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	height: 32px;
	padding: 0 4px;
	gap: 4px;
}

.lang-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 50px;
	padding: 4px 8px;
	background: #fff;
	border: none;
	cursor: pointer;
	transition: all 0.3s ease;
	font-size: 12px;
	position: relative;
	font-weight: 500;
	border-radius: 6px;
}

.lang-btn.active {
	background: #ffb03a;
	color: #5a2e00;
}

.lang-btn:not(.active) {
	background: #fff;
	color: #999;
}

.lang-btn:hover:not(.active) {
	background: #f5f5f5;
}

.lang-btn:hover.active {
	opacity: 0.95;
}

.lang-text {
	font-weight: 500;
	white-space: nowrap;
}

.card-content {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 20px;
	flex: 1;
}

.info-item {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
}

.info-label {
	font-family: PingFangSC-Semibold;
	font-size: 14px;
	font-weight: 600;
	color: #00000040;
	margin-bottom: 4px;
	display: flex;
	align-items: center;
	gap: 12px;
	cursor: default;
	user-select: none;
	pointer-events: none;
}

.refresh-btn {
	font-weight: 600;
	padding: 2px 8px;
	background: none;
	border: none;
	border-radius: 4px;
	color: #CF7C00;
	font-size: 12px;
	cursor: pointer;
	transition: all 0.3s ease;
	pointer-events: auto;
	position: relative;
	z-index: 1;
	flex-shrink: 0;
}

.refresh-btn:hover {
	background: rgba(255, 105, 0, 0.2);
}

.info-value {
	font-family: DemoItalicBold;
	font-size: 14px;
	font-weight: bold;
	color: #333;
	word-break: break-all;
}

.info-num {
	font-family: DemoItalicBold;
	font-size: 28px;
	font-weight: 900;
	color: #000000;
	letter-spacing: 1.56px;
}

@media (min-width: 1310px) {
	.card-container {
		width: 1150px;
	}
}

@media (max-width: 1309px) and (min-width: 560px) {
	.card-container {
		width: min(1150px, calc(100% - 80px));
	}
}

@media (max-width: 768px) {
	.card-container {
		width: calc(100% - 32px);
		min-width: 0;
		margin: 0 16px;
		background: url('../../../assets/images/bg@2x.png') no-repeat center center;
		background-size: cover;
		background-position: center;
		padding: 24px;
		height: auto;
		min-height: auto;
		border-radius: 20px;
	}

	.card-header {
		margin-bottom: 16px;
	}

	.card-title {
		font-size: 18px;
	}

	.logo-img {
		width: 20px;
		height: 20px;
	}

	.lang-btns {
		height: 28px;
		padding: 0 3px;
		gap: 3px;
	}

	.lang-btn {
		width: 45px;
		padding: 3px 6px;
		font-size: 11px;
	}

	.card-content {
		flex-direction: column;
		gap: 16px;
		width: 100%;
	}

	.info-item {
		width: 100%;
	}

	.info-label {
		font-size: 12px;
		margin-bottom: 6px;
	}

	.info-value {
		font-size: 16px;
	}

	.refresh-btn {
		padding: 2px 6px;
		font-size: 11px;
	}
}
</style>

