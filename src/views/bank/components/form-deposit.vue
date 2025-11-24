<template>
	<div class="deposit-wrapper">
		<!-- form表单 -->
		<form @submit.prevent="handleDeposit" class="deposit-form" :class="{ 'animate-item animate-delay-1': shouldAnimate }">
			<!-- amount -->
			<div class="form-item">
				<label for="amount">{{ t('amount_label') }}</label>
				<input
					type="text"
					id="amount"
					v-model="formData.amount"
					:placeholder="t('input_placeholder')"
					:class="{ 'has-value': formData.amount && formData.amount.trim() }"
				/>
				<p class="error-text" v-if="amountErrorText">{{ amountErrorText }}</p>
			</div>
			<!-- lock_time -->
			<div class="form-item">
				<label for="lock_time">{{ t('time_term') }}</label>
				<div class="lock-time-select" ref="lockTriggerRef">
					<button
						type="button"
						class="lock-time-btn"
						:aria-expanded="isLockPanelOpen"
						@click="toggleLockPanel"
					>
						<span :class="{ active: selectedLockKey }">{{
							selectedLockLabel || t('please_select_term')
						}}</span>
						<svg
							class="chevron"
							:class="{ open: isLockPanelOpen }"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path fill="currentColor" d="M7.41 8.58 12 13.17l4.59-4.59L18 10l-6 6-6-6z" />
						</svg>
					</button>
					<!-- lock_time_panel -->
					<Transition name="lock-panel-fade">
						<div
							v-if="isLockPanelOpen"
							ref="lockPanelRef"
							class="lock-time-panel"
							:class="{ above: lockPanelAbove }"
							role="listbox"
							:style="lockPanelInlineStyle"
						>
							<button
								v-for="opt in lockOptions"
								:key="opt.key"
								type="button"
								class="lock-time-option"
								:class="{ active: opt.key === selectedLockKey }"
								@click="pickLockOption(opt.key)"
								:aria-selected="opt.key === selectedLockKey"
								role="option"
							>
								{{ labelForLock(opt.key) }}
							</button>
						</div>
					</Transition>
				</div>
				<p class="error-text" v-if="lockTimeErrorText">{{ lockTimeErrorText }}</p>
			</div>
			<button type="button" class="submit-btn" :disabled="isSubmitting" @click="handleDeposit">
				<span class="submit-text">{{ t('submit_deposit') }}</span>
				<span class="button-icon" :class="iconState">
					<svg
						v-if="iconState === 'success'"
						class="icon icon-success"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							d="M5 12.5 10 17l9-10"
							stroke-width="2.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<svg
						v-else-if="iconState === 'error'"
						class="icon icon-error"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path d="M7 7l10 10M17 7l-10 10" stroke-width="2.6" stroke-linecap="round" />
					</svg>
					<svg v-else class="icon icon-arrow" viewBox="0 0 24 24" aria-hidden="true">
						<path
							d="M4 12h16M16 8l4 4-4 4"
							stroke-width="2.6"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
			</button>
		</form>
		<Transition name="status-fade">
			<div v-if="statusMessage" class="status-toast" :class="statusType">
				{{ statusMessage }}
			</div>
		</Transition>
		<section class="guide-card" :class="{ 'animate-item animate-delay-2': shouldAnimate }">
      <div class="guide__body">
				<header class="guide__header">
					<p class="guide__title">{{ t('guide_title') }}: {{ t('guide_tagline') }}</p>
				</header>

				<div class="guide__content">
					<p class="section-title">{{ t('guide_section_flow') }}</p>
					<div class="guide__block">
						<p class="guide__subtitle">{{ t('guide_how_deposit') }}</p>
						<ul class="guide__list">
							<li>{{ t('guide_home_info') }}</li>
							<li>{{ t('guide_click_get_address') }}</li>
							<li>
								<div class="guide__steps-title">{{ t('guide_deposit_steps_title') }}</div>
								<ul class="guide__steps">
									<li>{{ t('guide_step1_amount') }}</li>
									<li>{{ t('guide_step2_term') }}</li>
									<li>{{ t('guide_step3_submit') }}</li>
								</ul>
							</li>
						</ul>
					</div>

					<div class="guide__block">
						<p class="guide__subtitle">{{ t('guide_how_withdraw') }}</p>
						<ul class="guide__list">
							<li>{{ t('guide_withdraw_nav') }}</li>
							<li>{{ t('guide_withdraw_pick') }}</li>
						</ul>
					</div>

					<p class="section-title">{{ t('guide_section_notice') }}</p>
					<ul class="guide__list">
						<li>{{ t('guide_notice_wallet') }}</li>
						<li>{{ t('guide_notice_term') }}</li>
						<li>{{ t('guide_notice_maturity') }}</li>
						<li>{{ t('guide_notice_refresh') }}</li>
					</ul>
				</div>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { CSSProperties } from 'vue';
import { t } from '../../../i18n';
import { Regex } from '../../../utils/reg';
import { useWalletStore } from '../../../stores/wallet';
import { API } from 'tbc-contract';
// @ts-ignore
import piggyBank from 'tbc-contract/lib/contract/piggyBank.js';
import * as tbc from 'tbc-lib-js';

// 定义 emits
const emit = defineEmits<{
	'animation-complete': [];
}>();

type LockOption = {
	key: string;
	days?: number;
	months?: number;
	years?: number;
};

type IconState = 'idle' | 'submitting' | 'success' | 'error';

const network = import.meta.env.VITE_NETWORK || undefined;

const props = defineProps<{
	balance?: number | null;
	shouldAnimate?: boolean;
}>();

const walletStore = useWalletStore();
const { walletInfo, getBalance } = walletStore;

const formData = reactive({
	amount: '',
	lockTime: 0,
});

const lockOptions: LockOption[] = [
	{ key: '1d', days: 1 },
	{ key: '1w', days: 7 },
	{ key: '1m', months: 1 },
	{ key: '3m', months: 3 },
	{ key: '6m', months: 6 },
	{ key: '1y', years: 1 },
	{ key: '2y', years: 2 },
	{ key: '3y', years: 3 },
	{ key: '5y', years: 5 },
	{ key: '10y', years: 10 },
	{ key: '20y', years: 20 },
];

const selectedLockKey = ref('');
const isLockPanelOpen = ref(false);
const lockPanelAbove = ref(false);
const lockPanelMaxPx = ref(280);
const lockTriggerRef = ref<HTMLElement | null>(null);
const lockPanelRef = ref<HTMLElement | null>(null);

const amountErrorText = ref('');
const lockTimeErrorText = ref('');
const submitErrorText = ref('');
const successMessage = ref('');
let statusTimer: ReturnType<typeof setTimeout> | null = null;
const isSubmitting = ref(false);
const iconState = ref<IconState>('idle');

const currentBlockHeight = ref(0);
let iconResetTimer: ReturnType<typeof setTimeout> | null = null;

const availableBalance = computed(() => {
	if (props.balance !== undefined && props.balance !== null) {
		return props.balance;
	}
	return walletInfo.tbcBalance ?? 0;
});

watch(
	() => walletInfo.curBlockHeight,
	(height) => {
		if (typeof height === 'number' && height > 0) {
			currentBlockHeight.value = height;
		}
	},
	{ immediate: true },
);

// 监听 shouldAnimate 变化，动画完成后通知父组件
watch(
	() => props.shouldAnimate,
	(newVal) => {
		if (newVal) {
			// 动画持续时间：0.6s + 0.25s (最大延迟) = 0.85s，加上一些缓冲
			setTimeout(() => {
				emit('animation-complete');
			}, 900);
		}
	},
);

watch(
	() => formData.amount,
	() => {
		if (amountErrorText.value) {
			validateAmount();
		}
	},
);

const selectedLockLabel = computed(() => labelForLock(selectedLockKey.value));

const lockPanelInlineStyle = computed<CSSProperties>(() => ({
	maxHeight: `${lockPanelMaxPx.value}px`,
	overflowY: 'auto',
}));

const statusMessage = computed(() => successMessage.value || submitErrorText.value);
const statusType = computed(() =>
	successMessage.value ? 'success' : submitErrorText.value ? 'error' : '',
);

const dueDate = computed(() => {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const opt = lockOptions.find((option) => option.key === selectedLockKey.value);
	if (!opt) return start;

	const target = new Date(start);
	if (opt.days) {
		target.setDate(target.getDate() + opt.days);
	}
	if (opt.months) {
		target.setMonth(target.getMonth() + opt.months);
	}
	if (opt.years) {
		target.setFullYear(target.getFullYear() + opt.years);
	}
	return target;
});

const lockBlockHeight = computed(() => {
	if (!selectedLockKey.value) return 0;
	const baseHeight = currentBlockHeight.value || walletInfo.curBlockHeight || 0;
	if (!baseHeight) return 0;

	const now = new Date();
	const msPerBlock = 10 * 60 * 1000;
	const target = dueDate.value;
	const diffMs = target.getTime() - now.getTime();
	const blocks = Math.ceil(diffMs / msPerBlock);
	const height = baseHeight + (blocks > 0 ? blocks : 0);
	return height > 0 ? height : baseHeight;
});

watch(
	() => selectedLockKey.value,
	() => {
		lockTimeErrorText.value = '';
		formData.lockTime = lockBlockHeight.value;
	},
);

watch(
	() => lockBlockHeight.value,
	(height) => {
		if (selectedLockKey.value) {
			formData.lockTime = height;
		}
	},
);

function labelForLock(key: string) {
	const map: Record<string, string> = {
		'1d': t('term_1d'),
		'1w': t('term_1w'),
		'1m': t('term_1m'),
		'3m': t('term_3m'),
		'6m': t('term_6m'),
		'1y': t('term_1y'),
		'2y': t('term_2y'),
		'3y': t('term_3y'),
		'5y': t('term_5y'),
		'10y': t('term_10y'),
		'20y': t('term_20y'),
	};
	return map[key] ?? '';
}

function toggleLockPanel() {
	isLockPanelOpen.value = !isLockPanelOpen.value;
	if (isLockPanelOpen.value) {
		nextTick(() => {
			updateLockPanelPlacement();
			document.addEventListener('click', handleOutsideClick, true);
		});
	} else {
		document.removeEventListener('click', handleOutsideClick, true);
	}
}

function handleOutsideClick(e: MouseEvent) {
	const trigger = lockTriggerRef.value;
	const panel = lockPanelRef.value;
	const target = e.target as Node;
	if (trigger && trigger.contains(target)) return;
	if (panel && panel.contains(target)) return;
	isLockPanelOpen.value = false;
	document.removeEventListener('click', handleOutsideClick, true);
}

function pickLockOption(key: string) {
	selectedLockKey.value = key;
	isLockPanelOpen.value = false;
	document.removeEventListener('click', handleOutsideClick, true);
}

function updateLockPanelPlacement() {
	if (!isLockPanelOpen.value) return;
	const trigger = lockTriggerRef.value;
	if (!trigger) return;
	const rect = trigger.getBoundingClientRect();
	const viewportH = window.innerHeight;
	const spaceBelow = viewportH - rect.bottom - 12;
	const spaceAbove = rect.top - 12;
	const desired = Math.min(0.5 * viewportH, 320);
	lockPanelAbove.value = spaceBelow < 220 && spaceAbove > spaceBelow;
	const maxH = Math.max(200, Math.min(desired, lockPanelAbove.value ? spaceAbove : spaceBelow));
	lockPanelMaxPx.value = Math.floor(maxH);
}

function handleViewportChange() {
	if (isLockPanelOpen.value) {
		updateLockPanelPlacement();
	}
}

const handleDeposit = async () => {
	if (isSubmitting.value) return;
	clearStatus();
	const isAmountValid = validateAmount();
	const isLockValid = validateLockTime();
	if (!isAmountValid || !isLockValid) {
		resetIconState();
		return;
	}

	isSubmitting.value = true;
	setIconState('submitting');
	try {
		await freezeTBC();
		showSuccess(t('deposit_success'));
		setIconState('success', true);
		resetForm();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		showError(message || t('deposit_failed'));
		setIconState('error', true);
	} finally {
		isSubmitting.value = false;
	}
};

function validateAmount(): boolean {
	amountErrorText.value = '';
	const raw = formData.amount.trim();
	if (!raw) {
		amountErrorText.value = t('err_enter_amount');
		return false;
	}
	if (!Regex.freezeAmountReg.test(raw)) {
		amountErrorText.value = t('err_amount_format');
		return false;
	}
	const amountNumber = Number(raw);
	if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
		amountErrorText.value = t('err_amount_format');
		return false;
	}
	if (
		availableBalance.value !== null &&
		availableBalance.value !== undefined &&
		amountNumber > availableBalance.value
	) {
		amountErrorText.value = t('err_amount_exceed_balance');
		return false;
	}
	return true;
}

function validateLockTime(): boolean {
	lockTimeErrorText.value = '';
	const lockHeight = formData.lockTime;
	const baseHeight = walletInfo.curBlockHeight || currentBlockHeight.value || 0;
	if (!selectedLockKey.value || !lockHeight) {
		lockTimeErrorText.value = t('err_select_time');
		return false;
	}
	if (baseHeight && lockHeight <= baseHeight) {
		lockTimeErrorText.value = t('err_select_time');
		return false;
	}
	return true;
}

async function freezeTBC() {
	const amountNumber = Number(formData.amount.trim());
	const lockHeight = formData.lockTime;
	const address = walletInfo.curAddress;
	const blockHeight = walletInfo.curBlockHeight || currentBlockHeight.value || 0;

	if (!address) throw new Error(t('warning_no_account'));
	if (!lockHeight || (blockHeight && lockHeight <= blockHeight)) {
		throw new Error(t('err_select_time'));
	}
	if (!amountNumber || amountNumber <= 0) {
		throw new Error(t('err_enter_amount'));
	}

	const tbcAmount = Math.ceil(amountNumber * Math.pow(10, 6));
	if (!tbcAmount || tbcAmount <= 0) {
		throw new Error(t('err_invalid_amount'));
	}

	const { tbcPubKey } = await window.Turing.getPubKey();
	const publicKey = new tbc.PublicKey(tbcPubKey);
	const utxos_satoshis: number[][] = [[], []];
	const script_pubkeys: string[][] = [[], []];
	const txraws: string[] = [];

	const utxos = await API.getUTXOs(address, amountNumber + 0.1, network);
	if (!utxos || utxos.length === 0) {
		throw new Error(t('err_no_utxo'));
	}

	const freezeTx = piggyBank.freezeTBC(address, amountNumber, lockHeight, utxos);
	const tx = new tbc.Transaction(freezeTx);
	const txRaw = tx.uncheckedSerialize();
	txraws.push(txRaw);

	for (let i = 0; i < utxos.length; i++) {
		utxos_satoshis[0]!.push(utxos[i]!.satoshis);
		script_pubkeys[0]!.push(utxos[i]!.script);
	}

	const signRes: any = await window.Turing.signTransaction({
		txraws,
		utxos_satoshis,
		script_pubkeys,
	});

	let sigInput: string[] = [];
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

	for (let i = 0; i < utxos.length; i++) {
		const sig = sigInput[i];
		if (!sig) throw new Error(t('err_sign_missing').replace('{index}', String(i + 1)));
		tx.setInputScript({ inputIndex: i }, () => {
			const sigLength = (sig.length / 2).toString(16);
			const publicKeyLength = (publicKey.toBuffer().toString('hex').length / 2).toString(16);
			return new tbc.Script(sigLength + sig + publicKeyLength + publicKey.toString());
		});
	}

	const res = await API.broadcastTXraw(tx.uncheckedSerialize(), network);
	if (!res) {
		throw new Error(t('err_broadcast_failed'));
	}

	await getBalance();
}

function clearStatus() {
	successMessage.value = '';
	submitErrorText.value = '';
	clearStatusTimer();
}

function showSuccess(message: string) {
	successMessage.value = message;
	submitErrorText.value = '';
	startStatusTimer();
}

function showError(message: string) {
	submitErrorText.value = message;
	successMessage.value = '';
	startStatusTimer();
}

function startStatusTimer() {
	clearStatusTimer();
	statusTimer = setTimeout(() => {
		successMessage.value = '';
		submitErrorText.value = '';
		statusTimer = null;
	}, 3000);
}

function clearStatusTimer() {
	if (statusTimer) {
		clearTimeout(statusTimer);
		statusTimer = null;
	}
}

function setIconState(state: IconState, autoReset = false) {
	iconState.value = state;
	if (autoReset) {
		scheduleIconReset();
	} else if (state === 'submitting') {
		clearIconResetTimer();
	}
}

function scheduleIconReset() {
	clearIconResetTimer();
	iconResetTimer = setTimeout(() => {
		resetIconState();
	}, 2000);
}

function resetIconState() {
	clearIconResetTimer();
	iconState.value = 'idle';
}

function clearIconResetTimer() {
	if (iconResetTimer) {
		clearTimeout(iconResetTimer);
		iconResetTimer = null;
	}
}

function resetForm() {
	formData.amount = '';
	formData.lockTime = 0;
	selectedLockKey.value = '';
}

async function refreshCurrentBlock() {
	try {
		const res = await API.fetchBlockHeaders(network);
		currentBlockHeight.value = res?.[0]?.height || currentBlockHeight.value;
	} catch {
		// ignore
	}
}

onMounted(() => {
	refreshCurrentBlock();
	window.addEventListener('resize', handleViewportChange, { passive: true });
	window.addEventListener('scroll', handleViewportChange, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleViewportChange);
	window.removeEventListener('scroll', handleViewportChange);
	document.removeEventListener('click', handleOutsideClick, true);
	clearStatusTimer();
	clearIconResetTimer();
});
</script>

<style>
@import '../../../assets/css/new-global.css';
</style>
<style scoped lang="less">
/* wrapper */
.deposit-wrapper {
	display: flex;
	flex-direction: column;
	gap: 24px;
}

/* form */
.deposit-form {
	display: flex;
	flex-direction: column;
	gap: 24px;
	position: relative;
	z-index: 2;
}

.form-item {
	display: flex;
	flex-direction: column;
	gap: 4px;
	background-color: #f8f8f8;
	border-radius: 20px;
	padding: 12px 24px;
}

.form-item label {
	font-family: DingTalk-JinBuTi;
	font-size: 12px;
	font-weight: 400;
	color: #000000;
	opacity: 0.4;
	line-height: 16px;
}

.form-item input,
.lock-time-btn {
	border: none;
	background-color: transparent;
	font-family: 'DemoItalicBold';
	font-size: 18px;
	color: #00000040;
	letter-spacing: 1px;
	font-weight: 900;
	padding: 0;
	outline: none;
	box-shadow: none;
	appearance: none;
	transition: color 0.2s ease;
}

/* 金额输入框有值时：文字为黑色 */
.form-item input.has-value,
.form-item input:not(:placeholder-shown) {
	color: #000000;
	-webkit-text-fill-color: #000000;
}

/* 存储期限选中状态：文字为黑色 */
.lock-time-btn span.active {
	color: #000000;
}

/* 存储期限未选择状态：文字为有透明度的黑色（继承自 .lock-time-btn 的 #00000040） */
.lock-time-btn span {
	color: inherit;
	transition: color 0.2s ease;
}

/* Placeholder 颜色设置为与按钮文字一致 */
.form-item input::placeholder {
	color: #00000040;
	opacity: 1;
}

.form-item input::-webkit-input-placeholder {
	color: #00000040;
	opacity: 1;
}

.form-item input::-moz-placeholder {
	color: #00000040;
	opacity: 1;
}

.form-item input:-ms-input-placeholder {
	color: #00000040;
	opacity: 1;
}

/* 确保 focus 状态下 placeholder 颜色不变 */
.form-item input:focus::placeholder {
	color: #00000040;
	opacity: 1;
}

.form-item input:focus::-webkit-input-placeholder {
	color: #00000040;
	opacity: 1;
}

.form-item input:focus::-moz-placeholder {
	color: #00000040;
	opacity: 1;
}

.form-item input:focus,
.form-item input:focus-visible,
.form-item input:focus-within {
	outline: none;
	box-shadow: none;
	background-color: transparent;
}

.form-item input:-internal-autofill-selected,
.form-item input:-webkit-autofill,
.form-item input:-webkit-autofill:hover,
.form-item input:-webkit-autofill:focus {
	background-color: transparent !important;
	box-shadow: 0 0 0 1000px transparent inset !important;
	-webkit-text-fill-color: #000000;
	caret-color: #000000;
	transition:
		background-color 9999s ease-out,
		color 9999s ease-out;
}

.error-text {
	margin: 2px 0 0;
	font-size: 12px;
	line-height: 16px;
	color: #ff5d5d;
	font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.submit-btn {
	width: min(100%, 404px);
	max-width: 404px;
	height: 40px;
	background-color: #ffb03b;
	border-radius: 12px;
	border: 1px solid transparent;
	background-image:
		linear-gradient(#ffb03b, #ffb03b), linear-gradient(90deg, #ffffff 0%, #ffffff 100%);
	background-origin: border-box;
	background-clip: padding-box, border-box;
	font-family: 'DemoItalicBold';
	font-size: 16px;
	line-height: 20px;
	color: #000000;
	letter-spacing: 1px;
	font-weight: 900;
	cursor: pointer;
	margin: 0 auto;
	transition: all 0.3s ease;
	box-shadow: 0px 4px 12px 0px rgba(255, 176, 59, 0.6);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 24px;
	padding: 0 20px;
	overflow: hidden;
}

.submit-text {
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.button-icon {
	width: 46px;
	height: 46px;
	border-radius: 50%;
	background: #ffffff;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	position: relative;
	box-shadow: inset 0 0 0 1px rgba(255, 166, 0, 0.3);
	z-index: 0;
}

.button-icon svg {
	width: 22px;
	height: 22px;
	fill: none;
	stroke: #ffb03b;
	transition:
		opacity 0.3s ease,
		transform 0.3s ease;
}

.button-icon.submitting {
	animation: icon-bounce 0.9s ease-in-out infinite;
}

.button-icon.submitting .icon-arrow {
	animation: arrow-slide 0.9s ease-in-out infinite;
}

.button-icon.success svg,
.button-icon.error svg {
	animation:
		status-pop 0.25s ease,
		status-fade 2s ease forwards;
}

.button-icon.error svg {
	stroke: #ff7d00;
}

.submit-btn:hover {
	transform: translateY(-2px);
}
.submit-btn:active {
	transform: translateY(0);
	box-shadow: 0px 2px 4px 0px rgba(255, 176, 59, 0.4);
}
.button-icon.success svg path,
.button-icon.error svg path {
	stroke-width: 2.2;
}

@keyframes arrow-slide {
	0% {
		transform: translateX(0);
		opacity: 1;
	}
	70% {
		transform: translateX(6px);
		opacity: 1;
	}
	100% {
		transform: translateX(18px);
		opacity: 0;
	}
}

@keyframes icon-bounce {
	0%,
	100% {
		transform: scale(1);
	}
	50% {
		transform: scale(0.9);
	}
}

@keyframes status-pop {
	0% {
		transform: scale(0.6);
		opacity: 0;
	}
	100% {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes status-fade {
	0% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

.submit-btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
	box-shadow: none;
}

// 移动端样式
@media (max-width: 600px) {
	.submit-btn {
		width: min(100%, 230px);
		max-width: 230px;
	}
}

.status-toast {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	padding: 12px 24px;
	border-radius: 12px;
	background: rgba(0, 0, 0, 0.7);
	color: #ffffff;
	font-size: 14px;
	line-height: 20px;
	font-family: 'DemoItalicBold';
	text-align: center;
	z-index: 999;
	pointer-events: none;
	min-width: 200px;
}

// .status-toast.success {
// 	border: 1px solid rgba(46, 255, 154, 0.6);
// }

// .status-toast.error {
// 	border: 1px solid rgba(255, 116, 116, 0.7);
// }

.status-fade-enter-from,
.status-fade-leave-to {
	opacity: 0;
	transform: translate(-50%, -50%) scale(0.95);
}

.status-fade-enter-active,
.status-fade-leave-active {
	transition:
		opacity 0.25s ease,
		transform 0.25s ease;
}

.deposit-form {
	gap: 16px;
}

.lock-time-select {
	position: relative;
	width: 100%;
}

.lock-time-btn {
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	padding: 4px 0;
	cursor: pointer;
	text-align: left;
}

.lock-time-btn .chevron {
	width: 20px;
	height: 20px;
	color: rgba(0, 0, 0, 0.5);
	transition: transform 0.2s ease;
}

.lock-time-btn .chevron.open {
	transform: rotate(180deg);
}

.lock-time-panel {
	position: absolute;
	top: calc(100% + 8px);
	left: 0;
	right: 0;
	background: #ffffff;
	border-radius: 16px;
	border: 1px solid rgba(0, 0, 0, 0.08);
	box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
	padding: 8px;
	z-index: 10;
	scrollbar-width: thin;
	scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.lock-time-panel.above {
	top: auto;
	bottom: calc(100% + 8px);
}

.lock-time-panel::-webkit-scrollbar {
	width: 6px;
}

.lock-time-panel::-webkit-scrollbar-track {
	background: transparent;
}

.lock-time-panel::-webkit-scrollbar-thumb {
	background: rgba(0, 0, 0, 0.2);
	border-radius: 20px;
}

.lock-time-option {
	width: 100%;
	padding: 12px;
	border-radius: 12px;
	border: 1px solid transparent;
	background: transparent;
	text-align: left;
	font-family: 'DemoItalicBold';
	font-size: 16px;
	font-weight: 700;
	color: #000000;
	cursor: pointer;
	transition: all 0.15s ease;
}

.lock-time-option:hover {
	background: rgba(0, 0, 0, 0.04);
}

.lock-time-option.active {
	background: rgba(255, 210, 143, 0.3);
	border-color: rgba(255, 210, 143, 0.8);
}

.lock-panel-fade-enter-from,
.lock-panel-fade-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}

.lock-panel-fade-enter-active,
.lock-panel-fade-leave-active {
	transition: all 0.15s ease;
}

/* 使用说明 */
.guide-card {
	font-family: 'PingFangSC-Regular';
	font-size: 14px;
	color: #b4b4b4;
	text-align: left;
	line-height: 20px;
	font-weight: 400;
	margin-top: 40px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.guide__title {
	margin-bottom: 20px;
}

.section-title {
  margin: 20px 0;
}

.guide__subtitle { 
  margin-top: 20px;
}

.guide__list li{
  padding-left: 10px;
}


@media (max-width: 768px) {
	.deposit-wrapper {
		gap: 20px;
	}
}

/* 动画项 - 初始状态（仅在动画触发时应用） */
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
