<!-- 文件路径：src/components/TabBar.vue -->
<!-- 自定义底部 Tab 导航：运动库 / 菜品库 / 随机 / 形象 / 我的（随机居中，为默认首页） -->
<template>
  <view class="tab-bar">
    <view
      v-for="t in tabs"
      :key="t.path"
      class="tab"
      :class="{ on: active === t.path }"
      @click="go(t.path)"
    >
      <view class="ic" :class="t.icon"></view>
      <text class="lb">{{ t.label }}</text>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  // 当前激活的页面路径，如 pages/random/index
  active: { type: String, required: true }
})

// 五个主页面（随机居中；图标为 Lucide 风格线性 SVG，见样式区）
const tabs = [
  { path: 'pages/exercise/library', label: '运动库', icon: 'ic-activity' },
  { path: 'pages/recipe/library', label: '菜品库', icon: 'ic-book' },
  { path: 'pages/random/index', label: '随机', icon: 'ic-dice' },
  { path: 'pages/avatar/index', label: '形象', icon: 'ic-person' },
  { path: 'pages/mine/index', label: '我的', icon: 'ic-user' }
]

function go(path) {
  if (path === props.active) return
  // 未使用原生 tabBar（避免 png 图标资源依赖），用 redirectTo 在主页面间切换
  uni.redirectTo({ url: '/' + path })
}
</script>

<style lang="scss" scoped>
/* ===== Lucide 风格线性图标（24×24 视图盒，圆角 2px 描边）=====
   以 data URI 内嵌，无需图片资源；灰=未激活，绿=激活，深色模式激活态用亮绿 */
$ic-dice: "%3Crect x='3' y='3' width='18' height='18' rx='5'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.3'/%3E%3Ccircle cx='15.5' cy='8.5' r='1.3'/%3E%3Ccircle cx='12' cy='12' r='1.3'/%3E%3Ccircle cx='8.5' cy='15.5' r='1.3'/%3E%3Ccircle cx='15.5' cy='15.5' r='1.3'/%3E";
$ic-book: "%3Cpath d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'/%3E%3Cpath d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'/%3E";
$ic-activity: "%3Cpath d='M22 12h-4l-3 9L9 3l-3 9H2'/%3E";
$ic-person: "%3Ccircle cx='12' cy='5' r='2'/%3E%3Cpath d='m9 20 3-6 3 6'/%3E%3Cpath d='M6 8l6 2 6-2'/%3E%3Cpath d='M12 10v4'/%3E";
$ic-user: "%3Ccircle cx='12' cy='8' r='5'/%3E%3Cpath d='M20 21a8 8 0 0 0-16 0'/%3E";

@function ld-icon($body, $color) {
  @return url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='" + $color + "' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E" + $body + "%3C/svg%3E");
}

$tab-gray: '%23a5ada1';
$tab-green: '%234E9A54';
$tab-green-dark: '%23A8E0AC';

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
    width: 48rpx;
    height: 48rpx;
    background: no-repeat center / contain;

    &.ic-dice { background-image: ld-icon($ic-dice, $tab-gray); }
    &.ic-book { background-image: ld-icon($ic-book, $tab-gray); }
    &.ic-activity { background-image: ld-icon($ic-activity, $tab-gray); }
    &.ic-person { background-image: ld-icon($ic-person, $tab-gray); }
    &.ic-user { background-image: ld-icon($ic-user, $tab-gray); }
  }

  &.on .ic {
    &.ic-dice { background-image: ld-icon($ic-dice, $tab-green); }
    &.ic-book { background-image: ld-icon($ic-book, $tab-green); }
    &.ic-activity { background-image: ld-icon($ic-activity, $tab-green); }
    &.ic-person { background-image: ld-icon($ic-person, $tab-green); }
    &.ic-user { background-image: ld-icon($ic-user, $tab-green); }
  }

  .lb {
    margin-top: 6rpx;
    font-size: 22rpx;
    line-height: 1;
  }

  &.on .lb {
    font-weight: 600;
  }
}

/* 深色模式：激活态图标切换为亮绿，保证深色底上可见 */
.theme-dark .tab.on .ic {
  &.ic-dice { background-image: ld-icon($ic-dice, $tab-green-dark); }
  &.ic-book { background-image: ld-icon($ic-book, $tab-green-dark); }
  &.ic-activity { background-image: ld-icon($ic-activity, $tab-green-dark); }
  &.ic-person { background-image: ld-icon($ic-person, $tab-green-dark); }
  &.ic-user { background-image: ld-icon($ic-user, $tab-green-dark); }
}
</style>
