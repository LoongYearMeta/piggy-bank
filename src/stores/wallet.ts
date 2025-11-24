import { defineStore } from 'pinia';
import { reactive, ref, computed } from 'vue';
import { API } from 'tbc-contract';
import { t } from '../i18n';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../utils/storage';
import { waitForTuring } from '../utils/waitForTuring';

// 钱包 store
export const useWalletStore = defineStore('wallet', () => {
	const ADDRESS_CACHE_KEY = 'tbcAddress';
	const BALANCE_CACHE_KEY = 'tbcBalance';
	const HEIGHT_CACHE_KEY = 'tbcHeight';

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
		return typeof window !== 'undefined';
	});

	// 缓存地址
	const cachedAddress = getLocalStorage(ADDRESS_CACHE_KEY);
	if (cachedAddress) {
		walletInfo.curAddress = cachedAddress;
	}

	// 缓存余额
	const cachedBalance = getLocalStorage(BALANCE_CACHE_KEY);
	if (cachedBalance !== null) {
		const parsed = Number(cachedBalance);
		if (!Number.isNaN(parsed)) {
			walletInfo.tbcBalance = parsed;
		}
	}

	// 缓存区块高度
	const cachedHeight = getLocalStorage(HEIGHT_CACHE_KEY);
	if (cachedHeight !== null) {
		const parsed = Number(cachedHeight);
		if (!Number.isNaN(parsed)) {
			walletInfo.curBlockHeight = parsed;
		}
	}

	// 确保数据已获取
	const ensureDataFetched = () => {
		if (!walletInfo.curAddress) {
			return;
		}

		if (walletInfo.tbcBalance === null && !isLoadingBalance.value) {
			isLoadingBalance.value = true;
			getBalance();
		}

		if (walletInfo.curBlockHeight === null && !isLoadingHeight.value) {
			isLoadingHeight.value = true;
			getBlockHeight();
		}
	};

	// 网络环境
	const network = import.meta.env.VITE_NETWORK || undefined;

	// 获取钱包地址（用户主动点击连接时调用）
	const getAddress = async () => {
		if (!isReady.value) {
			alert(t('warning_wallet_not_installed'));
			return false;
		}

		try {
			const turing = await waitForTuring();

			// 先尝试连接钱包（会弹出授权窗口）
			if (turing.connect) {
				await turing.connect();
			}
			const { tbcAddress } = await turing.getAddress();

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
			setLocalStorage(ADDRESS_CACHE_KEY, tbcAddress, 1000 * 60 * 60 * 24 * 7);
			removeLocalStorage(BALANCE_CACHE_KEY);
			removeLocalStorage(HEIGHT_CACHE_KEY);

			// 异步加载余额和高度
			getBalance();
			getBlockHeight();

			return true;
		} catch (error) {
			console.error('获取钱包地址失败:', error);
			isConnected.value = false;
			walletInfo.curAddress = '';
			removeLocalStorage(ADDRESS_CACHE_KEY);
			removeLocalStorage(BALANCE_CACHE_KEY);
			removeLocalStorage(HEIGHT_CACHE_KEY);
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
			// 添加超时处理，避免代理连接失败导致长时间等待
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 10000); // 10秒超时
			});
			
			const apiPromise = API.getTBCbalance(walletInfo.curAddress, network);
			const tbc = await Promise.race([apiPromise, timeoutPromise]);
			walletInfo.tbcBalance = tbc / 1000000;
			setLocalStorage(BALANCE_CACHE_KEY, walletInfo.tbcBalance.toString(), 1000 * 60 * 5);
		} catch (error) {
			console.error('获取钱包余额失败:', error);
			// 如果已有缓存的余额，保持使用缓存，不要重置为0
			const cachedBalance = getLocalStorage(BALANCE_CACHE_KEY);
			if (cachedBalance !== null) {
				const parsed = Number(cachedBalance);
				if (!Number.isNaN(parsed) && parsed >= 0) {
					walletInfo.tbcBalance = parsed;
				} else {
					walletInfo.tbcBalance = null;
				}
			} else {
				walletInfo.tbcBalance = null;
			}
		} finally {
			isLoadingBalance.value = false;
		}
	};

	// 获取当前区块高度
	const getBlockHeight = async () => {
		// 区块高度不依赖地址，可以直接获取
		try {
			// 添加超时处理，避免代理连接失败导致长时间等待
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Request timeout')), 10000); // 10秒超时
			});
			
			const apiPromise = API.fetchBlockHeaders(network);
			const res = await Promise.race([apiPromise, timeoutPromise]);
			walletInfo.curBlockHeight = res[0]?.height || 0;
			setLocalStorage(HEIGHT_CACHE_KEY, walletInfo.curBlockHeight.toString(), 1000 * 60 * 5);
		} catch (error) {
			console.error('获取当前区块高度失败:', error);
			// 如果已有缓存的高度，保持使用缓存，不要重置为0
			const cachedHeight = getLocalStorage(HEIGHT_CACHE_KEY);
			if (cachedHeight !== null) {
				const parsed = Number(cachedHeight);
				if (!Number.isNaN(parsed) && parsed > 0) {
					walletInfo.curBlockHeight = parsed;
				} else {
					walletInfo.curBlockHeight = null;
				}
			} else {
				walletInfo.curBlockHeight = null;
			}
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
			removeLocalStorage(ADDRESS_CACHE_KEY);
			removeLocalStorage(BALANCE_CACHE_KEY);
			removeLocalStorage(HEIGHT_CACHE_KEY);
		}
	};

	// 获取钱包信息（静默检查并恢复连接）
	const getWalletInfo = async () => {
		await checkAccountChange();
	};

	// 检查钱包账户是否变更
	const checkAccountChange = async (): Promise<boolean> => {
		ensureDataFetched();

		try {
			const turing = await waitForTuring();
			const now = Date.now();
			const currentAddress = walletInfo.curAddress;
			const cachedAddress = getLocalStorage(ADDRESS_CACHE_KEY);
			
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
			
			// 获取地址（不主动 connect，避免反复弹窗）
			const { tbcAddress } = await turing.getAddress();

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
				
				setLocalStorage(ADDRESS_CACHE_KEY, tbcAddress, 1000 * 60 * 60 * 24 * 7);
				removeLocalStorage(BALANCE_CACHE_KEY);
				removeLocalStorage(HEIGHT_CACHE_KEY);
				
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
				if (!cachedAddress) {
					walletInfo.curAddress = '';
					walletInfo.tbcBalance = null;
					walletInfo.curBlockHeight = null;
					removeLocalStorage(BALANCE_CACHE_KEY);
					removeLocalStorage(HEIGHT_CACHE_KEY);
				}
				isLoadingBalance.value = false;
				isLoadingHeight.value = false;
			}
			
			return true;
		} catch (error: any) {
			isConnected.value = false;
			const cached = getLocalStorage(ADDRESS_CACHE_KEY);
			if (!cached) {
				walletInfo.curAddress = '';
				walletInfo.tbcBalance = null;
				removeLocalStorage(BALANCE_CACHE_KEY);
				removeLocalStorage(HEIGHT_CACHE_KEY);
			}
			walletInfo.curBlockHeight = null;
			isLoadingBalance.value = false;
			isLoadingHeight.value = false;
			if (!cached) {
				removeLocalStorage(ADDRESS_CACHE_KEY);
			}
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
