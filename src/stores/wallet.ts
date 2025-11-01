import { defineStore } from 'pinia';
import { reactive, ref, computed } from 'vue';
import { API } from 'tbc-contract';
import { t } from '../i18n';
import { getLocalStorage, setLocalStorage, removeLocalStorage } from '../utils/storage';

export const useWalletStore = defineStore('wallet', () => {
	// 状态
	const walletInfo = reactive({
		curAddress: '', // 钱包地址
		tbcBalance: 0, // 钱包余额
		curBlockHeight: 0, // 当前区块高度
	});

	// 连接状态
	const isConnected = ref(false);

	// 钱包是否准备好（是否安装）
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

			// 检查是否与缓存地址不同（账户切换）
			const cachedAddress = getLocalStorage('tbcAddress');
			if (cachedAddress && cachedAddress !== tbcAddress) {
				console.log('检测到新账户，更新缓存');
			}

			walletInfo.curAddress = tbcAddress;
			isConnected.value = true;

			// 保存地址到 localStorage（7天过期）
			setLocalStorage('tbcAddress', tbcAddress, 1000 * 60 * 60 * 24 * 7);

			// 获取到地址后，自动获取余额和区块高度
			if (tbcAddress) {
				await getBalance();
				await getBlockHeight();
			}

			return true;
		} catch (error) {
			console.error('获取钱包地址失败:', error);
			isConnected.value = false;
			return false;
		}
	};

	// 获取钱包余额
	const getBalance = async () => {
		try {
			const tbc = await API.getTBCbalance(walletInfo.curAddress, network);
			walletInfo.tbcBalance = tbc / 1000000;
		} catch (error) {
			console.error('获取钱包余额失败:', error);
		}
	};

	// 获取当前区块高度
	const getBlockHeight = async () => {
		try {
			const res = await API.fetchBlockHeaders(network);
			walletInfo.curBlockHeight = res[0]?.height || 0;
		} catch (error) {
			console.error('获取当前区块高度失败:', error);
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
			console.log('[checkAccountChange] 钱包未安装');
			return false;
		}

		try {
			// 直接获取地址（不触发 connect，避免弹窗）
			const { tbcAddress } = await window.Turing.getAddress();
			const cachedAddress = getLocalStorage('tbcAddress');

			console.log('[checkAccountChange] 当前地址:', tbcAddress);
			console.log('[checkAccountChange] 缓存地址:', cachedAddress);

			// 如果钱包能获取到地址，说明用户已经授权过
			if (tbcAddress) {
				// 情况1: 有缓存地址，且当前地址与缓存一致 - 保持连接
				if (cachedAddress && cachedAddress === tbcAddress) {
					if (!isConnected.value || walletInfo.curAddress !== tbcAddress) {
						console.log('[checkAccountChange] 自动恢复连接状态:', tbcAddress);
						walletInfo.curAddress = tbcAddress;
						isConnected.value = true;
						// 更新余额和区块高度
						await getBalance();
						await getBlockHeight();
					}
					return false; // 账户未变更
				}

				// 情况2: 有缓存地址，但当前地址与缓存不一致 - 账户已切换，自动切换到新账户
				if (cachedAddress && cachedAddress !== tbcAddress) {
					console.log(
						'[checkAccountChange] 检测到账户切换，自动连接新账户: ',
						cachedAddress,
						'->',
						tbcAddress,
					);
					// 更新为新账户
					walletInfo.curAddress = tbcAddress;
					isConnected.value = true;
					// 保存新地址到缓存（7天过期）
					setLocalStorage('tbcAddress', tbcAddress, 1000 * 60 * 60 * 24 * 7);
					// 更新余额和区块高度
					await getBalance();
					await getBlockHeight();
					return true; // 账户已变更
				}

				// 情况3: 没有缓存地址，但钱包能返回地址 - 自动连接并保存缓存
				if (!cachedAddress) {
					console.log('[checkAccountChange] 检测到已授权钱包，自动连接:', tbcAddress);
					walletInfo.curAddress = tbcAddress;
					isConnected.value = true;
					// 保存到缓存（7天过期）
					setLocalStorage('tbcAddress', tbcAddress, 1000 * 60 * 60 * 24 * 7);
					// 更新余额和区块高度
					await getBalance();
					await getBlockHeight();
					return false;
				}
			} else {
				// 钱包无法返回地址（未授权或钱包未安装）
				console.log('[checkAccountChange] 钱包无法返回地址，当前连接状态:', isConnected.value);
				if (isConnected.value) {
					await disconnect();
				}
			}

			return false;
		} catch (error: any) {
			// 检测到 Unauthorized 错误，说明钱包未授权，自动调用 connect
			if (error?.message === 'Unauthorized!' || error === 'Unauthorized!') {
				const cachedAddress = getLocalStorage('tbcAddress');
				// 只有在没有缓存时才自动连接（避免频繁弹窗）
				if (!cachedAddress) {
					console.log('[checkAccountChange] 检测到未授权且无缓存，自动发起连接请求');
					// 自动调用 getAddress，它会先调用 connect() 弹窗授权
					await getAddress();
					return false;
				} else {
					// 有缓存但未授权，静默等待（可能钱包扩展被禁用了）
					console.log('[checkAccountChange] 钱包未授权但有缓存，等待用户手动连接');
					return false;
				}
			}

			// 其他错误才记录
			console.error('[checkAccountChange] 检查账户变更失败:', error);
			return false;
		}
	};

	return {
		walletInfo,
		isConnected,
		isReady,
		getAddress,
		getBalance,
		getBlockHeight,
		getWalletInfo,
		disconnect,
		checkAccountChange,
	};
});
