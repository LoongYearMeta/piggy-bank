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
			await walletStore.checkAccountChange();
		} catch {
			// 忽略单次失败，稍后重新触发
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
	runSync();
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
