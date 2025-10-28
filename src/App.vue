<script setup lang="ts">
// 存钱罐应用主组件
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: linear-gradient(270deg, #eef5ff 0%,#f1eef9 100%);
  /* min-height: 100vh; */
}

#app {
  min-height: calc(100vh - 2rem);
  min-width: calc(100vw - 2rem);
}
</style>
