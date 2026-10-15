// 文件路径：src/utils/theme.js
// 暗色主题工具：默认跟随微信系统主题；「我的」页可关闭跟随（固定浅色）
import { ref } from 'vue'

// 全局暗色状态，页面根节点据此挂载 .theme-dark / .wd-dark 类
export const isDark = ref(false)

const FOLLOW_KEY = 'ld_follow_system_dark'

// 是否跟随系统主题（默认 true）
export function isFollowSystem() {
  const v = uni.getStorageSync(FOLLOW_KEY)
  return v === '' || v === true || v === 'true'
}

// 应用主题：计算当前是否应为暗色，并同步原生导航栏颜色
export function applyTheme() {
  const dark = isFollowSystem() && uni.getSystemInfoSync().theme === 'dark'
  isDark.value = dark
  uni.setNavigationBarColor({
    frontColor: dark ? '#ffffff' : '#000000',
    backgroundColor: dark ? '#161914' : '#f4f6f1'
  })
}

// 设置是否跟随系统（「我的」页暗色开关）
export function setFollowSystem(follow) {
  uni.setStorageSync(FOLLOW_KEY, follow)
  applyTheme()
}

// App 启动时调用：应用当前主题并监听系统主题变化
export function initThemeListener() {
  applyTheme()
  uni.onThemeChange(() => applyTheme())
}
