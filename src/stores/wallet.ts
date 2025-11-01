import { defineStore } from 'pinia';
import { reactive, ref, computed } from 'vue';
import { API } from 'tbc-contract';
import { t } from '../i18n';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../utils/storage';

export const useWalletStore = defineStore('wallet', () => {
	// 状态
	const walletInfo = reactive({
		curAddress: '', // 钱包地址
		tbcBalance: null as number | null, // 钱包余额
		curBlockHeight: null as number | null, // 当前区块高度
	});

	// 加载状态
	const isLoadingBalance = ref(false);
	const isLoadingHeight = ref(false);

	const isConnected = ref(false);

	const isReady = computed(() => {
		return typeof window !== 'undefined' && !!window.Turing;
	});

	// 网络环境
	const network = import.meta.env.VITE_NETWORK || undefined;

	// 获取钱包地址（用户主动点击连接时调用）
	const getAddress = async () => {
		if (!isReady.value) {
			alert(t('warning_wallet_not_installed'));
			return false;
		}

		try {
			// 先尝试连接钱包（会弹出授权窗口）
			await window.Turing.connect();
			const { tbcAddress } = await window.Turing.getAddress();

			// 检查是否获取到地址
			if (!tbcAddress) {
				alert(t('warning_no_account'));
				isConnected.value = false;
				walletInfo.curAddress = '';
				removeLocalStorage('tbcAddress');
				return false;
			}

			// 检查是否与缓存地址不同（账户切换）
			const cachedAddress = getLocalStorage('tbcAddress');
			if (cachedAddress && cachedAddress !== tbcAddress) {
				console.log('检测到新账户，更新缓存');
			}

			// 先设置 loading 状态，清空旧值
			isLoadingBalance.value = true;
			isLoadingHeight.value = true;
			walletInfo.tbcBalance = null;
			walletInfo.curBlockHeight = null;

			// 立即显示地址
			walletInfo.curAddress = tbcAddress;
			isConnected.value = true;

			// 保存地址到 localStorage（7天过期）
			setLocalStorage('tbcAddress', tbcAddress, 1000 * 60 * 60 * 24 * 7);

			// 异步加载余额和高度
			getBalance();
			getBlockHeight();

			return true;
		} catch (error) {
			console.error('获取钱包地址失败:', error);
			isConnected.value = false;
			walletInfo.curAddress = '';
			removeLocalStorage('tbcAddress');
			alert(t('warning_connect_failed'));
			return false;
		}
	};

	// 获取钱包余额
	const getBalance = async () => {
		isLoadingBalance.value = true;
		try {
			const tbc = await API.getTBCbalance(walletInfo.curAddress, network);
			walletInfo.tbcBalance = tbc / 1000000;
		} catch (error) {
			console.error('获取钱包余额失败:', error);
		} finally {
			isLoadingBalance.value = false;
		}
	};

	// 获取当前区块高度
	const getBlockHeight = async () => {
		isLoadingHeight.value = true;
		try {
			const res = await API.fetchBlockHeaders(network);
			walletInfo.curBlockHeight = res[0]?.height || 0;
		} catch (error) {
			console.error('获取当前区块高度失败:', error);
		} finally {
			isLoadingHeight.value = false;
		}
	};

	// 断开钱包连接
	const disconnect = async () => {
		try {
			if (window.Turing && window.Turing.disconnect) {
				await window.Turing.disconnect();
			}
		} catch (error) {
			console.error('断开钱包连接失败:', error);
		} finally {
			// 清除状态
			walletInfo.curAddress = '';
			walletInfo.tbcBalance = 0;
			walletInfo.curBlockHeight = 0;
			isConnected.value = false;
			// 清除 localStorage
			removeLocalStorage('tbcAddress');
		}
	};

	// 获取钱包信息（静默检查并恢复连接）
	const getWalletInfo = async () => {
		await checkAccountChange();
	};

	// 检查钱包账户是否变更
	const checkAccountChange = async (): Promise<boolean> => {
		if (!window.Turing) {
			return false;
		}

		try {
			// 获取地址
			const { tbcAddress } = await window.Turing.getAddress();
			const cachedAddress = getLocalStorage('tbcAddress');

			// 情况1: 有地址 && 有缓存 && 地址匹配 && 未连接 -> 恢复连接
			if (tbcAddress && cachedAddress && cachedAddress === tbcAddress && !isConnected.value) {
				isLoadingBalance.value = true;
				isLoadingHeight.value = true;
				walletInfo.tbcBalance = null;
				walletInfo.curBlockHeight = null;
				walletInfo.curAddress = tbcAddress;
				isConnected.value = true;
				
				getBalance();
				getBlockHeight();
			}
			// 情况2: 有地址 && 地址变化（缓存不同或当前显示不同）-> 切换账户
			else if (tbcAddress && (cachedAddress !== tbcAddress || walletInfo.curAddress !== tbcAddress)) {
				isLoadingBalance.value = true;
				isLoadingHeight.value = true;
				walletInfo.tbcBalance = null;
				walletInfo.curBlockHeight = null;
				walletInfo.curAddress = tbcAddress;
				isConnected.value = true;
				
				setLocalStorage('tbcAddress', tbcAddress, 1000 * 60 * 60 * 24 * 7);
				
				getBalance();
				getBlockHeight();
			}
			else if (!tbcAddress) {
				isConnected.value = false;
				walletInfo.curAddress = '';
				walletInfo.tbcBalance = null;
				walletInfo.curBlockHeight = null;
				removeLocalStorage('tbcAddress');
			}
			
			return true;
		} catch (error: any) {
			isConnected.value = false;
			walletInfo.curAddress = '';
			walletInfo.tbcBalance = null;
			walletInfo.curBlockHeight = null;
			removeLocalStorage('tbcAddress');
			return false;
		}
	};

	return {
		walletInfo,
		isConnected,
		isReady,
		isLoadingBalance,
		isLoadingHeight,
		getAddress,
		getBalance,
		getBlockHeight,
		getWalletInfo,
		disconnect,
		checkAccountChange,
	};
});
