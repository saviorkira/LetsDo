// 文件路径：src/utils/theme.js
// 主题工具：固定亮色（不跟随系统，不支持暗色切换）
import { ref } from 'vue'

export const isDark = ref(false)

// 应用主题：固定亮色
export function applyTheme() {
  isDark.value = false
  uni.setNavigationBarColor({
    frontColor: '#000000',
    backgroundColor: '#f4f6f1'
  })
}

// App 启动时调用
export function initThemeListener() {
  applyTheme()
}
