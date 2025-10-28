<template>
  <div class="home-container">
    <!-- 顶部导航 -->
    <header class="header">
      <h1 class="title">存钱罐</h1>
      <router-link to="/query" class="query-btn">
        解冻资产
      </router-link>
    </header>
    <!-- logo图片 -->
    <img src="../assets/piggy-bank.svg" alt="piggy-bank" class="piggy-bank-img">
    <!-- 钱包信息区域 -->
    <div class="deposit-section">
      <!-- 获取钱包地址、余额、区块高度 -->
      <!-- <button @click="getAddress">点击获取地址</button> -->
      <!-- 当前钱包地址 -->
      <template v-if="curAddress">
        <div class="form-group">
          <label>当前钱包地址</label>
          <input
            v-model="curAddress"
            disabled
          />
        </div>
        <div class="form-group">
          <label>当前钱包余额(TBC)</label>
          <input
            v-model="tbcBalance"
            disabled
          />
        </div>
        <div class="form-group">
          <label>当前区块高度</label>
          <input
            v-model="curBlockHeight"
            disabled
          />
        </div>
      </template>
      <!-- 冻结资产表单 -->
      <h2 class="title">冻结资产</h2>
      <form @submit.prevent="handleDeposit" class="deposit-form">
        <!-- 冻结金额 -->
        <div class="form-group">
          <label for="amount">金额 (TBC)</label>
          <input
            :class="errors.amountTip ? 'error-input' : ''"
            id="amount"
            v-model.number="formData.depositAmount"
            placeholder="请输入冻结金额"
            @input="validateAmount"
          />
          <Transition name="error-fade">
            <span class="error-message" v-if="errors.amountTip">{{ errors.amountTip }}</span>
          </Transition>
        </div>
        <div class="form-group">
          <!-- 自定义时间选择器 -->
          <TimePicker
            ref="timePicker"
            :currentBlockHeight="curBlockHeight"
            @update:lockTime="handleLockTimeChange"
          />
        </div>
        <button type="submit" class="deposit-btn" :disabled="!formData.depositAmount || formData.depositAmount <= 0">
          冻结
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import TimePicker from './time-picker.vue'
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
  amountTip: string
  timeTip: string
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
  amountTip: '',
  timeTip: ''
})

// 时间选择器引用
const timePicker = ref<InstanceType<typeof TimePicker>>()

// 页面挂载时获取数据
onMounted(async () => {
  // 钱包数据初始化
  await getWalletData()
  
  // 设置默认冻结时间（1小时后）
  if (timePicker.value) {
    timePicker.value.setDefaultTime()
  }
})

// 监听金额变化，实时校验
watch(
  () => formData.depositAmount, // 监听formData中的depositAmount属性
  () => {
    validateAmount()
  }
)

// 处理lockTime变化
const handleLockTimeChange = (lockTime: number) => {
  formData.lockTime = lockTime
}

// 冻结金额校验
const validateAmount = (): boolean => {
  errors.amountTip = ''
  const depositAmount = formData.depositAmount
  // 非空校验
  if (!depositAmount) {
    errors.amountTip = '请输入冻结金额'
    return false
  }
  // 正则校验
  const amountStr = depositAmount.toString()
  if (!Regex.freezeAmountReg.test(amountStr)) {
    errors.amountTip = '请输入正小数且最多精确到小数点后6位'
    return false
  }
  // 金额校验
  if (depositAmount > tbcBalance.value) {
    errors.amountTip = '冻结金额不能大于钱包余额'
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
    alert('请先安装Turing钱包')
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
    console.log('当前区块高度:', curBlockHeight.value)
  } catch (error) {
    console.error('获取当前区块高度失败:', error)
  }
}

// 构造冻结资产交易
const freezeTBC = async () => {
  const tbcNumber = formData.depositAmount
  const tbcAmount = Math.ceil(formData.depositAmount * Math.pow(10, 6));
  const lockTime = formData.lockTime
  
  console.log('冻结参数:')
  console.log('tbcNumber:', tbcNumber)
  console.log('tbcAmount:', tbcAmount)
  console.log('lockTime:', lockTime)
  console.log('curAddress:', curAddress.value)
  console.log('curBlockHeight:', curBlockHeight.value)
  
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
    console.log('获取到的UTXOs:', utxos)
    if (!utxos || utxos.length === 0) throw new Error("无可用UTXO支付手续费");
    
    // 检查UTXO数据结构
    utxos.forEach((utxo, index) => {
      console.log(`UTXO ${index}:`, {
        txId: utxo.txId,
        outputIndex: utxo.outputIndex,
        satoshis: utxo.satoshis,
        script: utxo.script,
        address: utxo.address
      })
    })
    // 未签名交易
    const freezeTx = piggyBank.freezeTBC(curAddress.value, tbcNumber, lockTime, utxos)
    console.log('freezeTx:', freezeTx)
    const tx = new tbc.Transaction(freezeTx)
    console.log('tx:', tx)
    // 交易签名
    const txRaw = tx.uncheckedSerialize()
    console.log('txRaw:', txRaw)
    txraws.push(txRaw) // 序列化未签名交易
    
    for(let i=0; i < utxos.length; i++) {
      utxos_satoshis[0]!.push(utxos[i]!.satoshis)
      script_pubkeys[0]!.push(utxos[i]!.script)
    }
    
    console.log('签名参数:')
    console.log('txraws:', txraws)
    console.log('utxos_satoshis:', utxos_satoshis)
    console.log('script_pubkeys:', script_pubkeys)
    
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
    
    console.log('参数验证通过，开始签名...')
    
    // 对交易进行签名
    const { sigs } = await window.Turing.signTransaction({
      txraws,
      utxos_satoshis,
      script_pubkeys
    })
    console.log('sigs:', sigs)
    if (!sigs || sigs.length === 0) throw new Error("交易签名失败");
    // 将签名添加到交易中，设置UTXO的解锁脚本
    for(let i = 0; i < utxos.length; i++) {
      tx.setInputScript({ inputIndex: i }, () => {
        const sig = sigs[i]![0]!
        const sig_length = (sig.length / 2).toString(16);
        const publicKey_length = (publicKey.toBuffer().toString('hex').length / 2).toString(16);
        return new tbc.Script(sig_length + sig + publicKey_length + publicKey.toString());
      })
    }
    API.broadcastTXraw(tx.uncheckedSerialize(), network)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('冻结交易异常（真实原因）:', errMsg);
    alert(`冻结失败：${errMsg}`); // 给用户显示真实错误
  }
}

// 提交冻结资产
const handleDeposit = () => {
  if (!validateAmount()) return
  
  // 检查是否选择了冻结时间
  if (!formData.lockTime) {
    alert('请选择冻结时间')
    return
  }
  
  // 校验时间选择器的有效性
  if (timePicker.value && !timePicker.value.validateTime()) {
    alert('请选择有效的冻结时间')
    return
  }
  
  freezeTBC()
}



</script>

<style scoped>
/* 全局基础样式 */
:deep(body) {
  background-color: #f5f7fa; /* 固定浅色基础背景，不继承浏览器主题 */
  min-height: 100vh;
  margin: 0;
  padding: 20px;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; /* 统一字体 */
}

/* 全局容器样式 */
.home-container {
  max-width: 500px; /* 限制最大宽度，优化大屏显示 */
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
}

.title {
  color: #3d3c63; /* 固定深色文字，不受主题影响 */
  font-size: 24px;
  font-weight: bold;
  margin: 0;
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
  background: rgba(255, 255, 255, 0.95); /* 高不透明度，几乎不透底 */
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* 兼容Safari */
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05); /* 增强层次感，弱化透底影响 */
}

.deposit-section p {
  color: #3d3c63;
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

/* 表单基础样式 */
.form-group {
  margin-bottom: 15px;
  margin-top: 10px;
}

.form-group label {
  display: block;
  color: #3d3c63;
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #eee; /* 固定浅灰色边框，不依赖主题 */
  border-radius: 8px;
  background: #ffffff; /* 纯色背景，完全不透底 */
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
  color: #333 !important; /* 固定输入文字色 */
  caret-color: #333 !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* 输入框聚焦状态 */
.form-group input:focus {
  border-color: #a2d0fa;
  box-shadow: 0 0 0 2px rgba(162, 208, 250, 0.3);
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
  border-radius: 8px;
  font-size: 15px;
  background: #ffffff;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  -webkit-appearance: none;
  appearance: none;
}

.time-input-group input:focus {
  border-color: #a2d0fa;
  box-shadow: 0 0 0 2px rgba(162, 208, 250, 0.3);
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
  border-radius: 8px;
  font-size: 15px;
  background: #ffffff; /* 纯色背景，不受主题影响 */
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.25s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.select-value span {
  color: #3d3c63;
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
  padding: 12px 16px;
  cursor: pointer;
  color: #3d3c63;
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
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fbd45c;
  color: #333;
  margin-top: 10px;
}

.deposit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.deposit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 错误提示样式 */
.error-message {
  color: #ff4d4f; /* 固定错误色，不受主题影响 */
  font-size: 0.875rem;
  margin-top: 4px;
  display: block;
}

.error-input {
  border: 1px solid #ff4d4f !important;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1) !important;
}

/* 错误状态下的下拉组件 */
.error-input + .custom-select .select-value {
  border-color: #ff4d4f;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.1);
}

.error-input + .custom-select .select-icon {
  color: #ff4d4f;
}

/* 下拉组件聚焦状态 */
.custom-select:focus-within .select-value {
  border-color: #a2d0fa;
  box-shadow: 0 0 0 2px rgba(162, 208, 250, 0.3);
}

/* 错误提示动画 */
.error-fade-enter-from {
  opacity: 0;
  transform: translateY(-5px);
}

.error-fade-enter-active {
  transition: all 0.3s ease;
}

.error-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.error-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.error-fade-leave-active {
  transition: all 0.3s ease;
}

.error-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* 移动端响应式适配 */
@media (max-width: 375px) {
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
    font-size: 15px;
  }
}

/* 自动填充样式：背景+文字色统一固定 */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active,
input:-internal-autofill-selected {
  /* 覆盖背景色（原有） */
  -webkit-box-shadow: 0 0 0 100px #ffffff inset !important;
  box-shadow: 0 0 0 100px #ffffff inset !important;
  background-color: #ffffff !important; /* 双重保障背景色 */
  /* 强制文字色（核心修改） */
  color: #333 !important; /* 固定文字色为深色 */
  -webkit-text-fill-color: #333 !important; /* 兼容Safari/Chrome */
  text-fill-color: #333 !important; /* 通用 fallback */
  /* 确保字体样式继承，避免文字模糊 */
  font-size: 16px !important; /* 与输入框正常字体大小一致 */
}

input:-webkit-autofill {
  /* 用足够大的内阴影覆盖背景色 */
  -webkit-box-shadow: 0 0 0 100px #ffffff inset !important;
  box-shadow: 0 0 0 100px #ffffff inset !important;
}
</style>