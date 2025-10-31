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
    "process.env": JSON.stringify({}),
  },
  // 保留依赖预构建阶段的 esbuild 配置（确保 polyfill 在预构建时生效）
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
