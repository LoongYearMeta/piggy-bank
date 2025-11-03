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

	// 网络环境（从构建时环境变量获取，作为后备值）
	const defaultNetwork = import.meta.env.VITE_NETWORK || undefined;
	
	// 响应式的网络类型
	const network = ref<string | undefined>(defaultNetwork);
	
	// 网络检测状态
	const isDetectingNetwork = ref(false);
	
	// 动态检测网络类型
	const detectNetwork = async (): Promise<string | undefined> => {
		if (isDetectingNetwork.value) {
			// 如果正在检测，返回当前值
			return network.value;
		}
		
		isDetectingNetwork.value = true;
		
		try {
			// 方法1: 尝试从钱包对象获取网络类型
			if (window.Turing) {
				const wallet = window.Turing as any;
				
				// 检查是否有 network 属性
				if (wallet.network !== undefined) {
					const walletNetwork = wallet.network;
					if (walletNetwork === 'testnet' || walletNetwork === 'mainnet') {
						const detected = walletNetwork === 'testnet' ? 'testnet' : undefined;
						network.value = detected;
						isDetectingNetwork.value = false;
						return detected;
					}
				}
				
				// 检查是否有 getNetwork 方法
				if (typeof wallet.getNetwork === 'function') {
					try {
						const walletNetwork = await wallet.getNetwork();
						if (walletNetwork === 'testnet' || walletNetwork === 'mainnet') {
							const detected = walletNetwork === 'testnet' ? 'testnet' : undefined;
							network.value = detected;
							isDetectingNetwork.value = false;
							return detected;
						}
					} catch (e) {
						console.warn('调用钱包 getNetwork 方法失败:', e);
					}
				}
				
				// 方法2: 如果有地址，通过实际调用 API 来检测网络
				// 先尝试测试网 API，如果成功则使用测试网；否则尝试主网
				if (walletInfo.curAddress) {
					try {
						// 尝试调用测试网的区块高度 API
						const testnetController = new AbortController();
						const testnetTimeout = setTimeout(() => testnetController.abort(), 3000);
						
						try {
							const testnetResponse = await fetch('https://api.tbcdev.org/api/tbc/block/headers?limit=1', {
								method: 'GET',
								signal: testnetController.signal,
							});
							clearTimeout(testnetTimeout);
							
							if (testnetResponse.ok) {
								const data = await testnetResponse.json();
								if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
									// 测试网 API 响应成功，使用测试网
									network.value = 'testnet';
									isDetectingNetwork.value = false;
									console.log('✅ 检测到网络类型: testnet (通过 API 检测)');
									return 'testnet';
								}
							}
						} catch (e) {
							clearTimeout(testnetTimeout);
							// 测试网 API 调用失败，继续尝试主网
						}
						
						// 尝试调用主网的区块高度 API
						const mainnetController = new AbortController();
						const mainnetTimeout = setTimeout(() => mainnetController.abort(), 3000);
						
						try {
							const mainnetResponse = await fetch('https://api.turingbitchain.io/api/tbc/block/headers?limit=1', {
								method: 'GET',
								signal: mainnetController.signal,
							});
							clearTimeout(mainnetTimeout);
							
							if (mainnetResponse.ok) {
								const data = await mainnetResponse.json();
								if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
									// 主网 API 响应成功，使用主网
									network.value = undefined; // undefined 表示主网
									isDetectingNetwork.value = false;
									console.log('✅ 检测到网络类型: mainnet (通过 API 检测)');
									return undefined;
								}
							}
						} catch (e) {
							clearTimeout(mainnetTimeout);
							// 主网 API 也调用失败
						}
						
						// 如果两个 API 都失败，使用环境变量或默认主网
						console.warn('⚠️ 无法通过 API 检测网络类型，使用默认值');
						network.value = defaultNetwork;
						isDetectingNetwork.value = false;
						return defaultNetwork;
					} catch (e) {
						// 检测过程出错
						console.warn('⚠️ 网络检测过程出错:', e);
						network.value = defaultNetwork;
						isDetectingNetwork.value = false;
						return defaultNetwork;
					}
				}
			}
			// 如果无法检测，使用环境变量作为后备
			network.value = defaultNetwork;
			isDetectingNetwork.value = false;
			return defaultNetwork;
		} catch (error) {
			console.warn('网络类型检测失败，使用默认值:', error);
			network.value = defaultNetwork;
			isDetectingNetwork.value = false;
			return defaultNetwork;
		}
	};

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

			// 检测网络类型（在获取余额和高度之前）
			await detectNetwork();

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
		try {
			const currentNetwork = network.value;
			const tbc = await API.getTBCbalance(walletInfo.curAddress, currentNetwork);
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
		try {
			const currentNetwork = network.value;
			const res = await API.fetchBlockHeaders(currentNetwork);
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
			if (isConnected.value && currentAddress && (now - lastCheckTime) < CHECK_INTERVAL) {
				return true;
			}
			
			lastCheckTime = now;
			
			// 获取地址
			const { tbcAddress } = await window.Turing.getAddress();

			// 情况1: 有地址 && 有缓存 && 地址匹配 && 未连接 -> 恢复连接
			if (tbcAddress && cachedAddress && cachedAddress === tbcAddress && !isConnected.value) {
				isLoadingBalance.value = true;
				isLoadingHeight.value = true;
				walletInfo.tbcBalance = null;
				walletInfo.curBlockHeight = null;
				walletInfo.curAddress = tbcAddress;
				isConnected.value = true;
				
				// 检测网络类型
				await detectNetwork();
				
				getBalance();
				getBlockHeight();
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
				
				// 检测网络类型
				await detectNetwork();
				
				getBalance();
				getBlockHeight();
			}
			// 情况3: 地址相同且已连接 -> 无需操作，直接返回
			else if (tbcAddress && tbcAddress === currentAddress && isConnected.value) {
				// 地址没有变化，无需更新状态或重新获取数据
				return true;
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
		network: computed(() => network.value), // 暴露响应式的网络类型
		getAddress,
		getBalance,
		getBlockHeight,
		getWalletInfo,
		disconnect,
		checkAccountChange,
		detectNetwork, // 暴露网络检测方法
	};
});
