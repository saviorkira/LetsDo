import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// uni-app vite 构建配置
export default defineConfig({
  plugins: [uni()]
})
