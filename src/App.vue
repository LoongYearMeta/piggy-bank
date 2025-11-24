<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useWalletStore } from './stores/wallet';

const walletStore = useWalletStore();

let checkInterval: ReturnType<typeof setInterval> | null = null;
let syncingPromise: Promise<void> | null = null;

const runSync = () => {
	if (syncingPromise) {
		return syncingPromise;
	}

	const currentPromise = (async () => {
		try {
			// 添加超时处理，避免网络问题导致长时间阻塞
			const timeoutPromise = new Promise<void>((_, reject) => {
				setTimeout(() => reject(new Error('Sync timeout')), 15000); // 15秒超时
			});
			
			const syncPromise = walletStore.checkAccountChange();
			await Promise.race([syncPromise, timeoutPromise]);
		} catch (error) {
			// 忽略单次失败，稍后重新触发
			// 记录错误但不影响页面加载
			if (error instanceof Error && !error.message.includes('timeout')) {
				console.error('钱包同步失败:', error);
			}
		}
	})();

	syncingPromise = currentPromise;
	currentPromise.finally(() => {
		if (syncingPromise === currentPromise) {
			syncingPromise = null;
		}
	});

	return currentPromise;
};

const handleVisibilityChange = () => {
	if (document.visibilityState === 'visible') {
		runSync();
	}
};

const handleWindowFocus = () => {
	runSync();
};

onMounted(() => {
	// 延迟执行初始同步，确保页面已经加载完成，避免阻塞首屏渲染
	// 这对于移动端代理连接问题特别重要
	setTimeout(() => {
		runSync();
	}, 500);
	
	checkInterval = setInterval(runSync, 10000);
	document.addEventListener('visibilitychange', handleVisibilityChange);
	window.addEventListener('focus', handleWindowFocus);
});

onUnmounted(() => {
	if (checkInterval) {
		clearInterval(checkInterval);
		checkInterval = null;
	}
	document.removeEventListener('visibilitychange', handleVisibilityChange);
	window.removeEventListener('focus', handleWindowFocus);
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
	/* background: linear-gradient(270deg, #eef5ff 0%, #f1eef9 100%); */
}
</style>
