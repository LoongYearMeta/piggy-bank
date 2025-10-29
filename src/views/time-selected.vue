<template>
  <div class="time-selected">
    <div class="form-group">
      <label class="label">存储期限</label>
      <!-- 触发按钮（淡蓝色），点击后弹出选项面板，按钮上回显选择结果 -->
      <div class="select-trigger" ref="triggerRef">
        <button type="button" class="trigger-btn" @click="togglePanel" :aria-expanded="isOpen">
          <span>{{ selectedLabel }}</span>
          <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6z"/>
          </svg>
        </button>
        <Transition name="panel-fade">
          <div v-if="isOpen" ref="panelRef" class="panel" :class="{ above: isAbove }" role="listbox" aria-label="选择存储期限" :style="panelInlineStyle">
            <button
              v-for="opt in options"
              :key="opt.key"
              type="button"
              class="panel-item"
              :class="{ active: opt.key === selectedKey }"
              @click="pickAndClose(opt.key)"
              :aria-selected="opt.key === selectedKey"
              role="option"
            >
              {{ opt.label }}
            </button>
          </div>
        </Transition>
      </div>
    </div>

    <div class="row preview" v-if="selectedKey">
      <div class="preview-item">
        <span class="preview-label">到期日期</span>
        <span class="preview-value">{{ dueDateStr }}</span>
      </div>
      <div class="preview-item">
        <span class="preview-label">到期区块高度</span>
        <span class="preview-value">{{ lockBlockHeight }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue'
import { API } from 'tbc-contract'

// props: 接收父组件当前地址与网络（与旧组件保持一致的依赖来源）
const props = defineProps<{
  address?: string
  network?: string | undefined
}>()

// emit: 向父组件回传 lockTime（区块高度）与展示日期
const emit = defineEmits<{
  (e: 'update:lockTime', value: number): void
  (e: 'update:dateText', value: string): void
}>()

const options = [
  { key: '1d', label: '1天', days: 1 },
  { key: '1w', label: '1周', days: 7 },
  { key: '1m', label: '1个月', months: 1 },
  { key: '3m', label: '3个月', months: 3 },
  { key: '6m', label: '6个月', months: 6 },
  { key: '1y', label: '1年', years: 1 },
  { key: '2y', label: '2年', years: 2 },
  { key: '3y', label: '3年', years: 3 },
  { key: '5y', label: '5年', years: 5 },
  { key: '10y', label: '10年', years: 10 },
  { key: '20y', label: '20年', years: 20 }
]

const selectedKey = ref<string>('')
const isOpen = ref(false)
const isAbove = ref(false)
const panelMaxPx = ref(320)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const currentBlockHeight = ref<number>(0)

onMounted(async () => {
  await refreshCurrentBlock()
  window.addEventListener('resize', handleViewportChange, { passive: true })
  window.addEventListener('scroll', handleViewportChange, { passive: true })
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onOutsideClick, true)
})

watch(selectedKey, () => {
  emit('update:lockTime', lockBlockHeight.value)
  emit('update:dateText', dueDateStr.value)
})

// 保留占位（若未来需要外部复用），当前未使用

function pickAndClose(key: string) {
  selectedKey.value = key
  isOpen.value = false
}

const selectedLabel = computed(() => {
  const opt = options.find(o => o.key === selectedKey.value)
  return opt ? opt.label : '请选择存储期限'
})

function togglePanel() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      updatePanelPlacement()
      // 点击外部收起
      document.addEventListener('click', onOutsideClick, true)
    })
  } else {
    document.removeEventListener('click', onOutsideClick, true)
  }
}

function onOutsideClick(e: MouseEvent) {
  const t = triggerRef.value
  const p = panelRef.value
  const target = e.target as Node
  if (t && t.contains(target)) return
  if (p && p.contains(target)) return
  isOpen.value = false
  document.removeEventListener('click', onOutsideClick, true)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    isOpen.value = false
  }
}

function handleViewportChange() {
  if (!isOpen.value) return
  updatePanelPlacement()
}

function updatePanelPlacement() {
  const el = triggerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const viewportH = window.innerHeight
  const spaceBelow = viewportH - rect.bottom - 12
  const spaceAbove = rect.top - 12
  // 预期面板高度（取 320px 或 60vh 中较小者）
  const desired = Math.min(0.6 * viewportH, panelMaxPx.value)
  isAbove.value = spaceBelow < 240 && spaceAbove > spaceBelow
  // 计算可用最大高度
  const maxH = Math.max(240, Math.min(desired, isAbove.value ? spaceAbove : spaceBelow))
  panelMaxPx.value = Math.floor(maxH)
}

const panelInlineStyle = computed(() => {
  return {
    maxHeight: panelMaxPx.value + 'px',
    overflowY: 'auto'
  } as Record<string, string>
})

async function refreshCurrentBlock() {
  try {
    const res = await API.fetchBlockHeaders(props.network)
    currentBlockHeight.value = res?.[0]?.height || 0
  } catch (err) {
    currentBlockHeight.value = 0
  }
}

// 计算到期的日期（精确到日，采用本地时区的 0 点）
const dueDate = computed<Date>(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()) // 今天 0 点
  const opt = options.find(o => o.key === selectedKey.value)
  if (!opt) return start

  const target = new Date(start)
  if (opt.days) {
    target.setDate(target.getDate() + opt.days)
  }
  if (opt.months) {
    target.setMonth(target.getMonth() + opt.months)
  }
  if (opt.years) {
    target.setFullYear(target.getFullYear() + opt.years)
  }
  return target
})

const dueDateStr = computed(() => {
  const d = dueDate.value
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

// 根据日期 0 点换算区块高度：以当前区块高度与当前时间为基准，10 分钟一个块
const lockBlockHeight = computed<number>(() => {
  if (!currentBlockHeight.value) return 0
  const now = new Date()
  const msPerBlock = 10 * 60 * 1000
  const target = dueDate.value // 已经是 0 点
  const diffMs = target.getTime() - now.getTime()
  const blocks = Math.ceil(diffMs / msPerBlock)
  const height = currentBlockHeight.value + blocks
  return height > 0 ? height : currentBlockHeight.value // 若已到期则不降到负，保持当前高度
})
</script>

<style scoped>
input,
button,
select {
  border: none;
  outline: none;
  /* border: 1px solid transparent; */
}
.time-selected {
  display: flex;
  flex-direction: column;
  gap: 10px;
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

/* 触发按钮与面板（固定浅色系，不受主题影响） */
.select-trigger {
  position: relative;
  width: 100%;
}

.trigger-btn {
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  color: #3d3c63;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.trigger-btn:hover {
  background: #eaf3ff;
  border-color: #d7e6fb;
}

.chevron {
  width: 18px;
  height: 18px;
  color: #666;
}

.panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e6eefb;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.06);
  padding: 8px;
  z-index: 1000;
  /* 自定义滚动条（不受浏览器主题影响） */
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: #a8ccff #eef5ff; /* thumb track */
  overscroll-behavior: contain;
}

.panel.above {
  top: auto;
  bottom: calc(100% + 6px);
}

.panel-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #3d3c63;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.panel-item:hover {
  background: #f4f9ff;
}

.panel-item.active {
  border-color: #409eff;
  background: #e6f2ff;
}

/* 面板过渡 */
.panel-fade-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.panel-fade-enter-active {
  transition: all 0.15s ease;
}
.panel-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}
.panel-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.panel-fade-leave-active {
  transition: all 0.12s ease;
}
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* 小屏优化：限制面板高度、保持最小字体与可滚动 */
@media (max-width: 480px) {
  .trigger-btn { font-size: 14px; }
  .panel { max-height: 60vh; overflow: auto; }
  .panel-item { font-size: 14px; }
}

/* WebKit 滚动条样式（Chromium/Safari/Edge） */
.panel::-webkit-scrollbar {
  width: 6px;
}

.panel::-webkit-scrollbar-track {
  background: #eef5ff;
  border-radius: 4px;
}

.panel::-webkit-scrollbar-thumb {
  background: #c9dfff;
  border-radius: 4px;
}

.panel::-webkit-scrollbar-thumb:hover {
  background: #a8ccff;
}


.preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.preview-item {
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  padding: 10px 12px;
}

.preview-label {
  color: #666;
  font-size: 12px;
}

.preview-value {
  color: #3d3c63;
  font-weight: 600;
  display: inline-block;
  margin-left: 8px;
}
</style>

