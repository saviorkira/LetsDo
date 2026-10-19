<!-- 文件路径：src/components/TabBar.vue -->
<!-- 自定义底部 Tab 导航：随机 / 菜单库 / 运动库 / 形象 / 我的 -->
<template>
  <view class="tab-bar">
    <view
      v-for="t in tabs"
      :key="t.path"
      class="tab"
      :class="{ on: active === t.path }"
      @click="go(t.path)"
    >
      <view class="ic">{{ t.icon }}</view>
      <text class="lb">{{ t.label }}</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  // 当前激活的页面路径，如 pages/random/index
  active: { type: String, required: true }
})

// 五个主页面
const tabs = [
  { path: 'pages/random/index', label: '随机', icon: '🎲' },
  { path: 'pages/recipe/library', label: '菜单库', icon: '📖' },
  { path: 'pages/exercise/library', label: '运动库', icon: '🏃' },
  { path: 'pages/avatar/index', label: '形象', icon: '🧍' },
  { path: 'pages/mine/index', label: '我的', icon: '🙂' }
]

function go(path) {
  if (path === props.active) return
  // 未使用原生 tabBar（避免 png 图标资源依赖），用 redirectTo 在主页面间切换
  uni.redirectTo({ url: '/' + path })
}
</script>

<style lang="scss" scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  background: var(--ld-card);
  border-top: 1rpx solid var(--ld-line);
  /* 适配 iPhone 底部安全区 */
  padding-bottom: env(safe-area-inset-bottom);
}

.tab {
  flex: 1;
  height: 116rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--ld-text-3);

  &.on {
    color: var(--ld-primary-dark);
  }

  .ic {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 44rpx;
    line-height: 1;
  }

  .lb {
    margin-top: 4rpx;
    font-size: 22rpx;
    line-height: 1;
  }

  &.on .lb {
    font-weight: 600;
  }
}
</style>
