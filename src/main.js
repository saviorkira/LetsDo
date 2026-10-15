import { createSSRApp } from 'vue'
import App from './App.vue'
// 挂载 uni.cloud（副作用引入），保证所有页面可通过 uni.cloud.callFunction 调用云函数
import '@/utils/cloud'

// uni-app Vue3 入口
export function createApp() {
  const app = createSSRApp(App)
  return {
    app
  }
}
