<template>
  <div class="query-container">
    <!-- 顶部导航 -->
    <header class="header">
      <router-link to="/" class="back-btn">
        返回
      </router-link>
      <h1 class="title">存储明细</h1>
      <div class="placeholder"></div>
    </header>

    <!-- 钱包信息区域 -->
    <div class="wallet-section">
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
    </div>

    <!-- 资产统计概览 -->
    <div class="stats-section">
      <div class="stat-card frozen">
        <div class="stat-value">{{ (frozenTotal / 1000000).toFixed(6) }}</div>
        <div class="stat-label">已存储未到期资产总额 (TBC)</div>
      </div>
      <div class="stat-card unfrozen">
        <div class="stat-value">{{ unfrozenTotal }}</div>
        <div class="stat-label">存储到期可提取资产总额 (TBC)</div>
      </div>
    </div>

    <!-- 可解冻资产列表 -->
    <div class="unfrozen-section">
      <h2 class="section-title">存储到期可提取资产</h2>
      <p class="section-description">存储到期时间以区块高度为准</p>
      <div v-if="unfrozenAssets.length === 0" class="empty-state">
        <!-- <div class="empty-icon">🔒</div> -->
        <img src="../assets/empty.svg" class="empty-icon"></img>
        <p>暂无可提取资产</p>
      </div>

      <div v-else class="assets-list">
        <div
          v-for="asset in unfrozenAssets"
          :key="asset.txId + '-' + asset.outputIndex"
          class="asset-card unfrozen-card"
        >
          <div class="asset-header">
            <div class="asset-amount">{{ (asset.satoshis / 1000000).toFixed(6) }} TBC</div>
            <button
              @click="unfreezeAsset(asset)"
              class="unfreeze-btn"
              :disabled="isUnfreezing"
            >
              {{ isUnfreezing ? '解冻中...' : '解冻' }}
            </button>
          </div>
          <div class="asset-info">
            <div class="info-item">
              <span class="info-label">存储到期时间:</span>
              <span class="info-value">{{ asset.lockTime || '解码失败' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">区块高度:</span>
              <span class="info-value">{{ asset.lockTime || '解码失败' }}</span>
            </div>
            <div v-if="asset.decodeError" class="info-item error">
              <span class="info-label">解码错误:</span>
              <span class="info-value">{{ asset.decodeError }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 已冻结资产列表 -->
    <div class="frozen-section">
      <h2 class="section-title">已存储未到期资产</h2>
      <p class="section-description">存储到期时间以区块高度为准</p>
      <div v-if="frozenAssets.length === 0" class="empty-state">
        <img src="../assets/empty.svg" class="empty-icon"></img>
        <p>暂无已冻结资产</p>
      </div>

      <div v-else class="assets-list">
        <div
          v-for="asset in frozenAssets"
          :key="asset.txId + '-' + asset.outputIndex"
          class="asset-card frozen-card"
        >
          <div class="asset-header">
            <div class="asset-amount">{{ (asset.satoshis / 1000000).toFixed(6) }} TBC</div>
            <div class="status-badge frozen">已冻结</div>
          </div>
          <div class="asset-info">
            <div class="info-item">
              <span class="info-label">存储到期时间:</span>
              <span class="info-value">{{ asset.lockTime || '解码失败' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">区块高度:</span>
              <span class="info-value">{{ asset.lockTime || '解码失败' }}</span>
            </div>
            <div v-if="asset.decodeError" class="info-item error">
              <span class="info-label">解码错误:</span>
              <span class="info-value">{{ asset.decodeError }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误提示 -->
    <Transition name="error-fade">
      <span class="error-message" v-if="errorMessage">{{ errorMessage }}</span>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API } from 'tbc-contract'
// @ts-ignore
import piggyBank from 'tbc-contract/lib/contract/piggyBank.js'
import * as tbc from "tbc-lib-js";
// 移除 Buffer 导入，使用原生方法

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

// 响应式数据
const network = import.meta.env.VITE_NETWORK || undefined // 网络环境
const tbcBalance = ref(0) // 钱包余额
const curAddress = ref('') // 钱包地址
const curBlockHeight = ref(0) // 当前区块高度
const frozenAssets = ref<any[]>([]) // 已冻结资产
const unfrozenAssets = ref<any[]>([]) // 可解冻资产
const frozenTotal = ref(0) // 已冻结总额
const unfrozenTotal = ref(0) // 可解冻总额
const errorMessage = ref('') // 错误信息
const isUnfreezing = ref(false) // 是否正在解冻

// 其他数据-本地存储
const STORAGE_KEY = 'tbc_wallet_address' // 本地存储密钥

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
    return (bytes[0] || 0) | ((bytes[1] || 0) << 8) | ((bytes[2] || 0) << 16) | ((bytes[3] || 0) << 24);
  } catch (error) {
    console.error('读取锁定时间失败:', error);
    // 如果解析失败，返回 0
    return 0;
  }
}

// 页面挂载时获取数据
onMounted(async () => {
  await getWalletData()
  await loadAssets()
})

// 获取钱包数据
const getWalletData = async () => {
  await getAddress()
  await getBalance()
  await getBlockHeight()
}

// 获取钱包地址
const getAddress = async () => {
  if (!window.Turing) {
    errorMessage.value = '请先安装Turing钱包'
    return
  }
  try {
    await window.Turing.connect()
    const { tbcAddress } = await window.Turing.getAddress()
    localStorage.setItem(STORAGE_KEY, tbcAddress)
    curAddress.value = tbcAddress
  } catch (error) {
    console.error('获取钱包地址失败:', error)
    errorMessage.value = '获取钱包地址失败'
  }
}

// 获取钱包余额
const getBalance = async () => {
  try {
    const tbc = await API.getTBCbalance(curAddress.value, network)
    tbcBalance.value = tbc / 1000000
  } catch (error) {
    console.error('获取钱包余额失败:', error)
    errorMessage.value = '获取钱包余额失败'
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
    errorMessage.value = '获取当前区块高度失败'
  }
}

// 加载资产数据
const loadAssets = async () => {
  if (!curAddress.value) return
  try {
    errorMessage.value = ''
    // 获取已冻结的TBC余额
    frozenTotal.value = await API.fetchFrozenTBCBalance(curAddress.value, network)
    console.log('已冻结资产总额:', frozenTotal)

    // 获取已冻结的UTXO列表
    const frozenList = await API.fetchFrozenUTXOList(curAddress.value, network)
    console.log('原始已冻结资产:', frozenList)
    
    // 解码锁定时间并构建新的资产数据结构
    const processedFrozenAssets: any[] = []
    if (frozenList && frozenList.length > 0) {
      frozenList.forEach((utxo, index) => {
        try {
          // 校验脚本长度
          if (!utxo.script || utxo.script.length !== 106) {
            throw new Error("Invalid Piggy Bank script")
          }
          
          // 解码锁定时间
          const script = tbc.Script.fromString(utxo.script)
          const lockTimeChunk = script.chunks![script.chunks!.length - 8]!.buf
          
          if (!lockTimeChunk) {
            throw new Error("Lock time chunk not found");
          }
          
          // 校验chunk长度（确保能正确读取32位整数）
          if (lockTimeChunk.length !== 4) {
            throw new Error(`Lock time chunk length invalid (expected 4, got ${lockTimeChunk.length})`);
          }
          
          // 解码锁定时间
          const lockTime = decodeLockTime(lockTimeChunk)
          console.log(`资产 ${index} 锁定时间:`, lockTime)
          
          // 创建包含解码后lockTime的资产对象
          const processedAsset = {
            ...utxo, // 保留原始UTXO数据
            lockTime: lockTime, // 添加解码后的锁定时间
            isUnfrozen: lockTime <= curBlockHeight.value // 判断是否可解冻
          }
          
          processedFrozenAssets.push(processedAsset)
        } catch (error) {
          console.error(`解码资产 ${index} 锁定时间失败:`, error)
          // 即使解码失败，也保留原始数据，但标记为错误状态
          processedFrozenAssets.push({
            ...utxo,
            lockTime: 0,
            isUnfrozen: false,
            decodeError: error instanceof Error ? error.message : String(error)
          })
        }
      })
    }
    
    // 更新已冻结资产列表
    frozenAssets.value = processedFrozenAssets
    
    // 分离可解冻和已冻结的资产
    unfrozenAssets.value = processedFrozenAssets.filter(asset => asset.isUnfrozen)
    frozenAssets.value = processedFrozenAssets.filter(asset => !asset.isUnfrozen)
    
    // 计算总额
    frozenTotal.value = frozenAssets.value.reduce((sum, asset) => sum + asset.satoshis, 0) / 1000000
    unfrozenTotal.value = unfrozenAssets.value.reduce((sum, asset) => sum + asset.satoshis, 0) / 1000000
    
    console.log('已冻结资产:', frozenAssets.value)
    console.log('可解冻资产:', unfrozenAssets.value)
  } catch (error) {
    console.error('加载资产失败:', error)
    errorMessage.value = '加载资产失败'
  }
}

// 解冻资产
const unfreezeAsset = async (asset: any) => {
  if (isUnfreezing.value) return
  try {
    isUnfreezing.value = true
    errorMessage.value = ''
    // 获取公钥
    const { tbcPubKey } = await window.Turing.getPubKey()
    const publicKey = new tbc.PublicKey(tbcPubKey)
    // 构造解冻交易
    const unfreezeTx = await piggyBank.unfreezeTBC(curAddress.value, [asset], network)
    const tx = new tbc.Transaction(unfreezeTx)
    // 准备签名参数
    const utxos_satoshis: number[][] = [[asset.satoshis]]
    const script_pubkeys: string[][] = [[asset.script]]
    const txraws: string[] = [tx.uncheckedSerialize()]
    // 对交易进行签名
    const { sigs } = await window.Turing.signTransaction({
      txraws,
      utxos_satoshis,
      script_pubkeys
    })
    if (!sigs || sigs.length === 0) throw new Error("交易签名失败")
    // 将签名添加到交易中
    tx.setInputScript({ inputIndex: 0 }, () => {
      const sig = sigs[0]![0]!
      const sig_length = (sig.length / 2).toString(16)
      const publicKey_length = (publicKey.toBuffer().toString('hex').length / 2).toString(16)
      return new tbc.Script(sig_length + sig + publicKey_length + publicKey.toString())
    })
    // 广播交易
    await API.broadcastTXraw(tx.uncheckedSerialize(), network)
    // 重新加载资产数据
    await loadAssets()
    alert('解冻成功！')
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('解冻失败:', errMsg)
    errorMessage.value = `解冻失败：${errMsg}`
  } finally {
    isUnfreezing.value = false
  }
}

</script>

<style scoped>
/* 全局基础样式 */
:deep(body) {
  background-color: #f5f7fa;
  min-height: 100vh;
  margin: 0;
  padding: 25px; /* 加大页面内边距 */
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 全局容器样式 */
.query-container {
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
  color: #3d3c63;
  font-size: 28px; /* 加大标题字体 */
  font-weight: bold;
  margin: 0;
}

.back-btn {
  background: #d5e7fc;
  color: #3d3c63;
  padding: 12px 20px; /* 加大按钮内边距 */
  border-radius: 20px;
  text-decoration: none;
  font-size: 16px; /* 加大按钮字体 */
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: #a2d0fa;
  transform: translateY(-2px);
}

.placeholder {
  width: 80px; /* 加大占位宽度 */
}

/* 钱包信息区域 */
.wallet-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 25px; /* 加大内边距 */
  margin-bottom: 25px; /* 加大底部外边距 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
}

/* 表单基础样式 */
.form-group {
  margin-bottom: 20px; /* 加大底部外边距 */
  margin-top: 15px; /* 加大顶部外边距 */
}

.form-group label {
  display: block;
  color: #3d3c63;
  margin-bottom: 8px; /* 加大底部外边距 */
  font-size: 15px; /* 加大标签字体 */
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 15px; /* 加大输入框内边距 */
  border: 1px solid #eee;
  border-radius: 8px;
  background: #ffffff;
  font-size: 18px; /* 加大输入框字体 */
  outline: none;
  box-sizing: border-box;
  color: #333 !important;
  caret-color: #333 !important;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input:focus {
  border-color: #a2d0fa;
  box-shadow: 0 0 0 2px rgba(162, 208, 250, 0.3);
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
  border-radius: 15px;
  padding: 25px; /* 加大内边距 */
  text-align: center;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
}

.stat-card.frozen {
  border-left: 4px solid #ff6b6b;
}

.stat-card.unfrozen {
  border-left: 4px solid #51cf66;
}

.stat-value {
  color: #3d3c63;
  font-size: 24px; /* 加大数值字体 */
  font-weight: bold;
  margin-bottom: 8px; /* 加大底部外边距 */
}

.stat-label {
  color: #666;
  font-size: 14px; /* 加大标签字体 */
}

/* 资产列表区域 */
.unfrozen-section,
.frozen-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 25px; /* 加大内边距 */
  margin-bottom: 25px; /* 加大底部外边距 */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.05);
}

.section-title {
  color: #3d3c63;
  margin-bottom: 10px; /* 加大底部外边距 */
  font-size: 20px; /* 加大标题字体 */
  font-weight: bold;
}

.section-description {
  color: #666;
  margin-bottom: 10px; /* 加大底部外边距 */
  font-size: 14px; /* 加大提示字体 */
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
  color: #666;
  margin-bottom: 25px; /* 加大底部外边距 */
  font-size: 16px; /* 加大提示字体 */
}

/* 资产卡片 */
.assets-list {
  max-height: 550px; /* 加大滚动区域高度 */
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px; /* 加大卡片间距 */
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
}

.asset-amount {
  color: #3d3c63;
  font-size: 20px; /* 加大金额字体 */
  font-weight: bold;
}

.unfreeze-btn {
  background: #51cf66;
  color: white;
  border: none;
  padding: 12px 24px; /* 加大按钮内边距 */
  border-radius: 20px;
  font-size: 15px; /* 加大按钮字体 */
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 90px;
}

.unfreeze-btn:hover:not(:disabled) {
  background: #40c057;
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
  display: flex;
  justify-content: space-between;
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
}

.info-item.error {
  background: rgba(255, 77, 79, 0.1);
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
}

.info-item.error .info-label {
  color: #ff4d4f;
}

.info-item.error .info-value {
  color: #ff4d4f;
}

/* 错误提示样式 */
.error-message {
  color: #ff4d4f;
  font-size: 1rem; /* 加大错误提示字体 */
  margin-top: 8px; /* 加大顶部外边距 */
  display: block;
  text-align: center;
  padding: 12px; /* 加大内边距 */
  background: rgba(255, 77, 79, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(255, 77, 79, 0.2);
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
  :deep(body) {
    padding: 20px; /* 调整移动端页面内边距 */
  }
  
  .asset-card {
    padding: 20px; /* 调整移动端卡片内边距 */
  }
  
  .asset-amount {
    font-size: 18px; /* 调整移动端金额字体 */
  }
  
  .unfreeze-btn {
    padding: 10px 20px; /* 调整移动端按钮内边距 */
    font-size: 14px; /* 调整移动端按钮字体 */
  }
}
</style>