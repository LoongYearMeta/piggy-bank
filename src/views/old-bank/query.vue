<template>
	<div class="page-container">
		<!-- 顶部导航 -->
		<header class="page-header">
			<router-link to="/" class="lang-btn">
				{{ t('back') }}
			</router-link>
			<h1 class="page-title">{{ t('details_title') }}</h1>
			<div class="placeholder" style="display: flex; gap: 10px; align-items: center">
				<button type="button" class="lang-btn" @click="toggleLocale">
					<span class="lang-text">{{ locale === 'zh' ? '中文' : 'English' }}</span>
					<span class="lang-dot" />
				</button>
			</div>
		</header>
		<!-- 钱包信息区域 -->
		<WalletInfo ref="walletInfoRef" />

		<!-- 加载占位 -->
		<div v-if="isLoading" class="loading-state">
			<div class="spinner"></div>
			<div class="loading-text">{{ t('loading') }}</div>
		</div>

		<!-- 资产统计概览 -->
		<Transition name="content-fade">
			<div v-if="!isLoading" class="stats-section">
				<div class="stat-card frozen">
					<div class="stat-value">{{ frozenTotal }}</div>
					<div class="stat-label">{{ t('stats_frozen_total') }}</div>
				</div>
				<div class="stat-card unfrozen">
					<div class="stat-value">{{ unfrozenTotal }}</div>
					<div class="stat-label">{{ t('stats_unfrozen_total') }}</div>
				</div>
			</div>
		</Transition>

		<!-- 可解冻资产列表 -->
		<Transition name="content-fade">
			<div v-if="!isLoading" class="unfrozen-section">
				<h2 class="section-title">{{ t('list_unfrozen_title') }}</h2>
				<p class="section-description">{{ t('tip_storage_term') }}</p>
				<div v-if="unfrozenAssets.length === 0" class="empty-state">
					<!-- <div class="empty-icon">🔒</div> -->
					<img src="../assets/empty.svg" class="empty-icon" />
					<p>{{ t('list_unfrozen_empty') }}</p>
				</div>

				<div v-else class="assets-list scrollbar--blue">
					<div
						v-for="asset in unfrozenAssets"
						:key="asset.txId + '-' + asset.outputIndex"
						class="asset-card unfrozen-card"
					>
						<div class="asset-header">
							<div class="asset-amount">
								{{ (asset.satoshis / 1000000).toFixed(2) }} {{ t('amount_tbc') }}
							</div>
							<button @click="unfreezeAsset(asset)" class="unfreeze-btn" :disabled="isUnfreezing">
								{{ isUnfreezing ? t('extracting') : t('withdraw') }}
							</button>
						</div>
						<div class="asset-info">
							<div class="info-item">
								<span class="info-label">{{ t('info_storage_term') }}:</span>
								<span class="info-value">{{
									asset.lockTime ? blockHeightToDate(asset.lockTime) : '解码失败'
								}}</span>
							</div>
							<div class="info-item">
								<span class="info-label">{{ t('info_block_height') }}:</span>
								<span class="info-value">{{ asset.lockTime || '解码失败' }}</span>
							</div>
							<div v-if="asset.decodeError" class="info-item error">
								<span class="info-label">{{ t('decode_error') }}:</span>
								<span class="info-value">{{ asset.decodeError }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>

		<!-- 已冻结资产列表 -->
		<Transition name="content-fade">
			<div v-if="!isLoading" class="frozen-section">
				<h2 class="section-title">{{ t('list_frozen_title') }}</h2>
				<p class="section-description">{{ t('tip_storage_term') }}</p>
				<div v-if="frozenAssets.length === 0" class="empty-state">
					<img src="../assets/empty.svg" class="empty-icon" />
					<p>{{ t('list_frozen_empty') }}</p>
				</div>

				<div v-else class="assets-list scrollbar--blue">
					<div
						v-for="asset in frozenAssets"
						:key="asset.txId + '-' + asset.outputIndex"
						class="asset-card frozen-card"
					>
						<div class="asset-header">
							<div class="asset-amount">{{ (asset.satoshis / 1000000).toFixed(2) }} TBC</div>
							<div class="status-badge frozen">{{ t('not_matured') }}</div>
						</div>
						<div class="asset-info">
							<div class="info-item">
								<span class="info-label">{{ t('info_storage_term') }}:</span>
								<span class="info-value">{{
									asset.lockTime ? blockHeightToDate(asset.lockTime) : '解码失败'
								}}</span>
							</div>
							<div class="info-item">
								<span class="info-label">{{ t('info_block_height') }}:</span>
								<span class="info-value">{{ asset.lockTime || '解码失败' }}</span>
							</div>
							<div v-if="asset.decodeError" class="info-item error">
								<span class="info-label">{{ t('decode_error') }}:</span>
								<span class="info-value">{{ asset.decodeError }}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</Transition>

		<!-- 全局提示，与首页保持一致（使用全局样式 .toast-success/.toast-error） -->
		<Transition name="toast-success-fade">
			<div class="toast-success" v-if="successMessage">{{ successMessage }}</div>
		</Transition>
		<Transition name="toast-error-fade">
			<div class="toast-error" v-if="errorMessage">{{ errorMessage }}</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import WalletInfo from '../components/wallet-info.vue';
import { ref, onMounted, computed, watch } from 'vue';
import { API } from 'tbc-contract';
// @ts-ignore
import piggyBank from 'tbc-contract/lib/contract/piggyBank.js';
import * as tbc from 'tbc-lib-js';
import { t, locale as localeRef, setLocale } from '../../i18n';
import { useWalletStore } from '../../stores/wallet';
import { useBodyClass } from '@/utils/useBodyClass';

// WalletInfo 组件引用
const walletInfoRef = ref<InstanceType<typeof WalletInfo>>();

// 使用 Pinia store
const walletStore = useWalletStore();
const { walletInfo, getWalletInfo, getBalance } = walletStore;

// 为了保持向后兼容，创建别名
const curAddress = computed(() => walletInfo.curAddress || '');
const curBlockHeight = computed(() => walletInfo.curBlockHeight || 0);

// 响应式数据
const network = import.meta.env.VITE_NETWORK || undefined; // 网络环境
const frozenAssets = ref<any[]>([]); // 已冻结资产
const unfrozenAssets = ref<any[]>([]); // 可解冻资产
const frozenTotal = ref(0); // 已冻结总额
const unfrozenTotal = ref(0); // 可解冻总额

// 错误和成功消息使用类型键，通过计算属性动态翻译
const errorMessageType = ref('');
const errorMessage = computed(() => (errorMessageType.value ? t(errorMessageType.value) : ''));

const successMessageType = ref('');
const successMessage = computed(() =>
	successMessageType.value ? t(successMessageType.value) : '',
);

const isUnfreezing = ref(false); // 是否正在解冻
const isLoading = ref(true); // 是否在加载数据
const locale = localeRef;

useBodyClass('old-bank-body');

// 解码锁定时间-piggbank中的解码函数会报错
const decodeLockTime = (lockTimeChunk: any): number => {
	try {
		// 直接使用 Uint8Array 来解析字节数据
		const bytes = new Uint8Array(lockTimeChunk);
		// 检查是否有足够的字节
		if (bytes.length < 4) {
			throw new Error('Insufficient bytes for lockTime');
		}
		// 小端序解析 32 位整数
		return (
			(bytes[0] || 0) | ((bytes[1] || 0) << 8) | ((bytes[2] || 0) << 16) | ((bytes[3] || 0) << 24)
		);
	} catch (error) {
		console.error('读取锁定时间失败:', error);
		// 如果解析失败，返回 0
		return 0;
	}
};

// 将区块高度转换为日期
const blockHeightToDate = (blockHeight: number): string => {
	if (!blockHeight || blockHeight <= 0) return '无效区块高度';
	try {
		// 获取当前区块高度和当前时间
		const currentBlockHeight = curBlockHeight.value;
		const currentTime = new Date();
		// 如果目标区块高度小于等于当前区块高度，说明已到期
		if (blockHeight <= currentBlockHeight) {
			return t('already_matured');
		}
		// 计算区块高度差值
		const blockDifference = blockHeight - currentBlockHeight;
		// 每个区块间隔10分钟
		const blockTimeMinutes = 10;
		// 计算时间差（毫秒）
		const timeDifferenceMs = blockDifference * blockTimeMinutes * 60 * 1000;
		// 计算目标时间 = 当前时间 + 时间差
		const targetTime = new Date(currentTime.getTime() + timeDifferenceMs);
		// 设置为当天的0点
		const targetDate = new Date(
			targetTime.getFullYear(),
			targetTime.getMonth(),
			targetTime.getDate(),
		);
		// 格式化日期
		const year = targetDate.getFullYear();
		const month = String(targetDate.getMonth() + 1).padStart(2, '0');
		const day = String(targetDate.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	} catch (error) {
		console.error('区块高度转换日期失败:', error);
		return '转换失败';
	}
};

// 定时器引用，用于清除之前的定时器
let successMessageTimer: NodeJS.Timeout | null = null;
let errorMessageTimer: NodeJS.Timeout | null = null;

// 显示成功提示（统一3秒后自动隐藏）
const showSuccessMessage = (messageKey: string) => {
	// 清除之前的定时器（如果存在）
	if (successMessageTimer) {
		clearTimeout(successMessageTimer);
		successMessageTimer = null;
	}
	// 清除错误消息（避免同时显示）
	errorMessageType.value = '';
	if (errorMessageTimer) {
		clearTimeout(errorMessageTimer);
		errorMessageTimer = null;
	}
	// 设置成功消息
	successMessageType.value = messageKey;
	// 3秒后自动隐藏
	successMessageTimer = setTimeout(() => {
		successMessageType.value = '';
		successMessageTimer = null;
	}, 3000);
};

// 显示错误提示（统一5秒后自动隐藏）
const showErrorMessage = (messageKey: string) => {
	// 清除之前的定时器（如果存在）
	if (errorMessageTimer) {
		clearTimeout(errorMessageTimer);
		errorMessageTimer = null;
	}
	// 清除成功消息（避免同时显示）
	successMessageType.value = '';
	if (successMessageTimer) {
		clearTimeout(successMessageTimer);
		successMessageTimer = null;
	}
	// 设置错误消息
	errorMessageType.value = messageKey;
	// 5秒后自动隐藏
	errorMessageTimer = setTimeout(() => {
		errorMessageType.value = '';
		errorMessageTimer = null;
	}, 5000);
};

// 使用 watch 监听钱包地址变化，自动加载资产数据
const hasLoadedAssets = ref(false);

// 先声明 loadAssets 函数
const loadAssets = async () => {
	const address = curAddress.value;
	if (!address) {
		isLoading.value = false;
		return;
	}
	try {
		isLoading.value = true;
		errorMessageType.value = '';
		// 获取已冻结的TBC余额
		frozenTotal.value = await API.fetchFrozenTBCBalance(address, network);
		// console.log('已冻结资产总额:', frozenTotal)
		// 获取已冻结的UTXO列表
		const frozenList = await API.fetchFrozenUTXOList(address, network);
		// console.log('原始已冻结资产:', frozenList);
		// 解码锁定时间并构建新的资产数据结构
		const processedFrozenAssets: any[] = [];
		if (frozenList && frozenList.length > 0) {
			frozenList.forEach((utxo) => {
				try {
					// 校验脚本长度
					if (!utxo.script || utxo.script.length !== 106) {
						throw new Error('Invalid Piggy Bank script');
					}
					// 解码锁定时间
					const script = tbc.Script.fromString(utxo.script);
					const lockTimeChunk = script.chunks![script.chunks!.length - 8]!.buf;
					if (!lockTimeChunk) {
						throw new Error('Lock time chunk not found');
					}
					// 校验chunk长度（确保能正确读取32位整数）
					if (lockTimeChunk.length !== 4) {
						throw new Error(
							`Lock time chunk length invalid (expected 4, got ${lockTimeChunk.length})`,
						);
					}
					// 解码锁定时间
					const lockTime = decodeLockTime(lockTimeChunk);
					// console.log(`资产 ${index} 锁定时间:`, lockTime)
					// 创建包含解码后lockTime的资产对象
					const processedAsset = {
						...utxo, // 保留原始UTXO数据
						lockTime: lockTime, // 添加解码后的锁定时间
						isUnfrozen: lockTime <= curBlockHeight.value, // 判断是否可解冻
					};
					processedFrozenAssets.push(processedAsset);
				} catch (error) {
					// console.error(`解码资产 ${index} 锁定时间失败:`, error)
					// 即使解码失败，也保留原始数据，但标记为错误状态
					processedFrozenAssets.push({
						...utxo,
						lockTime: 0,
						isUnfrozen: false,
						decodeError: error instanceof Error ? error.message : String(error),
					});
				}
			});
		}
		// 更新已冻结资产列表
		frozenAssets.value = processedFrozenAssets;
		// 分离可解冻和已冻结的资产
		unfrozenAssets.value = processedFrozenAssets.filter((asset) => asset.isUnfrozen);
		frozenAssets.value = processedFrozenAssets.filter((asset) => !asset.isUnfrozen);
		// 计算总额
		frozenTotal.value =
			frozenAssets.value.reduce((sum, asset) => sum + asset.satoshis, 0) / 1000000;
		unfrozenTotal.value =
			unfrozenAssets.value.reduce((sum, asset) => sum + asset.satoshis, 0) / 1000000;
		// console.log('已冻结资产:', frozenAssets.value)
		// console.log('可解冻资产:', unfrozenAssets.value)
	} catch (error) {
		// console.error('加载资产失败:', error)
		// alert(error);
		showErrorMessage('err_load_assets');
	} finally {
		isLoading.value = false;
	}
};

// 使用 watch 监听钱包地址变化，自动加载资产数据
watch(
	() => curAddress.value,
	async (newAddress) => {
		// 只在地址首次加载时加载资产数据，避免重复加载
		if (newAddress && !hasLoadedAssets.value) {
			hasLoadedAssets.value = true;
			await loadAssets();
		}
	},
	{ immediate: true },
);

// 页面挂载时的初始化
onMounted(async () => {
	// 如果没有地址，设置加载状态为 false
	if (!walletInfo.curAddress) {
		isLoading.value = false;
	}
});

function toggleLocale() {
	setLocale(locale.value === 'zh' ? 'en' : 'zh');
}

// 构造解冻资产交易-【冻结---存入】-【解冻---提取】
const unfreezeAsset = async (asset: any) => {
	// console.log('asset:', asset)
	if (isUnfreezing.value) return;
	try {
		isUnfreezing.value = true;
		// 清除之前的错误消息
		errorMessageType.value = '';
		successMessageType.value = '';
		const address = curAddress.value;
		if (!address) {
			throw new Error('钱包地址未获取');
		}
		// 确保 utxo 是列表【数组】
		const utxos = Array.isArray(asset) ? asset : [asset];
		// console.log('utxos:', utxos)
		// 获取公钥
		const { tbcPubKey } = await window.Turing.getPubKey();
		const publicKey = new tbc.PublicKey(tbcPubKey);
		// 准备签名参数 - 修正数组初始化
		const utxos_satoshis: number[][] = [];
		const script_pubkeys: string[][] = [];
		const txraws: string[] = []; // 未签名交易
		// 仅传递必要字段，剥离 lockTime / isUnfrozen 等展示字段
		const sanitizedUtxos = utxos.map((u: any) => ({
			txId: u.txId,
			outputIndex: u.outputIndex,
			satoshis: u.satoshis,
			script: u.script,
		}));

		// 构造解冻交易-未签名交易
		const unfreezeTx = await piggyBank.unfreezeTBC(address, sanitizedUtxos, network);
		const tx = new tbc.Transaction(unfreezeTx);
		// console.log('解冻交易:', tx)
		for (let i = 0; i < sanitizedUtxos.length; i++) {
			tx.setInputSequence(i, 4294967294);
		}
		const txRaw = tx.uncheckedSerialize();

		txraws.push(txRaw); // 序列化未签名交易

		// 准备签名数据
		const satoshis: number[] = [];
		const scripts: string[] = [];
		for (let i = 0; i < sanitizedUtxos.length; i++) {
			const u = sanitizedUtxos[i] as any;
			satoshis.push(u?.satoshis || 0);
			scripts.push(u?.script || '');
		}
		utxos_satoshis.push(satoshis);
		script_pubkeys.push(scripts);

		// 对交易进行签名（兼容新旧钱包返回：优先 sigs，缺失则尝试 sig）
		const signRes: any = await window.Turing.signTransaction({
			txraws,
			utxos_satoshis,
			script_pubkeys,
		});
		// console.log('签名结果:', signRes)
		let sigInput: string[] = [];
		try {
			if (signRes && signRes.sigs) {
				const sigs = signRes.sigs;
				// sigs 是一个二维数组，每个交易对应一个签名数组
				sigInput = Array.isArray(sigs[0]) ? sigs[0] : sigs;
			} else if (signRes && signRes.sig) {
				const sig = signRes.sig;
				sigInput = Array.isArray(sig) ? sig : [sig];
			}
			// console.log('解析后的签名:', sigInput)
			if (!sigInput || sigInput.length === 0) {
				throw new Error('签名数据为空');
			}
			// 检查签名数量是否与UTXO数量匹配
			if (sigInput.length !== sanitizedUtxos.length) {
				throw new Error(`签名数量不匹配：期望${sanitizedUtxos.length}个，实际${sigInput.length}个`);
			}
		} catch (e) {
			throw new Error(`交易签名失败：${e instanceof Error ? e.message : '未获取到有效签名'}`);
		}
		console.log('sigInput:', sigInput);
		// 将签名添加到交易中，设置UTXO的解锁脚本
		for (let i = 0; i < sanitizedUtxos.length; i++) {
			const sig = sigInput[i];
			if (!sig) throw new Error(`交易签名失败：缺少第${i}个输入的签名`);
			tx.setInputScript({ inputIndex: i }, () => {
				const sig_length = (sig.length / 2).toString(16);
				const publicKey_length = (publicKey.toBuffer().toString('hex').length / 2).toString(16);
				return new tbc.Script(sig_length + sig + publicKey_length + publicKey.toString());
			});
		}
		// 广播交易
		const res = await API.broadcastTXraw(tx.uncheckedSerialize(), network);
		if (!res) throw new Error('交易广播失败');
		// 重新加载资产数据并刷新钱包信息
		await loadAssets();
		// 刷新钱包余额
		await getBalance();
		await getWalletInfo();
		// 显示成功提示
		showSuccessMessage('withdraw_success');
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
		console.error('提取失败:', errMsg);
		showErrorMessage('withdraw_failed');
	} finally {
		isUnfreezing.value = false;
	}
};
</script>

<style>
@import '../assets/css/old.css';

/* 定位在旧版页面的专属 body 样式，避免污染其他路由 */
.old-bank-body {
	background-color: var(--color-bg-light);
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	background: linear-gradient(270deg, #eef5ff 0%, #f1eef9 100%);
	/* PC端默认 padding */
	padding: 2rem;
	/* 隐藏滚动条 */
	scrollbar-width: none; /* Firefox */
	-ms-overflow-style: none; /* IE 和 Edge */
}

/* 隐藏滚动条 - Webkit 浏览器 (Chrome, Safari, Edge) */
.old-bank-body::-webkit-scrollbar {
	display: none;
}

/* 移动端优化 */
@media (max-width: 768px) {
	.old-bank-body {
		padding: 2rem;
	}
}

@media (max-width: 480px) {
	.old-bank-body {
		padding: 2rem;
	}
}
</style>
<style scoped>
/* Base reset 已移到全局 src/style.css */

/* 全局容器样式 */
.page-container {
	max-width: 900px;
	margin: 0 auto;
	box-sizing: border-box;
}

/* 顶部导航 */
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 35px; /* 加大底部外边距 */
	padding: 25px 0; /* 加大上下内边距 */
}

.title {
	color: var(--color-text-primary);
	font-size: 28px;
	font-weight: bold;
	margin: 0;
	word-break: break-word;
}

.back-btn {
	appearance: none;
	-webkit-appearance: none;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-xs);
	padding: 8px 12px;
	border-radius: var(--radius-lg);
	border: 1px solid #e5e7eb;
	background: #ffffff;
	color: var(--color-text-primary);
	font-size: 14px;
	text-decoration: none;
	transition: all 0.25s ease;
	box-shadow: var(--shadow-sm);
}

.back-btn:hover {
	transform: translateY(-1px);
	box-shadow: var(--shadow-md);
	border-color: var(--color-primary-light);
}

.placeholder {
	width: 80px; /* 加大占位宽度 */
}

.lang-select {
	height: 32px;
	border-radius: 8px;
	border: 1px solid #e5e7eb;
	background: #ffffff;
	color: #3d3c63;
	font-size: 14px;
	padding: 0 8px;
}

/* 语言切换按钮已移到全局 src/style.css */

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

/* 表单基础样式已移到全局 src/style.css */

/* 查询页面特定的输入框样式 */
.form-group input {
	width: 100%;
	padding: 15px;
	border: 1px solid #eee;
	border-radius: var(--radius-sm);
	background: #ffffff;
	font-size: 18px;
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

/* 资产统计概览 */
.stats-section {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 25px; /* 加大卡片间距 */
	margin-bottom: 35px; /* 加大底部外边距 */
}

.stat-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: var(--radius-md);
	padding: var(--spacing-lg);
	text-align: center;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
	box-shadow: var(--shadow-md);
}

.stat-card.frozen {
	border-left: 4px solid #ff6b6b;
}

.stat-card.unfrozen {
	border-left: 4px solid var(--color-success);
}

.stat-value {
	color: var(--color-text-primary);
	font-size: 24px;
	font-weight: bold;
	margin-bottom: var(--spacing-xs);
}

.stat-label {
	color: var(--color-text-secondary);
	font-size: 14px;
}

/* 资产列表区域 */
.unfrozen-section,
.frozen-section {
	background: rgba(255, 255, 255, 0.95);
	border-radius: var(--radius-md);
	padding: var(--spacing-lg);
	margin-bottom: var(--spacing-lg);
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
	box-shadow: var(--shadow-md);
}

.section-title {
	color: var(--color-text-primary);
	margin-bottom: 10px;
	font-size: 20px;
	font-weight: bold;
}

.section-description {
	color: var(--color-primary);
	margin-bottom: 15px;
	font-size: 14px;
	font-weight: 600;
	background: #f0f9ff;
	padding: 8px 12px;
	border-radius: 6px;
	border-left: 3px solid var(--color-primary);
	display: inline-block;
}

.empty-state {
	text-align: center;
	padding: 50px 20px; /* 加大上下内边距 */
}

.empty-icon {
	font-size: 60px; /* 加大图标尺寸 */
	margin-bottom: 20px; /* 加大底部外边距 */
}

.empty-state p {
	color: var(--color-text-secondary);
	margin-bottom: var(--spacing-lg);
	font-size: 16px;
}

/* 资产卡片 */
.assets-list {
	max-height: 550px; /* 加大滚动区域高度 */
	overflow-y: auto;
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
	gap: 20px; /* 加大卡片间距 */
	/* 自定义滚动条（不受浏览器主题影响） */
	scrollbar-width: thin; /* Firefox */
	scrollbar-color: #a8ccff #ffffff; /* thumb track */
	overscroll-behavior: contain;
}

.asset-card {
	background: rgba(255, 255, 255, 0.8);
	border-radius: 12px;
	padding: 25px; /* 加大内边距 */
	border: 1px solid #eee;
	transition: all 0.3s ease;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.asset-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.unfrozen-card {
	border-left: 4px solid #51cf66;
}

.frozen-card {
	border-left: 4px solid #ff6b6b;
}

.asset-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px; /* 加大底部外边距 */
	min-width: 0; /* 允许子项收缩 */
}

.asset-amount {
	color: #3d3c63;
	font-size: 20px; /* 加大金额字体 */
	font-weight: bold;
}

.unfreeze-btn {
	background: var(--color-success);
	color: white;
	border: none;
	padding: 12px 24px;
	border-radius: var(--radius-lg);
	font-size: 15px;
	font-weight: bold;
	cursor: pointer;
	transition: all 0.3s ease;
	min-width: 90px;
}

.unfreeze-btn:focus,
.unfreeze-btn:active {
	outline: none !important;
}

.unfreeze-btn:hover:not(:disabled) {
	background: var(--color-success-dark);
	transform: translateY(-1px);
}

.unfreeze-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.status-badge {
	padding: 8px 18px; /* 加大徽章内边距 */
	border-radius: 12px;
	font-size: 13px; /* 加大徽章字体 */
	font-weight: bold;
}

.status-badge.frozen {
	background: #ff6b6b;
	color: white;
}

.asset-info {
	display: flex;
	flex-direction: column;
	gap: 10px; /* 加大信息项间距 */
}

.info-item {
	/* 改用两列网格，左标签自适应，右侧可收缩省略 */
	display: grid;
	grid-template-columns: auto 1fr;
	column-gap: 8px;
	align-items: center;
	padding: 8px 0; /* 加大上下内边距 */
	border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.info-item:last-child {
	border-bottom: none;
}

.info-label {
	color: #666;
	font-size: 14px; /* 加大标签字体 */
	font-weight: 500;
}

.info-value {
	color: #3d3c63;
	font-size: 14px; /* 加大数值字体 */
	font-weight: 600;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.info-item.error {
	background: rgba(255, 77, 79, 0.1);
	border-radius: 4px;
	padding: 8px;
	margin-top: 8px;
}

.info-item.error .info-label {
	color: var(--color-error);
}

.info-item.error .info-value {
	color: var(--color-error);
}

/* 成功/错误提示和动画已移到全局 src/style.css */

/* 滚动条样式 */
.assets-list::-webkit-scrollbar {
	width: 8px; /* 加大滚动条宽度 */
}

.assets-list::-webkit-scrollbar-track {
	background: rgba(0, 0, 0, 0.1);
	border-radius: 4px;
}

.assets-list::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.3);
	border-radius: 4px;
}

.assets-list::-webkit-scrollbar-thumb:hover {
	background: rgba(0, 0, 0, 0.5);
}

/* 加载样式 */
.loading-state {
	text-align: center;
	padding: 20px;
	color: #666;
}

.loading-text {
	margin-bottom: 10px;
}

/* 移动端响应式适配 */
@media (max-width: 768px) {
	.query-container {
		width: 95%;
		max-width: 100%;
	}
	.stats-section {
		grid-template-columns: 1fr;
		gap: 20px; /* 调整移动端间距 */
	}
	.assets-list {
		grid-template-columns: 1fr;
		max-height: 500px; /* 调整移动端滚动高度 */
	}
	.asset-header {
		flex-direction: column;
		align-items: flex-start;
		gap: 15px; /* 调整移动端间距 */
	}
	.unfreeze-btn {
		align-self: flex-end;
		min-width: 120px; /* 调整移动端按钮宽度 */
	}
}

@media (max-width: 480px) {
	.asset-card {
		padding: 20px; /* 调整移动端卡片内边距 */
	}
	.asset-amount {
		font-size: clamp(16px, 4.2vw, 18px); /* 调整移动端金额字体 */
	}
	.unfreeze-btn {
		padding: 8px 16px; /* 移动端缩小按钮尺寸 */
		font-size: clamp(12px, 3.6vw, 14px); /* 调整移动端按钮字体 */
		white-space: nowrap;
	}
	.section-title,
	.section-description,
	.stat-label {
		font-size: clamp(12px, 3.6vw, 14px);
	}
	.page-title,
	.title {
		white-space: normal;
		word-break: break-word;
	}
}
</style>
