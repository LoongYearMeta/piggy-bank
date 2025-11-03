/**
 * LocalStorage 工具函数
 */

/**
 * 设置 localStorage
 * @param key 键名
 * @param value 值
 * @param expirationMs 过期时间（毫秒），可选
 */
export function setLocalStorage(key: string, value: string, expirationMs?: number) {
	const item = {
		value,
		timestamp: Date.now(),
		expiration: expirationMs ? Date.now() + expirationMs : null,
	};
	localStorage.setItem(key, JSON.stringify(item));
}

/**
 * 获取 localStorage
 * @param key 键名
 * @returns 值，如果不存在或已过期则返回 null
 */
export function getLocalStorage(key: string): string | null {
	const itemStr = localStorage.getItem(key);
	if (!itemStr) {
		return null;
	}

	try {
		const item = JSON.parse(itemStr);
		// 检查是否过期
		if (item.expiration && Date.now() > item.expiration) {
			localStorage.removeItem(key);
			return null;
		}
		return item.value;
	} catch (error) {
		console.error('Failed to parse localStorage item:', error);
		return null;
	}
}

/**
 * 移除 localStorage
 * @param key 键名
 */
export function removeLocalStorage(key: string) {
	localStorage.removeItem(key);
}

/**
 * 清除所有 localStorage
 */
export function clearLocalStorage() {
	localStorage.clear();
}
