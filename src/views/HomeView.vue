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
      <button @click="getAddress">点击获取地址</button>
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
          <label>当前钱包余额</label>
          <input
            v-model="curBalance"
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
      <h2 class="deposit-title">冻结资产</h2>
      <form @submit.prevent="handleDeposit" class="deposit-form">
        <!-- 冻结金额 -->
        <div class="form-group">
          <label for="amount">金额 (TBC)</label>
          <input
            :class="errors.amountTip ? 'error-input' : ''"
            id="amount"
            v-model.number="depositAmount"
            placeholder="请输入冻结金额"

            @input="validateAmount"
          />
          <Transition name="error-fade">
            <span class="error-message" v-if="errors.amountTip">{{ errors.amountTip }}</span>
          </Transition>
        </div>
        <div class="form-group">
          <!-- 自定义时间选择器 -->
          <TimePicker ref="timePicker" />
        </div>

        <button type="submit" class="deposit-btn" :disabled="!depositAmount || depositAmount <= 0">
          冻结
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
// import { useRouter } from 'vue-router'
import TimePicker from './TimePicker.vue'
import { API } from 'tbc-contract'

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
    }
  }
}

// 类型定义
interface Errors {
  amountTip: string
  timeTip: string
}

// const router = useRouter()
// const timePickerRef = ref()

// 响应式数据
const depositAmount = ref<number | null>(null) // 冻结金额
const depositNote = ref('') // 备注
const lockTime = ref<number | null>(null) // 冻结时间（数值）
const selectedUnit = ref('') // 选中的时间单位
const curBalance = ref(100) // 钱包余额
const curAddress = ref('') // 钱包地址
const curBlockHeight = ref(0) // 区块高度
const STORAGE_KEY = 'tbc_wallet_address' // 本地存储密钥
const errors = reactive<Errors>({ // 错误提示
  amountTip: '',
  timeTip: ''
})

// 监听金额变化，实时校验
watch(depositAmount, () => {
  validateAmount()
})

// 冻结金额校验
const validateAmount = (): boolean => {
  errors.amountTip = ''
  if (!depositAmount.value) {
    errors.amountTip = '请输入冻结金额'
    return false
  }
  if (depositAmount.value <= 0) {
    errors.amountTip = '冻结金额不能为负数'
    return false
  }
  // 精度校验（最多6位小数）
  const amountStr = depositAmount.value.toString()
  const decimalIndex = amountStr.indexOf('.')
  if (decimalIndex !== -1 && amountStr.slice(decimalIndex + 1).length > 6) {
    errors.amountTip = '金额最多精确到小数点后6位'
    return false
  }
  if (depositAmount.value > curBalance.value) {
    errors.amountTip = '冻结金额不能大于钱包余额'
    return false
  }
  return true
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
    getBalance()
    getBlockHeight()
  } catch (error) {
    console.error('获取钱包地址失败:', error)
    alert('获取钱包地址失败，请重试')
  }
}

// 获取钱包余额
const getBalance = async () => {
  try {
    const tbc = await API.getTBCbalance(curAddress.value, 'testnet')
    curBalance.value = tbc / 1000000
  } catch (error) {
    console.error('获取钱包余额失败:', error)
    alert('获取钱包余额失败，请重试')
  }
}

// 获取当前区块高度
const getBlockHeight = async () => {
  try {
    const res = await API.fetchBlockHeaders('testnet')
    curBlockHeight.value = res[0]?.height || 0
  } catch (error) {
    console.error('获取当前区块高度失败:', error)
    alert('获取当前区块高度失败，请重试')
  }
}
// 提交冻结资产
const handleDeposit = () => {
  if (!validateAmount()) return

  // 构造冻结记录
  const depositRecord = {
    id: Date.now().toString(),
    amount: depositAmount.value,
    note: depositNote.value,
    lockTime: lockTime.value,
    lockUnit: selectedUnit.value,
    date: new Date().toISOString(),
    address: curAddress.value
  }

  // 保存到本地存储
  const existingRecords = JSON.parse(localStorage.getItem('piggyBank_depositRecords') || '[]')
  existingRecords.push(depositRecord)
  localStorage.setItem('piggyBank_depositRecords', JSON.stringify(existingRecords))

  // 提示成功并重置表单
  // alert(`
  //   冻结成功！
  //   金额：${depositAmount.value.toFixed(6)} TBC
  //   时间：${lockTime.value}${selectedUnit.value}
  // `)
  depositAmount.value = null
  depositNote.value = ''
  lockTime.value = null
  selectedUnit.value = ''
}

// 页面挂载时加载数据
const loadFromLocalStorage = () => {
  // 可添加表单状态恢复逻辑
}

onMounted(() => {
  loadFromLocalStorage()
})
</script>

<style scoped>
/* 全局容器样式 */
.home-container {
  max-width: 100vw;
  margin: 0 auto;
  /* min-height: 100vh; */
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
  color: #3d3c63;
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

/* 冻结表单区域 */
.deposit-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
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
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
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
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  background: #fff;
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
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  background: #fff;
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
  color: #666;
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
  background: #fff;
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
  color: #ff4d4f;
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
</style>