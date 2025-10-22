<template>
  <div class="home-container">
    <!-- 顶部导航 -->
    <header class="header">
      <h1 class="title">💰 存钱罐</h1>
      <router-link to="/query" class="query-btn">
        📊 查看记录
      </router-link>
    </header>

    <!-- 存钱罐显示区域 -->
    <div class="piggy-bank-section">
      <!-- <div class="piggy-bank">
        <div class="piggy-bank-body">
          <div class="piggy-bank-face">
            <div class="eyes">
              <div class="eye left"></div>
              <div class="eye right"></div>
            </div>
            <div class="nose"></div>
            <div class="mouth"></div>
          </div>
        </div>
        <div class="coin-slot"></div>
      </div> -->
      <!-- 进度条 -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <p class="progress-text">存钱进度: {{ progressPercentage.toFixed(1) }}%</p>
      </div>
    </div>

    <!-- 金额显示 -->
    <div class="amount-section">
      <div class="current-amount">
        <span class="label">当前金额</span>
        <span class="amount">¥{{ currentAmount.toFixed(2) }}</span>
      </div>
      <div class="target-amount" v-if="targetAmount > 0">
        <span class="label">目标金额</span>
        <span class="amount">¥{{ targetAmount.toFixed(2) }}</span>
      </div>
    </div>

    <!-- 存钱表单 -->
    <div class="deposit-section">
      <h2>存入金额</h2>
      <form @submit.prevent="handleDeposit" class="deposit-form">
        <div class="form-group">
          <label for="amount">金额 (元)</label>
          <input 
            type="number" 
            id="amount"
            v-model.number="depositAmount" 
            step="0.01"
            min="0.01"
            placeholder="请输入金额"
            required
          />
        </div>
        <div class="form-group">
          <label for="note">备注 (可选)</label>
          <input 
            type="text" 
            id="note"
            v-model="depositNote" 
            placeholder="备注信息"
          />
        </div>
        <button type="submit" class="deposit-btn" :disabled="!depositAmount || depositAmount <= 0">
          💰 存入
        </button>
      </form>
    </div>

    <!-- 设置目标 -->
    <div class="target-section">
      <h2>设置目标</h2>
      <form @submit.prevent="handleSetTarget" class="target-form">
        <div class="form-group">
          <label for="target">目标金额 (元)</label>
          <input 
            type="number" 
            id="target"
            v-model.number="newTargetAmount" 
            step="0.01"
            min="0.01"
            placeholder="请输入目标金额"
            required
          />
        </div>
        <button type="submit" class="target-btn">
          🎯 设置目标
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const currentAmount = ref(0)
const targetAmount = ref(0)
const depositAmount = ref<number | null>(null)
const depositNote = ref('')
const newTargetAmount = ref<number | null>(null)

// 计算属性
const progressPercentage = computed(() => {
  if (targetAmount.value <= 0) return 0
  return Math.min((currentAmount.value / targetAmount.value) * 100, 100)
})

// 方法
const handleDeposit = () => {
  if (!depositAmount.value || depositAmount.value <= 0) {
    alert('请输入有效的金额')
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
  currentAmount.value += depositAmount.value

  // 保存存款记录到本地存储
  const existingRecords = JSON.parse(localStorage.getItem('piggyBank_depositRecords') || '[]')
  existingRecords.push(deposit)
  localStorage.setItem('piggyBank_depositRecords', JSON.stringify(existingRecords))

  // 保存到本地存储
  saveToLocalStorage()

  // 显示成功消息
  alert(`成功存入 ¥${depositAmount.value.toFixed(2)}`)

  // 重置表单
  depositAmount.value = null
  depositNote.value = ''
}

const handleSetTarget = () => {
  if (!newTargetAmount.value || newTargetAmount.value <= 0) {
    alert('请输入有效的目标金额')
    return
  }

  targetAmount.value = newTargetAmount.value
  saveToLocalStorage()
  alert(`目标金额设置为 ¥${newTargetAmount.value.toFixed(2)}`)
  newTargetAmount.value = null
}

const saveToLocalStorage = () => {
  localStorage.setItem('piggyBank_currentAmount', currentAmount.value.toString())
  localStorage.setItem('piggyBank_targetAmount', targetAmount.value.toString())
}

const loadFromLocalStorage = () => {
  const savedCurrent = localStorage.getItem('piggyBank_currentAmount')
  const savedTarget = localStorage.getItem('piggyBank_targetAmount')
  
  if (savedCurrent) {
    currentAmount.value = parseFloat(savedCurrent)
  }
  if (savedTarget) {
    targetAmount.value = parseFloat(savedTarget)
  }
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px 0;
}

.title {
  color: white;
  font-size: 24px;
  font-weight: bold;
}

.query-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 10px 15px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.3s ease;
}

.query-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.piggy-bank-section {
  text-align: center;
  margin-bottom: 30px;
}

.piggy-bank {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  border-radius: 50%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: bounce 2s infinite;
}

.piggy-bank-body {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.piggy-bank-face {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.eyes {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.eye {
  width: 12px;
  height: 12px;
  background: #333;
  border-radius: 50%;
  animation: blink 3s infinite;
}

.nose {
  width: 8px;
  height: 6px;
  background: #ff6b6b;
  border-radius: 50%;
  margin: 0 auto 5px;
}

.mouth {
  width: 20px;
  height: 10px;
  border: 2px solid #333;
  border-top: none;
  border-radius: 0 0 20px 20px;
  margin: 0 auto;
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
  color: white;
  margin-bottom: 15px;
  font-size: 18px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
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
  background: linear-gradient(45deg, #ffd700, #ffed4e);
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

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

@keyframes blink {
  0%, 90%, 100% {
    transform: scaleY(1);
  }
  95% {
    transform: scaleY(0.1);
  }
}
</style>