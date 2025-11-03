<template>
	<div class="wallet-section">
		<!-- 获取钱包地址、余额、区块高度 -->
		<button @click="handleGetAddress">{{ t('click_get_address') }}</button>
		<!-- 钱包信息 -->
		<template v-if="walletInfo.curAddress">
			<div class="form-group">
				<label>{{ t('current_address') }}</label>
				<input v-model="walletInfo.curAddress" disabled />
			</div>
			<div class="form-group">
				<label>{{ t('current_balance') }}</label>
				<input v-if="isLoadingBalance || walletInfo.tbcBalance === null" :value="t('loading')" disabled />
				<input v-else v-model="walletInfo.tbcBalance" disabled />
			</div>
			<div class="form-group">
				<label>{{ t('current_height') }}</label>
				<input v-if="isLoadingHeight || walletInfo.curBlockHeight === null" :value="t('loading')" disabled />
				<input v-else v-model="walletInfo.curBlockHeight" disabled />
			</div>
		</template>
	</div>
	<!-- 成功提示 -->
	<Transition name="toast-success-fade">
		<div class="toast-success" v-if="successMessage">{{ successMessage }}</div>
	</Transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { t } from '../i18n';
import { useWalletStore } from '../stores/wallet';

// 使用 Pinia store
const walletStore = useWalletStore();
const { walletInfo, isLoadingBalance, isLoadingHeight, getAddress, getBalance, getBlockHeight, getWalletInfo } = walletStore;

// 成功提示消息
const successMessage = ref('');

// 定时器引用，用于清除之前的定时器
let successMessageTimer: NodeJS.Timeout | null = null;

// 处理获取地址
const handleGetAddress = async () => {
	const result = await getAddress();
	if (result) {
		// 获取地址成功，显示提示（3秒后自动隐藏）
		// 清除之前的定时器（如果存在）
		if (successMessageTimer) {
			clearTimeout(successMessageTimer);
		}
		successMessage.value = t('address_get_success');
		// 3秒后自动隐藏
		successMessageTimer = setTimeout(() => {
			successMessage.value = '';
			successMessageTimer = null;
		}, 3000);
	}
};

// 暴露方法供父组件调用
defineExpose({
	getWalletInfo,
	getAddress,
	getBalance,
	getBlockHeight,
});
</script>

<style scoped>
/* 钱包信息区域 */
.wallet-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: var(--radius-md);
	padding: var(--spacing-lg);
	margin-bottom: var(--spacing-lg);
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
	box-shadow: var(--shadow-md);
}
/* 表单输入框样式 */
.form-group input {
	width: 100%;
	padding: var(--spacing-sm);
	border: 1px solid #eee;
	border-radius: var(--radius-sm);
	background: #ffffff;
	font-size: 16px;
	outline: none;
	box-sizing: border-box;
	color: #333 !important;
	caret-color: #333 !important;
	transition:
		border-color 0.3s ease,
		box-shadow 0.3s ease;
}

.form-group input:focus {
	border-color: var(--blue-100);
	box-shadow: 0 0 0 2px var(--blue-focus);
}
.wallet-section button:first-of-type {
	background: #a2d0fa;
	color: #3d3c63;
	border: none;
	padding: 8px 16px;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.3s;
}

.wallet-section button:first-of-type:hover {
	background: #7bc1f7;
}
</style>
