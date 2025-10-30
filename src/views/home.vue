<template>
  <div class="home-container">
    <!-- 顶部导航 -->
    <header class="header">
      <h1 class="title">{{ t('app_title') }}</h1>
      <div style="display:flex; gap:10px; align-items:center;">
        <button type="button" class="lang-btn" @click="toggleLocale">
          <span class="lang-text">{{ locale === 'zh' ? '中文' : 'English' }}</span>
          <span class="lang-dot" />
        </button>
        <router-link to="/query" class="query-btn">
          {{ t('nav_details') }}
        </router-link>
      </div>
    </header>
    <!-- logo图片 -->
    <img src="../assets/piggy-bank.svg" alt="piggy-bank" class="piggy-bank-img">
    <!-- 钱包信息区域 -->
    <div class="deposit-section">
      <!-- 获取钱包地址、余额、区块高度 -->
      <button @click="getAddress">{{ t('click_get_address') }}</button>
      <!-- 当前钱包地址 -->
      <template v-if="curAddress">
        <div class="form-group">
          <label>{{ t('current_address') }}</label>
          <input
            v-model="curAddress"
            disabled
          />
        </div>
        <div class="form-group">
          <label>{{ t('current_balance') }}</label>
          <input
            v-model="tbcBalance"
            disabled
          />
        </div>
        <div class="form-group">
          <label>{{ t('current_height') }}</label>
          <input
            v-model="curBlockHeight"
            disabled
          />
        </div>
      </template>
      <!-- 冻结资产表单 -->
      <h2 class="title">{{ t('deposit_section') }}</h2>
      <form @submit.prevent="handleDeposit" class="deposit-form">
        <!-- 冻结金额 -->
        <div class="form-group">
          <label for="amount">{{ t('amount_label') }}</label>
          <input
            :class="errors.amountTipKey ? 'error-input' : ''"
            id="amount"
            v-model.number="formData.depositAmount"
            :placeholder="t('input_amount_placeholder')"
            @input="validateAmount"
          />
          <Transition name="error-fade">
            <span class="error-message" v-if="amountTip">{{ amountTip }}</span>
          </Transition>
        </div>
        <div class="form-group">
          <!-- 新的期限选择组件（旧组件保留不动） -->
          <TimeSelected
            :address="curAddress"
            :network="network"
            @update:lockTime="handleLockTimeChange"
          />
          <Transition name="error-fade">
            <span class="error-message" v-if="timeTip">{{ timeTip }}</span>
          </Transition>
        </div>
        <Transition name="error-fade">
          <span class="error-message" v-if="submitError">{{ submitError }}</span>
        </Transition>
        <button type="submit" class="deposit-btn" :disabled="!formData.depositAmount || formData.depositAmount <= 0">
          {{ t('submit_deposit') }}
        </button>
      </form>
    </div>
  </div>
  <!-- 全局提示 -->
  <Transition name="toast-success-fade">
    <div class="toast-success" v-if="successMessage">{{ successMessage }}</div>
  </Transition>
  <Transition name="toast-error-fade">
    <div class="toast-error" v-if="errorMessage">{{ errorMessage }}</div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, computed } from 'vue'
import TimeSelected from './time-selected.vue'
import { t, locale as localeRef, setLocale } from '../i18n'
import { API } from 'tbc-contract'
// @ts-ignore
import piggyBank from 'tbc-contract/lib/contract/piggyBank.js'
import { Regex } from '../utils/reg'
import * as tbc from "tbc-lib-js";

// 全局变量声明：Turing钱包接口
declare global {
  interface Window {
    Turing: {
      connect(): Promise<void>
      disconnect(): Promise<void>
      isConnected(): Promise<boolean>
      getPubKey(): Promise<{ tbcPubKey: string }>
      getAddress(): Promise<{ tbcAddress: string }>
      getBalance(): Promise<{ tbc: number }>
      signTransaction({txraws, utxos_satoshis, script_pubkeys}: {txraws: string[], utxos_satoshis: number[][], script_pubkeys: string[][]}): Promise<{ sigs: string[] }>
    }
  }
}

// 类型定义-错误提示信息
interface Errors {
  amountTipKey: string // 存储错误键而不是错误文本
  timeTipKey: string // 存储错误键而不是错误文本
}

// 响应式数据
const network = import.meta.env.VITE_NETWORK || undefined // 网络环境
// 表单数据-冻结
const formData = reactive({
  depositAmount: 0, // 冻结金额
  lockTime: 0, // 冻结时间（换算为区块高度）
})
// 表单数据-钱包
const tbcBalance = ref(0) // 钱包余额 tbc-余额
const curAddress = ref('') // 钱包地址
const curBlockHeight = ref(0) // 当前区块高度
// 其他数据-本地存储
const STORAGE_KEY = 'tbc_wallet_address' // 本地存储密钥

const errors = reactive<Errors>({ // 错误提示
  amountTipKey: '',
  timeTipKey: ''
})

// 使用计算属性动态获取错误文本
const amountTip = computed(() => errors.amountTipKey ? t(errors.amountTipKey) : '')
const timeTip = computed(() => errors.timeTipKey ? t(errors.timeTipKey) : '')

// 提交阶段统一错误 - 使用计算属性来存储错误类型而不是错误文本
const submitErrorType = ref('')
const submitError = computed(() => {
  return submitErrorType.value ? t(submitErrorType.value) : ''
})

const successMessage = ref('')
const errorMessage = ref('')

const locale = localeRef

function toggleLocale() {
  setLocale(locale.value === 'zh' ? 'en' : 'zh')
}

// 页面挂载时获取数据
onMounted(async () => {
  // 钱包数据初始化
  await getWalletData()
})

// 监听金额变化，实时校验
watch(
  () => formData.depositAmount, // 监听formData中的depositAmount属性
  () => {
    validateAmount()
  }
)

// 监听冻结时间变化，实时校验
watch(
  () => formData.lockTime, // 监听formData中的lockTime属性
  () => {
    validateLockTime()
  }
)

// 处理lockTime变化
const handleLockTimeChange = (lockTime: number) => {
  formData.lockTime = lockTime
}

// 冻结金额校验
const validateAmount = (): boolean => {
  errors.amountTipKey = ''
  const depositAmount = formData.depositAmount
  // 非空校验
  if (!depositAmount) {
    errors.amountTipKey = 'err_enter_amount'
    return false
  }
  // 正则校验
  const amountStr = depositAmount.toString()
  if (!Regex.freezeAmountReg.test(amountStr)) {
    errors.amountTipKey = 'err_amount_format'
    return false
  }
  // 金额校验
  if (depositAmount > tbcBalance.value) {
    errors.amountTipKey = 'err_amount_exceed_balance'
    return false
  }
  return true
}

// 冻结时间校验
const validateLockTime = (): boolean => {
  errors.timeTipKey = ''
  const lockTime = formData.lockTime
  // 检查是否选择了冻结时间
  if (!lockTime) {
    errors.timeTipKey = 'err_select_time'
    return false
  }
  return true
}

// 获取钱包数据
const getWalletData = async () => {
  await getAddress()
  await getBalance()
  await getBlockHeight()
}

// 获取钱包地址
const getAddress = async () => {
  if (!window.Turing) {
    alert(t('need_wallet_install'))
    return
  }
  try {
    await window.Turing.connect()
    const { tbcAddress } = await window.Turing.getAddress()
    localStorage.setItem(STORAGE_KEY, tbcAddress)
    curAddress.value = tbcAddress
  } catch (error) {
    console.error('获取钱包地址失败:', error)
  }
}

// 获取钱包余额
const getBalance = async () => {
  try {
    const tbc = await API.getTBCbalance(curAddress.value, network)
    tbcBalance.value = tbc / 1000000
  } catch (error) {
    console.error('获取钱包余额失败:', error)
  }
}

// 获取当前区块高度
const getBlockHeight = async () => {
  try {
    const res = await API.fetchBlockHeaders(network)
    curBlockHeight.value = res[0]?.height || 0
  } catch (error) {
    console.error('获取当前区块高度失败:', error)
  }
}

// 构造冻结资产交易
const freezeTBC = async () => {
  const tbcNumber = formData.depositAmount
  const tbcAmount = Math.ceil(formData.depositAmount * Math.pow(10, 6));
  const lockTime = formData.lockTime
  try {
    // 参数校验
    if (!curAddress.value) throw new Error("钱包地址未获取");
    if (!lockTime || lockTime <= curBlockHeight.value) throw new Error("锁定区块高度无效（需大于当前区块）");
    if (!tbcAmount || tbcAmount <= 0) throw new Error("冻结金额无效");
    // 参数准备-UTXO的金额和锁定脚本
    const { tbcPubKey } = await window.Turing.getPubKey();
    // 获取公钥
    const publicKey = new tbc.PublicKey(tbcPubKey);
    const utxos_satoshis: number[][] = [[], []] // 二维数组：[[第一个交易的UTXO金额]]
    const script_pubkeys: string[][] = [[], []] // 二维数组：[[第一个交易的UTXO锁定脚本]]
    const txraws: string[] = [] // 未签名交易
    // 使用 getUTXOs 获取 UTXO 列表（传入地址和金额）
    const utxos = await API.getUTXOs(curAddress.value, tbcNumber + 0.1, network)
    console.log('utxos:', utxos)
    if (!utxos || utxos.length === 0) throw new Error("无可用UTXO支付手续费");
    // 未签名交易
    const freezeTx = piggyBank.freezeTBC(curAddress.value, tbcNumber, lockTime, utxos)
    const tx = new tbc.Transaction(freezeTx)
    // 交易签名
    const txRaw = tx.uncheckedSerialize()
    txraws.push(txRaw) // 序列化未签名交易
    for(let i=0; i < utxos.length; i++) {
      utxos_satoshis[0]!.push(utxos[i]!.satoshis)
      script_pubkeys[0]!.push(utxos[i]!.script)
    }
    // 验证参数格式
    if (!Array.isArray(txraws) || txraws.length === 0) {
      throw new Error("txraws 必须是非空数组");
    }
    if (!Array.isArray(utxos_satoshis) || utxos_satoshis.length === 0) {
      throw new Error("utxos_satoshis 必须是非空数组");
    }
    if (!Array.isArray(script_pubkeys) || script_pubkeys.length === 0) {
      throw new Error("script_pubkeys 必须是非空数组");
    }
    // 检查每个数组的第一个元素
    if (!Array.isArray(utxos_satoshis[0]) || utxos_satoshis[0].length === 0) {
      throw new Error("utxos_satoshis[0] 必须是非空数组");
    }
    if (!Array.isArray(script_pubkeys[0]) || script_pubkeys[0].length === 0) {
      throw new Error("script_pubkeys[0] 必须是非空数组");
    }
    // console.log('参数验证通过，开始签名...')
    // 对交易进行签名（兼容新旧钱包返回：优先 sigs，缺失则尝试 sig）
    const signRes: any = await window.Turing.signTransaction({
      txraws,
      utxos_satoshis,
      script_pubkeys
    })
    let sigInput: string[] = []
    try {
      if (signRes && signRes.sigs) {
        const sigs = signRes.sigs
        sigInput = Array.isArray(sigs[0]) ? sigs[0] : sigs
      } else if (signRes && signRes.sig) {
        const sig = signRes.sig
        sigInput = Array.isArray(sig) ? sig : [sig]
      }
      if (!sigInput || sigInput.length === 0) {
        throw new Error('签名数据为空')
      }
    } catch (e) {
      throw new Error('交易签名失败：未获取到有效签名（兼容sigs/sig均失败）')
    }

    // 将签名添加到交易中，设置UTXO的解锁脚本
    for (let i = 0; i < utxos.length; i++) {
      const sig = sigInput[i]
      if (!sig) throw new Error(`交易签名失败：缺少第${i}个输入的签名`)
      tx.setInputScript({ inputIndex: i }, () => {
        const sig_length = (sig.length / 2).toString(16)
        const publicKey_length = (publicKey.toBuffer().toString('hex').length / 2).toString(16)
        return new tbc.Script(sig_length + sig + publicKey_length + publicKey.toString())
      })
    }
    // 广播交易
    const res = await API.broadcastTXraw(tx.uncheckedSerialize(), network)
    if (!res) throw new Error("交易广播失败");
    // 冻结成功提示
    successMessage.value = t('deposit_success')
    setTimeout(() => (successMessage.value = ''), 3000)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('冻结交易异常:', errMsg);
    submitErrorType.value = 'deposit_failed'
    errorMessage.value = t('deposit_failed')
    setTimeout(() => {
      errorMessage.value = ''
      submitErrorType.value = ''
    }, 5000)
  }
}

// 提交冻结资产
const handleDeposit = () => {
  submitErrorType.value = ''
  if (!validateAmount()) return
  if (!validateLockTime()) return
  freezeTBC()
}

</script>

<style scoped>
/* Base reset 已移到全局 src/style.css */
:deep(body) {
  background-color: var(--color-bg-light); /* 使用全局变量 */
  min-height: 100vh;
  margin: 0;
  padding: 20px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 全局容器样式 */
.home-container {
  max-width: 800px; /* 增加最大宽度 */
  margin: 0 auto;
  box-sizing: border-box;
}

/* 顶部导航 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px 0;
  min-width: 0; /* 允许子项在英文时收缩 */
}

.title {
  color: var(--color-text-primary); /* 使用全局变量 */
  font-size: 24px;
  font-weight: bold;
  margin: 0;
  word-break: break-word;
}

.query-btn {
  background: #d5e7fc;
  color: #3d3c63;
  padding: 10px 15px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;
}

.query-btn:hover {
  background: #a2d0fa;
  transform: translateY(-2px);
}

.lang-select {
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: var(--color-text-primary);
  font-size: 14px;
  padding: 0 8px;
}

/* 语言切换按钮已移到全局 src/style.css */

/* 存钱罐图片 */
.piggy-bank-img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
  margin-bottom: 1.25rem;
  max-height: 20rem;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

/* 冻结表单区域（高透明度+阴影，不透主题） */
.deposit-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
}

.deposit-section p {
  color: var(--color-text-primary);
  margin: 8px 0;
}

.deposit-section button:first-of-type {
  background: #a2d0fa;
  color: #3d3c63;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.deposit-section button:first-of-type:hover {
  background: #7bc1f7;
}

/* 表单基础样式已移到全局 src/style.css */

/* 表单输入框样式在组件级别扩展 */
.form-group input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid #eee;
  border-radius: var(--radius-sm);
  background: #ffffff;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
  color: #333 !important;
  caret-color: #333 !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input:focus {
  border-color: var(--blue-100);
  box-shadow: 0 0 0 2px var(--blue-focus);
}

/* 时间输入组（输入框+下拉组件） */
.time-input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
  flex-wrap: nowrap;
  width: 100%;
}

.time-input-group input {
  flex: 1;
  padding: 14px 16px;
  border: 1px solid #eee;
  border-radius: var(--radius-sm);
  font-size: 15px;
  background: #ffffff;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  -webkit-appearance: none;
  appearance: none;
}

.time-input-group input:focus {
  border-color: var(--blue-100);
  box-shadow: 0 0 0 2px var(--blue-focus);
}

/* 自定义下拉组件（带动画效果） */
.custom-select {
  position: relative;
  width: auto;
  min-width: 90px;
  display: flex;
  flex-direction: column;
}

/* 下拉选择器主容器 */
.select-value {
  padding: 14px 16px;
  padding-right: 40px;
  border: 1px solid #eee;
  border-radius: var(--radius-sm);
  font-size: 15px;
  background: #ffffff;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.25s ease;
  box-shadow: var(--shadow-sm);
}

.select-value span {
  color: var(--color-text-primary);
  white-space: nowrap;
}

/* 下拉箭头（带旋转动画） */
.select-icon {
  color: #666; /* 固定箭头颜色 */
  font-size: 12px;
  transition: transform 0.25s ease;
}

.select-icon.rotate {
  transform: rotate(180deg);
}

/* 下拉选项容器（带展开/收起动画） */
.select-options {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  border: 1px solid #eee;
  border-top: none;
  border-radius: 0 0 8px 8px;
  background: #ffffff; /* 纯色背景，避免主题透显 */
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: -1px;
  overflow: hidden;
}

/* 单个选项（带hover动画和入场延迟） */
.option-item {
  padding: var(--spacing-sm) 16px;
  cursor: pointer;
  color: var(--color-text-primary);
  transition: all 0.2s ease;
  transform: translateY(0);
  opacity: 1;
  animation: optionIn 0.2s ease-out forwards;
  opacity: 0;
  transform: translateY(5px);
}

.option-item:hover {
  background-color: #f0f5ff;
  color: #165dff;
  transform: translateX(4px);
}

/* 选项入场动画 */
@keyframes optionIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 每个选项的延迟动画（通过CSS变量控制） */
.option-item {
  animation-delay: var(--delay);
}

/* 下拉框展开/收起动画 */
.select-fade-enter-from {
  max-height: 0;
  opacity: 0;
}

.select-fade-enter-active {
  transition: all 0.3s ease-out;
}

.select-fade-enter-to {
  max-height: 200px;
  opacity: 1;
}

.select-fade-leave-from {
  max-height: 200px;
  opacity: 1;
}

.select-fade-leave-active {
  transition: all 0.2s ease-in;
}

.select-fade-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

/* 冻结按钮 */
.deposit-btn {
  width: 100%;
  padding: var(--spacing-sm);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #333;
  margin-top: 10px;
}

.deposit-btn:focus,
.deposit-btn:active {
  outline: none !important;
}

.deposit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 错误提示样式和动画已移到全局 src/style.css */

/* 错误状态下的下拉组件 */
.error-input + .custom-select .select-value {
  border-color: var(--color-error);
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1);
}

.error-input + .custom-select .select-icon {
  color: var(--color-error);
}

/* 下拉组件聚焦状态 */
.custom-select:focus-within .select-value {
  border-color: var(--blue-100);
  box-shadow: 0 0 0 2px var(--blue-focus);
}

/* 移动端响应式适配 */
@media (max-width: 768px) {
  .home-container {
    width: 95%;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  :deep(body) {
    padding: 15px;
  }

  .time-input-group {
    gap: 6px;
  }

  .time-input-group input {
    padding: 12px 14px;
    font-size: 14px;
  }

  .custom-select {
    min-width: 80px;
  }

  .select-value {
    padding: 12px 14px;
    padding-right: 36px;
    font-size: 14px;
  }

  .select-icon {
    right: 14px;
    font-size: 12px;
  }

  .option-item {
    padding: 10px 14px;
    font-size: 14px;
  }

  .deposit-btn {
    padding: 11px;
    font-size: clamp(14px, 4vw, 15px);
  }

  .query-btn,
  .lang-btn .lang-text {
    font-size: clamp(12px, 3.6vw, 14px);
  }

  .lang-btn {
    padding: 6px 10px;
  }
}

/* 自动填充样式已移到全局 src/style.css */
</style>