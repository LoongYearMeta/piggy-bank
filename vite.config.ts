import { defineConfig } from "vite";
// 替换 React 插件为 Vue 插件（处理 .vue 单文件组件）
import vue from "@vitejs/plugin-vue";
// 保留 Node 环境 polyfill 插件（解决浏览器兼容性）
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  // 插件替换为 Vue 插件
  plugins: [vue()],
  // 保留 Node 模块别名配置（解决浏览器缺失 buffer/stream 等模块）
  resolve: {
    alias: {
      "buffer/": path.resolve(__dirname, "node_modules/buffer/"),
      buffer: path.resolve(__dirname, "node_modules/buffer/"),
      stream: path.resolve(__dirname, "node_modules/stream-browserify/"),
      util: path.resolve(__dirname, "node_modules/util/"),
      // 可选：添加 Vue 项目常用别名（如 src 目录）
      "@": path.resolve(__dirname, "src/"),
    },
  },
  // 保留全局变量映射（解决 browser 中没有 global 的问题）
  define: {
    global: "globalThis",
  },
  // 保留依赖预构建阶段的 esbuild 配置（确保 polyfill 在预构建时生效）
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true, // 补充 Buffer 全局对象
        }),
        NodeModulesPolyfillPlugin(), // 补充 Node 内置模块的浏览器兼容
      ],
    },
  },
});