<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useWalletStore } from './stores/wallet';

let checkInterval: NodeJS.Timeout | null = null;

// 组件挂载时检查钱包状态
onMounted(() => {
	const walletStore = useWalletStore();
	
	const checkWithRetry = () => {
		if (window.Turing) {
			walletStore.checkAccountChange();
			
			checkInterval = setInterval(() => {
				walletStore.checkAccountChange();
			}, 5000);
		} else {
			let retryCount = 0;
			const retryInterval = setInterval(() => {
				retryCount++;
				if (window.Turing) {
					clearInterval(retryInterval);
					walletStore.checkAccountChange();
					
					checkInterval = setInterval(() => {
						walletStore.checkAccountChange();
					}, 5000);
				} else if (retryCount >= 10) {
					clearInterval(retryInterval);
				}
			}, 100);
		}
	};
	
	checkWithRetry();
});

// 组件卸载时清理定时器
onUnmounted(() => {
	if (checkInterval) {
		clearInterval(checkInterval);
		checkInterval = null;
	}
});
</script>

<template>
	<div id="app">
		<router-view />
	</div>
</template>

<style>
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family:
		-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
		'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	background: linear-gradient(270deg, #eef5ff 0%, #f1eef9 100%);
	/* min-height: 100vh; */
}

#app {
	min-height: calc(100vh - 2rem);
	min-width: calc(100vw - 2rem);
}
</style>
