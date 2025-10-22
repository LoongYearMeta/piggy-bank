<template>
  <div class="query-container">
    <!-- 顶部导航 -->
    <header class="header">
      <router-link to="/" class="back-btn">
        ← 返回
      </router-link>
      <h1 class="title">📊 存款记录</h1>
      <div class="placeholder"></div>
    </header>

    <!-- 统计概览 -->
    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-value">¥{{ totalAmount.toFixed(2) }}</div>
        <div class="stat-label">总存款</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ depositRecords.length }}</div>
        <div class="stat-label">存款次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">¥{{ averageAmount.toFixed(2) }}</div>
        <div class="stat-label">平均金额</div>
      </div>
    </div>

    <!-- 筛选和排序 -->
    <div class="filter-section">
      <div class="filter-group">
        <label>按时间排序:</label>
        <select v-model="sortBy" @change="sortRecords">
          <option value="newest">最新优先</option>
          <option value="oldest">最早优先</option>
        </select>
      </div>
      <div class="filter-group">
        <label>金额范围:</label>
        <select v-model="amountFilter" @change="filterRecords">
          <option value="all">全部</option>
          <option value="small">小于50元</option>
          <option value="medium">50-200元</option>
          <option value="large">大于200元</option>
        </select>
      </div>
    </div>

    <!-- 存款记录列表 -->
    <div class="records-section">
      <h2>存款记录</h2>
      <div v-if="filteredRecords.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <p>暂无存款记录</p>
        <router-link to="/" class="start-btn">开始存钱</router-link>
      </div>
      
      <div v-else class="records-list">
        <div 
          v-for="record in filteredRecords" 
          :key="record.id" 
          class="record-item"
        >
          <div class="record-header">
            <div class="record-amount">+¥{{ record.amount.toFixed(2) }}</div>
            <div class="record-date">{{ formatDate(record.date) }}</div>
          </div>
          <div v-if="record.note" class="record-note">
            {{ record.note }}
          </div>
          <div class="record-time">
            {{ formatTime(record.date) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 清空记录按钮 -->
    <div v-if="depositRecords.length > 0" class="clear-section">
      <button @click="clearAllRecords" class="clear-btn">
        🗑️ 清空所有记录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 响应式数据
const depositRecords = ref<Array<{
  id: string
  amount: number
  note: string
  date: string
}>>([])
const sortBy = ref('newest')
const amountFilter = ref('all')

// 计算属性
const totalAmount = computed(() => {
  return depositRecords.value.reduce((sum, record) => sum + record.amount, 0)
})

const averageAmount = computed(() => {
  if (depositRecords.value.length === 0) return 0
  return totalAmount.value / depositRecords.value.length
})

const filteredRecords = computed(() => {
  let records = [...depositRecords.value]

  // 按金额筛选
  if (amountFilter.value !== 'all') {
    records = records.filter(record => {
      switch (amountFilter.value) {
        case 'small':
          return record.amount < 50
        case 'medium':
          return record.amount >= 50 && record.amount <= 200
        case 'large':
          return record.amount > 200
        default:
          return true
      }
    })
  }

  // 按时间排序
  records.sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    return sortBy.value === 'newest' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
  })

  return records
})

// 方法
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const sortRecords = () => {
  // 排序逻辑在计算属性中处理
}

const filterRecords = () => {
  // 筛选逻辑在计算属性中处理
}

const clearAllRecords = () => {
  if (confirm('确定要清空所有存款记录吗？此操作不可恢复！')) {
    depositRecords.value = []
    localStorage.removeItem('piggyBank_depositRecords')
    alert('所有记录已清空')
  }
}

const loadRecords = () => {
  const saved = localStorage.getItem('piggyBank_depositRecords')
  if (saved) {
    depositRecords.value = JSON.parse(saved)
  }
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.query-container {
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

.back-btn {
  color: white;
  text-decoration: none;
  font-size: 16px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.title {
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.placeholder {
  width: 60px;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px 15px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.stat-value {
  color: white;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.filter-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.filter-group {
  margin-bottom: 15px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
  font-size: 14px;
}

.filter-group select {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  outline: none;
}

.records-section {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.records-section h2 {
  color: white;
  margin-bottom: 20px;
  font-size: 18px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 15px;
}

.empty-state p {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 20px;
}

.start-btn {
  display: inline-block;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #333;
  padding: 12px 24px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
}

.records-list {
  max-height: 400px;
  overflow-y: auto;
}

.record-item {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 10px;
  border-left: 4px solid #ffd700;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.record-amount {
  color: #ffd700;
  font-size: 18px;
  font-weight: bold;
}

.record-date {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.record-note {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  margin-bottom: 5px;
  font-style: italic;
}

.record-time {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
}

.clear-section {
  text-align: center;
}

.clear-btn {
  background: linear-gradient(45deg, #ff6b6b, #ee5a52);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
}

/* 滚动条样式 */
.records-list::-webkit-scrollbar {
  width: 6px;
}

.records-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.records-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.records-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>