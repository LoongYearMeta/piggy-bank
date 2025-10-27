# Piggy Bank

A Vue 3 + TypeScript application for managing piggy bank deposits.

## 环境变量配置

项目使用环境变量来配置 API 的 network 参数：

### 开发环境
`.env.development` 文件中配置：
```
VITE_NETWORK=testnet
```

### 生产环境
`.env.production` 文件中配置：
```
VITE_NETWORK=
```

### 使用说明

- **开发环境**：使用 `testnet` 参数连接测试网络
- **生产环境**：不传递 network 参数（使用主网）

### 如何运行

```bash
# 安装依赖
npm install

# 开发环境运行（使用 testnet）
npm run dev

# 生产环境构建（使用主网）
npm run build
```

### 环境变量说明

`VITE_NETWORK` 环境变量用于配置 API 调用时的网络参数：

- 设置为 `testnet` 时，API 将连接到测试网络
- 设置为空字符串或未设置时，API 将连接到主网
