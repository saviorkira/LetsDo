<script setup>
// 文件路径：src/App.vue
// 应用入口：初始化云开发 + 初始化暗色主题监听
import { onLaunch } from '@dcloudio/uni-app'
import { CLOUD_ENV_ID } from '@/config/env'
import { initThemeListener } from '@/utils/theme'

onLaunch(() => {
  // 初始化微信云开发，环境 ID 统一在 config/env.js 中维护
  if (typeof wx !== 'undefined' && wx.cloud) {
    wx.cloud.init({ env: CLOUD_ENV_ID || undefined, traceUser: true })
  }
  // 初始化暗色模式（默认跟随微信系统主题，可在「我的」页关闭跟随）
  initThemeListener()
})
</script>

<style lang="scss">
/* 全局设计变量：源自 UI 设计稿 Design Tokens，简约生活化、低饱和浅绿主色 */
page {
  --ld-primary: #6FBF73;
  --ld-primary-dark: #4E9A54;
  --ld-primary-soft: #E7F4E8;
  --ld-bg: #f4f6f1;
  --ld-card: #ffffff;
  --ld-text: #23291f;
  --ld-text-2: #6f7a6a;
  --ld-text-3: #a5ada1;
  --ld-line: #e8ece4;
  --ld-danger: #ef5350;
  --ld-gold: #e0a63c;
  --ld-radius-lg: 44rpx;
  --ld-radius-md: 32rpx;
  --ld-radius-sm: 20rpx;
  --ld-shadow: 0 12rpx 30rpx rgba(60, 80, 50, 0.10);

  /* ===== Wot UI 全局变量兜底 ===== */
  --wot-color-theme: #6FBF73;
  --wot-color-primary: #6FBF73;
  --wot-color-primary-dark: #4E9A54;
  --wot-color-primary-light: #A4D0A8;
  --wot-color-success: #6FBF73;
  --wot-color-warning: #e0a63c;
  --wot-color-danger: #ef5350;
  --wot-color-title: #23291f;
  --wot-color-black: #23291f;
  --wot-color-text: #2d322c;
  --wot-color-secondary: #6f7a6a;
  --wot-color-tips: #a5ada1;
  --wot-color-white: #ffffff;
  --wot-color-placeholder: #a5ada1;
  --wot-color-page-bg: #f4f6f1;
  --wot-color-fill: #f0f2ed;
  --wot-color-bg: #ffffff;
  --wot-color-gray-1: #f4f6f1;
  --wot-color-gray-2: #e9ede4;
  --wot-color-gray-3: #d8ddd3;
  --wot-color-gray-4: #a5ada1;
  --wot-color-gray-5: #6f7a6a;
  --wot-color-gray-6: #23291f;

  /* 滑块兜底 */
  --wot-slider-handle-radius: 14px;
  --wot-slider-axie-height: 6px;
  --wot-slider-axie-bg: #e5e5e5;
  --wot-slider-line-color: linear-gradient(90deg, #6FBF73, #4E9A54);
  --wot-slider-handle-bg: linear-gradient(139deg, #ffffff 0%, #f7f7f7 100%);
  --wot-slider-color: #333;
  --wot-slider-fs: 12px;

  background-color: var(--ld-bg);
  color: var(--ld-text);
  font-size: 26rpx;
}

/* 暗色模式：页面根节点挂载 .theme-dark 类时生效（由 utils/theme.js 控制） */
.theme-dark {
  --ld-primary: #7FCB84;
  --ld-primary-dark: #A8E0AC;
  --ld-primary-soft: #1e2a1f;
  --ld-bg: #161914;
  --ld-card: #1f231c;
  --ld-text: #eef2ea;
  --ld-text-2: #a4ae9d;
  --ld-text-3: #6d7668;
  --ld-line: #2c3227;
  --ld-danger: #ff6b68;
  --ld-gold: #f0b957;
  --ld-shadow: 0 12rpx 30rpx rgba(0, 0, 0, 0.45);

  --wot-color-theme: #7FCB84;
  --wot-color-primary: #7FCB84;
  --wot-color-primary-dark: #A8E0AC;
  --wot-color-title: #eef2ea;
  --wot-color-black: #eef2ea;
  --wot-color-text: #e8eae3;
  --wot-color-secondary: #a4ae9d;
  --wot-color-tips: #6d7668;
  --wot-color-white: #1f231c;
  --wot-color-placeholder: #6d7668;
  --wot-color-page-bg: #161914;
  --wot-color-fill: #2c3227;
  --wot-color-bg: #1f231c;
  --wot-color-gray-1: #161914;
  --wot-color-gray-2: #2c3227;
  --wot-color-gray-3: #3d4538;
  --wot-color-gray-4: #6d7668;
  --wot-color-gray-5: #a4ae9d;
  --wot-color-gray-6: #eef2ea;

  --wot-slider-axie-bg: #3d4538;
  --wot-slider-line-color: linear-gradient(90deg, #7FCB84, #A8E0AC);
  --wot-slider-color: #a4ae9d;
}

/* 通用卡片样式，各页面复用 */
.ld-card {
  background: var(--ld-card);
  border: 1rpx solid var(--ld-line);
  border-radius: var(--ld-radius-lg);
  box-shadow: var(--ld-shadow);
}
</style>
