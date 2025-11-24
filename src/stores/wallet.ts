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
	
	// 用于控制检查频率的时间戳
	let lastCheckTime = 0;
	const CHECK_INTERVAL = 5000; // 最小检查间隔：5秒（避免过度频繁的调用）

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
		// 如果地址不存在，直接返回，不设置 loading
		if (!walletInfo.curAddress) {
			isLoadingBalance.value = false;
			return;
		}
		
		try {
			const tbc = await API.getTBCbalance(walletInfo.curAddress, network);
			walletInfo.tbcBalance = tbc / 1000000;
		} catch (error) {
			console.error('获取钱包余额失败:', error);
			walletInfo.tbcBalance = 0;
		} finally {
			isLoadingBalance.value = false;
		}
	};

	// 获取当前区块高度
	const getBlockHeight = async () => {
		// 区块高度不依赖地址，可以直接获取
		try {
			const res = await API.fetchBlockHeaders(network);
			walletInfo.curBlockHeight = res[0]?.height || 0;
		} catch (error) {
			console.error('获取当前区块高度失败:', error);
			walletInfo.curBlockHeight = 0;
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
			const now = Date.now();
			const currentAddress = walletInfo.curAddress;
			const cachedAddress = getLocalStorage('tbcAddress');
			
			// 如果钱包已连接且有地址，并且距离上次检查时间太短，则跳过本次检查
			// 这样可以减少不必要的 API 调用和日志输出
			// 但是首次加载时（lastCheckTime === 0）或者有缓存地址但未连接时，需要强制检查
			const isFirstCheck = lastCheckTime === 0;
			const shouldSkipCheck = isConnected.value && currentAddress && !isFirstCheck && (now - lastCheckTime) < CHECK_INTERVAL;
			
			// 如果有缓存地址但未连接，需要强制检查以恢复连接
			const shouldForceCheck = cachedAddress && !isConnected.value;
			
			if (shouldSkipCheck && !shouldForceCheck) {
				return true;
			}
			
			lastCheckTime = now;
			
			// 获取地址
			const { tbcAddress } = await window.Turing.getAddress();

			// 情况1: 有地址 && 有缓存 && 地址匹配 && 未连接 -> 恢复连接
			if (tbcAddress && cachedAddress && cachedAddress === tbcAddress && !isConnected.value) {
				walletInfo.curAddress = tbcAddress;
				isConnected.value = true;
				
				// 只有在数据不存在时才设置 loading 状态并获取数据
				// 如果数据已经存在，说明可能是从其他途径获取的，不需要重新获取
				const needBalance = walletInfo.tbcBalance === null;
				const needHeight = walletInfo.curBlockHeight === null;
				
				if (needBalance) {
					isLoadingBalance.value = true;
					getBalance();
				}
				
				if (needHeight) {
					isLoadingHeight.value = true;
					getBlockHeight();
				}
			}
			// 情况2: 有地址 && 地址变化（缓存不同或当前显示不同）-> 切换账户
			else if (tbcAddress && (cachedAddress !== tbcAddress || currentAddress !== tbcAddress)) {
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
			// 情况3: 地址相同且已连接 -> 检查数据是否已存在，如果不存在则获取
			else if (tbcAddress && tbcAddress === currentAddress && isConnected.value) {
				// 地址没有变化，但需要检查数据是否已存在
				// 如果数据不存在，需要获取数据
				const needBalance = walletInfo.tbcBalance === null && !isLoadingBalance.value;
				const needHeight = walletInfo.curBlockHeight === null && !isLoadingHeight.value;
				
				if (needBalance) {
					isLoadingBalance.value = true;
					getBalance();
				}
				
				if (needHeight) {
					isLoadingHeight.value = true;
					getBlockHeight();
				}
				
				return true;
			}
			else if (!tbcAddress) {
				isConnected.value = false;
				walletInfo.curAddress = '';
				walletInfo.tbcBalance = null;
				walletInfo.curBlockHeight = null;
				isLoadingBalance.value = false;
				isLoadingHeight.value = false;
				removeLocalStorage('tbcAddress');
			}
			
			return true;
		} catch (error: any) {
			isConnected.value = false;
			walletInfo.curAddress = '';
			walletInfo.tbcBalance = null;
			walletInfo.curBlockHeight = null;
			isLoadingBalance.value = false;
			isLoadingHeight.value = false;
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
