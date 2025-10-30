import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { API } from 'tbc-contract'
import { t } from '../i18n'

export const useWalletStore = defineStore('wallet', () => {
  // 状态
  const walletInfo = reactive({
    curAddress: '', // 钱包地址
    tbcBalance: 0, // 钱包余额
    curBlockHeight: 0 // 当前区块高度
  })

  // 网络环境
  const network = import.meta.env.VITE_NETWORK || undefined

  // 获取钱包地址
  const getAddress = async () => {
    if (!window.Turing) {
      alert(t('warning_wallet_not_installed'))
      return
    }
    try {
      await window.Turing.connect()
      const { tbcAddress } = await window.Turing.getAddress()
      walletInfo.curAddress = tbcAddress
      // 获取到地址后，自动获取余额和区块高度
      if (tbcAddress) {
        await getBalance()
        await getBlockHeight()
      }
    } catch (error) {
      console.error('获取钱包地址失败:', error)
    }
  }

  // 获取钱包余额
  const getBalance = async () => {
    try {
      const tbc = await API.getTBCbalance(walletInfo.curAddress, network)
      walletInfo.tbcBalance = tbc / 1000000
    } catch (error) {
      console.error('获取钱包余额失败:', error)
    }
  }

  // 获取当前区块高度
  const getBlockHeight = async () => {
    try {
      const res = await API.fetchBlockHeaders(network)
      walletInfo.curBlockHeight = res[0]?.height || 0
    } catch (error) {
      console.error('获取当前区块高度失败:', error)
    }
  }

  // 获取钱包信息
  const getWalletInfo = async () => {
    await getAddress()
    if (walletInfo.curAddress) {
      await getBalance()
      await getBlockHeight()
    }
  }

  return {
    walletInfo,
    getAddress,
    getBalance,
    getBlockHeight,
    getWalletInfo
  }
})

