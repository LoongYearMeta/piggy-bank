import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
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

	// 网络环境
	const network = import.meta.env.VITE_NETWORK || undefined;

	// 获取钱包地址
	const getAddress = async () => {
		if (!window.Turing) {
			alert(t('warning_wallet_not_installed'));
			return;
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
		} catch (error) {
			console.error('获取钱包地址失败:', error);
			isConnected.value = false;
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

	// 获取钱包信息
	const getWalletInfo = async () => {
		await getAddress();
		if (walletInfo.curAddress) {
			await getBalance();
			await getBlockHeight();
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

	// 检查钱包账户是否变更
	const checkAccountChange = async (): Promise<boolean> => {
		if (!window.Turing) {
			return false;
		}

		try {
			// 直接获取地址（不触发 connect，避免弹窗）
			const { tbcAddress } = await window.Turing.getAddress();
			const cachedAddress = getLocalStorage('tbcAddress');

			// 情况1: 有缓存地址，且当前地址与缓存一致 - 自动恢复连接
			if (cachedAddress && cachedAddress === tbcAddress) {
				if (!isConnected.value || walletInfo.curAddress !== tbcAddress) {
					console.log('自动恢复连接状态:', tbcAddress);
					walletInfo.curAddress = tbcAddress;
					isConnected.value = true;
					// 更新余额和区块高度
					await getBalance();
					await getBlockHeight();
				}
				return false; // 账户未变更
			}

			// 情况2: 有缓存地址，但当前地址与缓存不一致 - 账户已切换
			if (cachedAddress && tbcAddress && cachedAddress !== tbcAddress) {
				console.warn('检测到账户切换: ', cachedAddress, '->', tbcAddress);
				await disconnect();
				return true; // 账户已变更
			}

			// 情况3: 没有缓存地址 - 未连接状态
			if (!cachedAddress) {
				if (isConnected.value) {
					await disconnect();
				}
				return false;
			}

			return false;
		} catch (error) {
			console.error('检查账户变更失败:', error);
			// 发生错误时，如果有连接状态，保持它；如果没有，就断开
			if (!getLocalStorage('tbcAddress') && isConnected.value) {
				await disconnect();
			}
			return false;
		}
	};

	return {
		walletInfo,
		isConnected,
		getAddress,
		getBalance,
		getBlockHeight,
		getWalletInfo,
		disconnect,
		checkAccountChange,
	};
});
