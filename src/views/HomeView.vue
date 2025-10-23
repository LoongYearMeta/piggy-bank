<template>
  <div class="home-container">
    <!-- 顶部导航 -->
    <header class="header">
      <h1 class="title">存钱罐</h1>
      <router-link to="/query" class="query-btn">
        解冻资产
      </router-link>
    </header>
    <img src="../assets/piggy-bank.svg" alt="piggy-bank" class="piggy-bank-img">

    <!-- 冻结资产表单 -->
    <div class="deposit-section">
      <!-- 获取钱包地址 -->
      <button v-if="!curAddress" @click="getAddress">点击获取地址</button>
      <p v-else>当前钱包地址: {{ curAddress }}</p>
      <p>钱包余额: {{ curBalance.toFixed(6) }} TBC</p>
      <!-- 冻结资产表单 -->
      <form @submit.prevent="handleDeposit" class="deposit-form">
        <!-- 冻结金额 -->
        <div class="form-group">
          <label for="amount">金额 (TBC)</label>
          <input
            :class="errors.amountTip ? 'error-input' : ''"
            id="amount"
            v-model.number="depositAmount"
            placeholder="请输入冻结金额"
            required
            @input="validateAmount"
          />
          <Transition name="error-fade">
            <span class="error-message" v-if="errors.amountTip">{{ errors.amountTip }}</span>
          </Transition>
        </div>
        <!-- 冻结时间 -->
        <div class="form-group">
          <label for="lockTime">冻结时间</label>
          <div class="time-input-group">
            <input
              id="lockTime"
              v-model.number="lockTime"
              step="1"
              min="1"
              placeholder="请输入冻结时间"
              required
              @input="validateTime"
            />
            <select
              v-model="lockTimeUnit"
              @change="validateTime"
              class="time-unit"
            >
              <option value="">请选择单位</option>
              <option value="day">日</option>
              <option value="week">周</option>
              <option value="month">月</option>
              <option value="year">年</option>
              <option value="block">区块</option>
            </select>
          </div>
          <Transition name="error-fade">
            <span class="error-message" v-if="errors.timeTip">{{ errors.timeTip }}</span>
          </Transition>
        </div>
        <!-- <span>对应区块高度</span> -->
        <!-- 备注 -->
        <div class="form-group">
          <label for="note">备注 (选填)</label>
          <input
            type="text"
            id="note"
            v-model="depositNote"
            placeholder="备注信息"
          />
        </div>
        <button type="submit" class="deposit-btn" :disabled="!depositAmount || depositAmount <= 0">
          冻结
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'

// 全局变量声明，声明Turing钱包的接口
declare global {
  interface Window {
    Turing: {
      connect(): Promise<void>,
      disconnect(): Promise<void>,
      isConnected(): Promise<boolean>,
      getPubKey(): Promise<{ tbcPubKey: string }>,
      getAddress(): Promise<{ tbcAddress: string}>,
      getBalance(): Promise<{ tbc: number }>
    }
  }
}

// 定义类型接口-错误消息
interface Errors {
  amountTip: string
  timeTip: string
}

type TimeUnit = 'day' | 'week' | 'month' | 'year' | 'block' | ''

const router = useRouter()

// 响应式数据
// 冻结金额
const depositAmount = ref<number | null>(null)
// 备注
const depositNote = ref('')
// 冻结时间
const lockTime = ref<number | null>(null)
// 冻结时间单位
const lockTimeUnit = ref<TimeUnit>('')
// 钱包余额
const curBalance = ref(0)
// 钱包地址-当前钱包地址的响应
const curAddress = ref('')
// 定义存储密钥的常量
const STORAGE_KEY = 'tbc_wallet_address'
// 错误信息
const errors = reactive<Errors>({
  amountTip: '',
  timeTip: ''
})

// 监听
watch(depositAmount, () => {
  validateAmount()
})

// 冻结金额校验
const validateAmount = ():boolean => {
  errors.amountTip = '' // 重置错误信息
  // 非空校验
  if (!depositAmount.value) {
    errors.amountTip = '请输入冻结金额'
    return false
  }
  // 非负校验
  if (depositAmount.value <= 0) {
    errors.amountTip = '冻结金额不能为负数'
    return false
  }
  // 精度校验（小数点后最多6位）
  const amountStr = depositAmount.value.toString()
  const decimalIndex = amountStr.indexOf('.')
  if (decimalIndex !== -1) {
    const decimalLength = amountStr.slice(decimalIndex + 1).length
    if (decimalLength > 6) {
      errors.amountTip = '金额最多精确到小数点后6位'
      return false
    }
  }
  // 余额校验
  if (depositAmount.value > curBalance.value) {
    errors.amountTip = '冻结金额不能大于钱包余额'
    return false
  }
  return true
}

// 冻结时间校验
const validateTime = ():boolean => {
  errors.timeTip = '' // 重置错误信息
  if (!lockTime.value || lockTime.value <= 0) {
    errors.timeTip = '请输入冻结时间'
    return false
  }
  return true
}
// 计算属性
  // const progressPercentage = computed(() => {
  //   if (targetAmount.value <= 0) return 0
  //   return Math.min((currentAmount.value / targetAmount.value) * 100, 100)
  // })

// 获取钱包地址
const getAddress = async () => {
  // 检查是否安装了Turing钱包
  if (!window.Turing) {
    alert('请先安装Turing钱包')
    return
  }
  try {
    await window.Turing.connect()
    const { tbcAddress } = await window.Turing.getAddress()
    localStorage.setItem(STORAGE_KEY, tbcAddress)
    curAddress.value = tbcAddress
    console.log('curAddress', curAddress.value)
    getBalance()
    // alert(`钱包地址已获取: ${tbcAddress}`)
  } catch (error) {
    console.error('获取钱包地址失败:', error)
    // alert('获取钱包地址失败，请重试')
  }
}

// 获取钱包余额
const getBalance = async () => {
  try {
    await window.Turing.getBalance()
    const { tbc } = await window.Turing.getBalance()
    curBalance.value = tbc
    console.log('curBalance', curBalance.value)
  } catch (error) {
    console.error('获取钱包余额失败:', error)
  }
}
// 提交冻结资产
const handleDeposit = () => {
  // 表单校验
  if (!depositAmount.value || depositAmount.value <= 0 || !lockTime.value || lockTime.value <= 0) {
    alert('请输入有效的冻结金额和冻结时间')
    return
  }
  if (depositAmount.value > curBalance.value) {
    alert('冻结金额不能大于钱包余额')
    return
  }

  // 添加存款记录
  const deposit = {
    id: Date.now().toString(),
    amount: depositAmount.value,
    note: depositNote.value,
    date: new Date().toISOString()
  }

  // 更新当前金额
  // currentAmount.value += depositAmount.value

  // 保存存款记录到本地存储
  const existingRecords = JSON.parse(localStorage.getItem('piggyBank_depositRecords') || '[]')
  existingRecords.push(deposit)
  localStorage.setItem('piggyBank_depositRecords', JSON.stringify(existingRecords))

  // 保存到本地存储
  // saveToLocalStorage()

  // 显示成功消息
  alert(`成功存入 ¥${depositAmount.value.toFixed(2)}`)

  // 重置表单
  depositAmount.value = null
  depositNote.value = ''
}

// const handleSetTarget = () => {
//   if (!newTargetAmount.value || newTargetAmount.value <= 0) {
//     alert('请输入有效的目标金额')
//     return
//   }

//   targetAmount.value = newTargetAmount.value
//   saveToLocalStorage()
//   alert(`目标金额设置为 ¥${newTargetAmount.value.toFixed(2)}`)
//   newTargetAmount.value = null
// }

// const saveToLocalStorage = () => {
//   localStorage.setItem('piggyBank_currentAmount', currentAmount.value.toString())
//   localStorage.setItem('piggyBank_targetAmount', targetAmount.value.toString())
// }

const loadFromLocalStorage = () => {
  // const savedCurrent = localStorage.getItem('piggyBank_currentAmount')
  // const savedTarget = localStorage.getItem('piggyBank_targetAmount')
  // if (savedCurrent) {
  //   currentAmount.value = parseFloat(savedCurrent)
  // }
  // if (savedTarget) {
  //   targetAmount.value = parseFloat(savedTarget)
  // }
}

onMounted(() => {
  loadFromLocalStorage()
})
</script>

<style scoped>
.home-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  /* background: linear-gradient(135deg, #e7af85 0%, #f77a1c 100%); */
}

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

.piggy-bank-img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
  margin-bottom: 1.25rem;
  max-height: 20rem;
}

.piggy-bank-section {
  text-align: center;
  margin-bottom: 30px;
}

.coin-slot {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 4px;
  background: #333;
  border-radius: 2px;
}

.progress-section {
  margin-top: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transition: width 0.5s ease;
}

.progress-text {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.amount-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.current-amount, .target-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.current-amount .amount {
  font-size: 24px;
  font-weight: bold;
  color: #ffd700;
}

.target-amount .amount {
  font-size: 18px;
  color: #a78bfa;
}

.label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.deposit-section, .target-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.deposit-section h2, .target-section h2 {
  color: #3d3c63;
  margin-bottom: 15px;
  font-size: 18px;
}

.form-group {
  margin-bottom: 15px;
  margin-top: 10px;
}

.form-group label {
  display: block;
  color: #3d3c63;
  margin-bottom: 5px;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  outline: none;
}

.deposit-btn, .target-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.deposit-btn {
  background: #fbd45c;
  color: #333;
}

.deposit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.deposit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.target-btn {
  background: linear-gradient(45deg, #a78bfa, #8b5cf6);
  color: white;
}

.target-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(167, 139, 250, 0.4);
}

input, select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.time-input-group {
  display: flex;
  gap: 8px;
}

.time-input-group input {
  flex: 1;
}

.time-unit {
  width: auto;
  padding: 8px 12px;
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
</style>