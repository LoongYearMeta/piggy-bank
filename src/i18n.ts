import { ref, computed } from 'vue'

export type Locale = 'zh' | 'en'

const messages: Record<Locale, Record<string, string>> = {
  zh: {
    app_title: '存钱罐',
    nav_details: '存储明细',
    back: '返回',
    deposit_section: '存入资产',
    current_address: '当前钱包地址',
    current_balance: '当前钱包余额(TBC)',
    current_height: '当前区块高度',
    amount_label: '金额 (TBC)',
    input_amount_placeholder: '请输入存入金额',
    submit_deposit: '存入',
    time_term: '存储期限',
    please_select_term: '请选择存储期限',
    due_date: '到期日期',
    due_height: '到期区块高度',
    details_title: '存储明细',
    stats_frozen_total: '已存储未到期资产总额 (TBC)',
    stats_unfrozen_total: '存储到期可提取资产总额 (TBC)',
    list_unfrozen_title: '存储到期可提取资产',
    list_unfrozen_empty: '暂无可提取资产',
    list_frozen_title: '已存储未到期资产',
    list_frozen_empty: '暂无已存储资产',
    amount_tbc: 'TBC',
    withdraw: '提取',
    extracting: '提取',
    loading: '数据加载中...',
    need_wallet_install: '请先安装Turing钱包',
    err_get_address: '获取钱包地址失败',
    err_get_balance: '获取钱包余额失败',
    err_get_height: '获取当前区块高度失败',
    err_load_assets: '加载资产失败',
    withdraw_success: '资产提取成功！',
    withdraw_failed: '提取失败！请检查网络连接或重试。',
    deposit_success: '存入成功！',
    deposit_failed: '存入失败！请检查网络连接或重试。',
    tip_storage_term: '存储期限以区块高度为准',
    // form errors
    err_enter_amount: '请输入冻结金额',
    err_amount_format: '请输入正小数且最多精确到小数点后6位',
    err_amount_exceed_balance: '冻结金额不能大于钱包余额',
    err_select_time: '请选择冻结时间',
    err_invalid_time: '请选择有效的冻结时间',
    // terms
    term_1d: '1天',
    term_1w: '1周',
    term_1m: '1个月',
    term_3m: '3个月',
    term_6m: '6个月',
    term_1y: '1年',
    term_2y: '2年',
    term_3y: '3年',
    term_5y: '5年',
    term_10y: '10年',
    term_20y: '20年',
    // infos
    info_storage_term: '存储到期时间',
    info_block_height: '区块高度',
    decode_error: '解码错误',
    not_matured: '未到期',
  },
  en: {
    app_title: 'Piggy Bank',
    nav_details: 'Storage Details',
    back: 'Back',
    deposit_section: 'Deposit',
    current_address: 'Wallet Address',
    current_balance: 'Wallet Balance (TBC)',
    current_height: 'Current Block Height',
    amount_label: 'Amount (TBC)',
    input_amount_placeholder: 'Enter deposit amount',
    submit_deposit: 'Deposit',
    time_term: 'Storage Term',
    please_select_term: 'Select a storage term',
    due_date: 'Maturity Date',
    due_height: 'Maturity Block Height',
    details_title: 'Storage Details',
    stats_frozen_total: 'Total Not-Matured (TBC)',
    stats_unfrozen_total: 'Total Withdrawable (TBC)',
    list_unfrozen_title: 'Withdrawable Assets',
    list_unfrozen_empty: 'No withdrawable assets',
    list_frozen_title: 'Not-Matured Assets',
    list_frozen_empty: 'No stored assets',
    amount_tbc: 'TBC',
    withdraw: 'Withdraw',
    extracting: 'Withdraw',
    loading: 'Loading...',
    need_wallet_install: 'Please install Turing Wallet first',
    err_get_address: 'Failed to get wallet address',
    err_get_balance: 'Failed to get wallet balance',
    err_get_height: 'Failed to get current block height',
    err_load_assets: 'Failed to load assets',
    withdraw_success: 'Withdrawal successful!',
    withdraw_failed: 'Withdrawal failed! Please check your network and try again.',
    deposit_success: 'Deposit successful!',
    deposit_failed: 'Deposit failed! Please check your network and try again.',
    tip_storage_term: 'Storage term is based on block height',
    // form errors
    err_enter_amount: 'Please enter the deposit amount',
    err_amount_format: 'Please enter a positive number with up to 6 decimals',
    err_amount_exceed_balance: 'Amount cannot exceed wallet balance',
    err_select_time: 'Please select a storage term',
    err_invalid_time: 'Please select a valid storage term',
    // terms
    term_1d: '1 Day',
    term_1w: '1 Week',
    term_1m: '1 Month',
    term_3m: '3 Months',
    term_6m: '6 Months',
    term_1y: '1 Year',
    term_2y: '2 Years',
    term_3y: '3 Years',
    term_5y: '5 Years',
    term_10y: '10 Years',
    term_20y: '20 Years',
    // infos
    info_storage_term: 'Storage Term',
    info_block_height: 'Block Height',
    decode_error: 'Decode Error',
    not_matured: 'Not Matured',
  },
}

const stored = (localStorage.getItem('locale') as Locale) || 'zh'
export const locale = ref<Locale>(stored)

export function setLocale(l: Locale) {
  locale.value = l
  localStorage.setItem('locale', l)
}

export function t(key: string): string {
  const map = messages[locale.value]
  return map[key] ?? key
}

export const currentLocaleLabel = computed(() => (locale.value === 'zh' ? '中文' : 'English'))


