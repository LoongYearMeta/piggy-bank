<template>
	<div class="deposit-wrapper">
		<!-- 加载占位 -->
		<Transition name="fade" mode="out-in">
			<div v-if="isLoading" key="loading" class="loading-state">
				<div class="spinner"></div>
				<div class="loading-text">{{ t('loading') }}</div>
			</div>
			<div v-else key="content" class="content-wrapper">
				<!-- 总揽卡片 -->
				<div class="animate-item animate-delay-1">
					<OverviewCards :cards="overviewCards" />
				</div>
				<!-- 可提取资产和存储中资产 -->
				<div class="animate-item animate-delay-2">
					<div class="detail-sections">
						<div class="detail-section">
							<div class="detail-title">
								<div class="title-header">
									<div class="title-main">
										<img
											src="../../../assets/images/deposit-details-title@2x.png"
											:alt="t('detail_withdrawable_alt')"
										/>
										<span class="title-text">{{ t('detail_withdrawable_title') }}</span>
									</div>
								</div>
								<span class="title-sub">{{ t('tip_storage_term') }}</span>
							</div>
							<TbcCards
								mode="withdrawable"
								:items="withdrawableList"
								:is-unfreezing="isUnfreezing"
								:current-block-height="curBlockHeight"
								:empty-image="withdrawableEmptyImg"
								:empty-text="t('detail_withdrawable_empty')"
								@withdraw="handleWithdraw"
							/>
						</div>
						<div class="detail-section">
							<div class="detail-title">
								<div class="title-header">
									<div class="title-main">
										<img
											src="../../../assets/images/deposit-details-title@2x.png"
											:alt="t('detail_frozen_alt')"
										/>
										<span class="title-text">{{ t('detail_frozen_title') }}</span>
									</div>
									<span class="title-badge">{{ t('detail_frozen_badge') }}</span>
								</div>
								<span class="title-sub">{{ t('tip_storage_term') }}</span>
							</div>
							<TbcCards
								mode="frozen"
								:items="frozenList"
								:current-block-height="curBlockHeight"
								:empty-image="storedEmptyImg"
								:empty-text="t('detail_frozen_empty')"
							/>
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { API } from 'tbc-contract';
// @ts-ignore
import piggyBank from 'tbc-contract/lib/contract/piggyBank.js';
import * as tbc from 'tbc-lib-js';
import { useWalletStore } from '../../../stores/wallet';
import { t } from '../../../i18n';
import OverviewCards from './overview-cards.vue';
import TbcCards from './tbc-cards.vue';
import withdrawableEmptyImg from '../../../assets/images/withdrawable-empty@2x.png';
import storedEmptyImg from '../../../assets/images/stored-empty@2x.png';

// 使用 Pinia store
const walletStore = useWalletStore();
const { walletInfo } = walletStore;

// 为了保持向后兼容，创建别名
const curAddress = computed(() => walletInfo.curAddress || '');
const curBlockHeight = computed(() => walletInfo.curBlockHeight || 0);

// 网络环境
const network = import.meta.env.VITE_NETWORK || undefined;

// 响应式数据
const withdrawableList = ref<any[]>([]); // 可提取资产
const frozenList = ref<any[]>([]); // 存储中资产
const unfrozenTotal = ref(0); // 可提取总额
const frozenTotal = ref(0); // 存储中总额
const isLoading = ref(true);
const isUnfreezing = ref(false);

// 总揽卡片
const overviewCards = computed(() => [
	{ value: `${unfrozenTotal.value.toFixed(2)} TBC`, label: t('detail_withdrawable_total') },
	{ value: `${frozenTotal.value.toFixed(2)} TBC`, label: t('detail_frozen_total') },
]);

// 解码锁定时间
const decodeLockTime = (lockTimeChunk: any): number => {
	try {
		const bytes = new Uint8Array(lockTimeChunk);
		if (bytes.length < 4) {
			throw new Error('Insufficient bytes for lockTime');
		}
		return (
			(bytes[0] || 0) | ((bytes[1] || 0) << 8) | ((bytes[2] || 0) << 16) | ((bytes[3] || 0) << 24)
		);
	} catch (error) {
		console.error('读取锁定时间失败:', error);
		return 0;
	}
};

// 加载资产数据
const loadAssets = async () => {
	const address = curAddress.value;
	if (!address) {
		isLoading.value = false;
		return;
	}
	try {
		isLoading.value = true;
		// 获取已冻结的UTXO列表
		const frozenListData = await API.fetchFrozenUTXOList(address, network);
		// 解码锁定时间并构建新的资产数据结构
		const processedAssets: any[] = [];
		if (frozenListData && frozenListData.length > 0) {
			frozenListData.forEach((utxo) => {
				try {
					if (!utxo.script || utxo.script.length !== 106) {
						throw new Error('Invalid Piggy Bank script');
					}
					const script = tbc.Script.fromString(utxo.script);
					const lockTimeChunk = script.chunks![script.chunks!.length - 8]!.buf;
					if (!lockTimeChunk || lockTimeChunk.length !== 4) {
						throw new Error('Lock time chunk not found or invalid');
					}
					const lockTime = decodeLockTime(lockTimeChunk);
					const processedAsset = {
						...utxo,
						id: `${utxo.txId}-${utxo.outputIndex}`,
						lockTime: lockTime,
						isUnfrozen: lockTime <= curBlockHeight.value,
					};
					processedAssets.push(processedAsset);
				} catch (error) {
					processedAssets.push({
						...utxo,
						id: `${utxo.txId}-${utxo.outputIndex}`,
						lockTime: 0,
						isUnfrozen: false,
						decodeError: error instanceof Error ? error.message : String(error),
					});
				}
			});
		}
		// 分离可提取和存储中的资产
		withdrawableList.value = processedAssets.filter((asset) => asset.isUnfrozen);
		frozenList.value = processedAssets.filter((asset) => !asset.isUnfrozen);
		// 计算总额
		frozenTotal.value = frozenList.value.reduce((sum, asset) => sum + asset.satoshis, 0) / 1000000;
		unfrozenTotal.value =
			withdrawableList.value.reduce((sum, asset) => sum + asset.satoshis, 0) / 1000000;
	} catch (error) {
		console.error('加载资产失败:', error);
	} finally {
		isLoading.value = false;
	}
};

// 提取资产
const handleWithdraw = async (asset: any) => {
	if (isUnfreezing.value) return;
	try {
		isUnfreezing.value = true;
		const address = curAddress.value;
		if (!address) {
			throw new Error(t('err_address_not_found'));
		}
		const utxos = Array.isArray(asset) ? asset : [asset];
		const { tbcPubKey } = await window.Turing.getPubKey();
		const publicKey = new tbc.PublicKey(tbcPubKey);
		const utxos_satoshis: number[][] = [];
		const script_pubkeys: string[][] = [];
		const txraws: string[] = [];
		const sanitizedUtxos = utxos.map((u: any) => ({
			txId: u.txId,
			outputIndex: u.outputIndex,
			satoshis: u.satoshis,
			script: u.script,
		}));

		const unfreezeTx = await piggyBank.unfreezeTBC(address, sanitizedUtxos, network);
		const tx = new tbc.Transaction(unfreezeTx);
		for (let i = 0; i < sanitizedUtxos.length; i++) {
			tx.setInputSequence(i, 4294967294);
		}
		const txRaw = tx.uncheckedSerialize();
		txraws.push(txRaw);

		const satoshis: number[] = [];
		const scripts: string[] = [];
		for (let i = 0; i < sanitizedUtxos.length; i++) {
			const u = sanitizedUtxos[i] as any;
			satoshis.push(u?.satoshis || 0);
			scripts.push(u?.script || '');
		}
		utxos_satoshis.push(satoshis);
		script_pubkeys.push(scripts);

		const signRes: any = await window.Turing.signTransaction({
			txraws,
			utxos_satoshis,
			script_pubkeys,
		});
		let sigInput: string[] = [];
		try {
			if (signRes && signRes.sigs) {
				const sigs = signRes.sigs;
				sigInput = Array.isArray(sigs[0]) ? sigs[0] : sigs;
			} else if (signRes && signRes.sig) {
				const sig = signRes.sig;
				sigInput = Array.isArray(sig) ? sig : [sig];
			}
			if (!sigInput || sigInput.length === 0) {
				throw new Error(t('err_sign_failed'));
			}
			if (sigInput.length !== sanitizedUtxos.length) {
				throw new Error(t('err_sign_count_mismatch').replace('{expected}', String(sanitizedUtxos.length)).replace('{actual}', String(sigInput.length)));
			}
		} catch (e) {
			throw new Error(t('err_sign_failed'));
		}
		for (let i = 0; i < sanitizedUtxos.length; i++) {
			const sig = sigInput[i];
			if (!sig) throw new Error(t('err_sign_missing').replace('{index}', String(i)));
			tx.setInputScript({ inputIndex: i }, () => {
				const sig_length = (sig.length / 2).toString(16);
				const publicKey_length = (publicKey.toBuffer().toString('hex').length / 2).toString(16);
				return new tbc.Script(sig_length + sig + publicKey_length + publicKey.toString());
			});
		}
		const res = await API.broadcastTXraw(tx.uncheckedSerialize(), network);
		if (!res) throw new Error(t('err_broadcast_failed'));
		await loadAssets();
		await walletStore.getBalance();
		await walletStore.getWalletInfo();
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
		console.error('提取失败:', errMsg);
		alert(t('err_withdraw_failed_prefix') + errMsg);
	} finally {
		isUnfreezing.value = false;
	}
};

// 监听地址变化，自动加载资产数据
watch(
	() => curAddress.value,
	async (newAddress) => {
		if (newAddress) {
			await loadAssets();
		} else {
			withdrawableList.value = [];
			frozenList.value = [];
			unfrozenTotal.value = 0;
			frozenTotal.value = 0;
			isLoading.value = false;
		}
	},
	{ immediate: true },
);
</script>

<style scoped lang="less">
/* wrapper */
.deposit-wrapper {
	display: flex;
	flex-direction: column;
	gap: 24px;
	/* PC端：确保内容不超出容器，避免微小滚动 */
	min-height: 0;
	height: 100%;
	/* 允许阴影显示，但保持垂直滚动控制 */
	overflow-y: auto;
	overflow-x: visible;
}

/* 移动端：移除高度限制 */
@media (max-width: 768px) {
	.deposit-wrapper {
		height: auto;
		overflow: visible;
	}
}

.loading-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 60px 20px;
	text-align: center;
}

// loading state
.spinner {
	width: 28px;
	height: 28px;
	border: 3px solid rgba(0, 0, 0, 0.1);
	border-top-color: #ffd28f;
	border-radius: 50%;
	margin: 0 auto 10px;
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-text {
	font-family: DemoItalicBold;
	font-size: 14px;
	color: rgba(0, 0, 0, 0.45);
	margin: 0;
}

/* 内容容器 */
.content-wrapper {
	display: flex;
	flex-direction: column;
	gap: 24px;
	width: 100%;
}

/* 加载/内容切换动画 */
.fade-enter-active {
	transition: opacity 0.3s ease;
}

.fade-leave-active {
	transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.detail-sections {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.detail-section {
	display: flex;
	flex-direction: column;
	gap: 16px;
	border-radius: 16px;
	font-family: DemoItalicBold;
}

.detail-title {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.title-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
}

.title-main {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}

.title-main img {
	width: 16px;
	height: 16px;
}

.title-text {
	font-size: 18px;
	font-weight: 600;
	color: #333333;
}

.title-sub {
	font-family: PingFangSC-Regular;
	font-size: 12px;
	color: rgba(0, 0, 0, 0.45);
	margin-left: 24px;
}

.title-badge {
	display: inline-flex;
	align-items: center;
	padding: 4px 12px;
	padding-bottom: 6px;
	border-radius: 4px;
	background: #ff3a3a;
	color: #ffffff;
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
}

/* 动画项 - 初始状态 */
.animate-item {
	opacity: 0;
	transform: translateY(20px);
	animation: fadeSlideIn 0.6s ease-out forwards;
}

/* 延迟动画 */
.animate-delay-1 {
	animation-delay: 0.1s;
}

.animate-delay-2 {
	animation-delay: 0.25s;
}

/* 淡入滑入动画关键帧 */
@keyframes fadeSlideIn {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* 移动端优化动画性能 */
@media (max-width: 768px) {
	.animate-item {
		transform: translateY(15px);
	}

	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateY(15px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-delay-1 {
		animation-delay: 0.05s;
	}

	.animate-delay-2 {
		animation-delay: 0.15s;
	}
}
</style>
