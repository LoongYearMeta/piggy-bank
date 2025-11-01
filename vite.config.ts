import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
// 保留 Node 环境 polyfill 插件（解决浏览器兼容性）
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills({
      include: [
        "buffer",
        "crypto",
        "stream",
        "assert",
        "vm",
        "process",
        "util",
      ],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  // 保留 Node 模块别名配置（解决浏览器缺失 buffer/stream 等模块）
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/"),
    },
  },
  // 保留全局变量映射（解决 browser 中没有 global 的问题）
  define: {
    global: "globalThis",
    "process.env": "{}",
    "process.version": JSON.stringify("v18.0.0"),
    "process.browser": "true",
  },
  // 生产环境构建配置
  build: {
    // 启用代码压缩
    minify: "terser",
    terserOptions: {
      compress: {
        // 移除 console
        drop_console: true,
        // 移除 debugger
        drop_debugger: true,
        // 移除无用代码
        pure_funcs: ["console.log", "console.info", "console.debug"],
      },
      format: {
        // 移除注释
        comments: false,
      },
    },
    // 代码分割配置
    rollupOptions: {
      output: {
        // 手动分割代码块
        manualChunks: {
          // Vue 全家桶
          vue: ["vue", "vue-router", "pinia"],
          // tbc-contract 库单独打包
          "tbc-contract": ["tbc-contract"],
        },
        // 静态资源分类
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
        // 在每个文件顶部注入全局变量定义
        intro: "const exports = {}; const module = { exports: {} };",
      },
    },
    // CommonJS 转换配置
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/],
    },
    // 分块大小警告限制（2MB）
    chunkSizeWarningLimit: 2000,
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 生成 source map（生产环境可设为 false）
    sourcemap: false,
  },
  // 保留依赖预构建阶段的 esbuild 配置（确保 polyfill 在预构建时生效）
  optimizeDeps: {
    include: ["tbc-contract", "vue", "vue-router", "pinia"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
