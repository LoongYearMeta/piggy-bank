<template>
	<div class="wallet-section">
		<!-- 获取钱包地址、余额、区块高度 -->
		<button @click="getAddress">{{ t('click_get_address') }}</button>
		<!-- 钱包信息 -->
		<template v-if="walletInfo.curAddress">
			<div class="form-group">
				<label>{{ t('current_address') }}</label>
				<input v-model="walletInfo.curAddress" disabled />
			</div>
			<div class="form-group">
				<label>{{ t('current_balance') }}</label>
				<input v-if="isLoadingBalance" value="加载中..." disabled />
				<input v-else v-model="walletInfo.tbcBalance" disabled />
			</div>
			<div class="form-group">
				<label>{{ t('current_height') }}</label>
				<input v-if="isLoadingHeight" value="加载中..." disabled />
				<input v-else v-model="walletInfo.curBlockHeight" disabled />
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { t } from '../i18n';
import { onMounted } from 'vue';
import { useWalletStore } from '../stores/wallet';

// 使用 Pinia store
const walletStore = useWalletStore();
const { walletInfo, isLoadingBalance, isLoadingHeight, getAddress, getBalance, getBlockHeight, getWalletInfo } = walletStore;

// 组件挂载时静默检查钱包状态（不阻塞渲染）
onMounted(() => {
	getWalletInfo();
});

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
