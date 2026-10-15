<!-- 文件路径：src/components/TabBar.vue -->
<!-- 自定义底部 Tab 导航：随机 / 菜单库 / 我的（SVG 图标 currentColor 自动适配暗色） -->
<template>
  <view class="tab-bar">
    <view class="tab" :class="{ on: active === 'pages/random/index' }" @click="go('pages/random/index')">
      <text class="ic">🎲</text>
      <text>随机</text>
    </view>
    <view class="tab" :class="{ on: active === 'pages/recipe/library' }" @click="go('pages/recipe/library')">
      <text class="ic">📖</text>
      <text>菜单库</text>
    </view>
    <view class="tab" :class="{ on: active === 'pages/mine/index' }" @click="go('pages/mine/index')">
      <text class="ic">🙂</text>
      <text>我的</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  // 当前激活的页面路径，如 pages/random/index
  active: { type: String, required: true }
})

function go(path) {
  if (path === props.active) return
  // 未使用原生 tabBar（避免 png 图标资源依赖），用 redirectTo 在三个主页面间切换
  uni.redirectTo({ url: '/' + path })
}
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  background: var(--ld-card);
  border-top: 1rpx solid var(--ld-line);
  /* 适配 iPhone 底部安全区 */
  padding-bottom: env(safe-area-inset-bottom);
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 14rpx 0 12rpx;
  font-size: 20rpx;
  color: var(--ld-text-3);

  &.on {
    color: var(--ld-primary-dark);
    font-weight: 600;
  }

  .ic {
    width: 44rpx;
    height: 44rpx;
  }
}
</style>
