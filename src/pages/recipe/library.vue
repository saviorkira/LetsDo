<!-- 文件路径：src/pages/recipe/library.vue -->
<!-- 菜单库 Tab：全部菜谱卡片列表 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <view v-if="list.length" class="count">共 {{ list.length }} 道菜谱 · 每日持续更新</view>

    <RecipeCard
      v-for="r in list"
      :key="r._id"
      :recipe="r"
      :show-price="false"
    />

    <!-- 空状态 -->
    <view v-if="!loading && !list.length" class="empty">
      <view class="ico">🍳</view>
      <text class="b">菜谱库正在持续更新</text>
      <text class="s">敬请期待更多菜谱</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading color="#6FBF73" />
      <text class="s">菜谱加载中...</text>
    </view>

    <Disclaimer />
    <view style="height: 140rpx"></view>
    <TabBar active="pages/recipe/library" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import RecipeCard from '@/components/RecipeCard.vue'

const list = ref([])
const loading = ref(false)

// 每次进入刷新列表（后台可能更新了菜谱）
async function loadList() {
  loading.value = true
  try {
    const res = await callFunction('recipeService', { action: 'list' })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      list.value = ret.data
    } else {
      uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('菜谱列表加载失败', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(loadList)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding: 24rpx 24rpx 0;
}

.count {
  font-size: 23rpx;
  color: var(--ld-text-2);
  margin: 0 4rpx 20rpx;
}

.empty {
  text-align: center;
  padding: 120rpx 40rpx;

  .ico { font-size: 68rpx; margin-bottom: 20rpx; }
  .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
  .s { display: block; margin-top: 12rpx; font-size: 23rpx; color: var(--ld-text-2); }
}

.loading-box {
  text-align: center;
  padding: 80rpx 0;

  .s { display: block; margin-top: 16rpx; font-size: 23rpx; color: var(--ld-text-3); }
}
</style>
