<!-- 文件路径：src/pages/recipe/detail.vue -->
<!-- 菜谱配方详情页：大图 / 食材配比 / 营养汇总 / 视频号教程 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <template v-if="detail">
      <!-- 顶部大图区 -->
      <view class="hero">
        <image v-if="detail.imageUrl" class="hero-img" :src="detail.imageUrl" mode="aspectFill" />
        <view v-else class="hero-img ph">🍽️</view>
        <view class="grad"></view>
        <view class="ttl">
          <text class="b">{{ detail.name }}</text>
          <text class="s">{{ detail.desc }}</text>
        </view>
      </view>

      <!-- 食材配方清单 -->
      <view class="card ld-card">
        <view class="label">食材配方</view>
        <view v-for="ing in detail.ingredientList" :key="ing.ingredientId" class="ing-row">
          <image v-if="ing.imageUrl" class="ing-thumb" :src="ing.imageUrl" mode="aspectFill" />
          <view v-else class="ing-thumb ph">{{ ing.isVegetable ? '🥬' : '🍚' }}</view>
          <view class="n">
            <text class="b">{{ ing.name }}</text>
            <text class="s">{{ ing.caloriesPer100g }} kcal/100g · {{ ing.nutritionDesc }}</text>
          </view>
          <view class="w">
            <text class="b">{{ ing.weight }}g</text>
            <text class="s">{{ Math.round(ing.calories) }} kcal</text>
          </view>
        </view>
      </view>

      <!-- 整套菜谱汇总 -->
      <view class="card ld-card">
        <view class="label">整套菜谱汇总</view>
        <view class="stat-grid">
          <view><text class="s">总热量</text><text class="b">{{ Math.round(detail.summary.totalCalories) }} kcal</text></view>
          <view><text class="s">预估总价</text><text class="b">¥{{ detail.summary.totalPrice.toFixed(1) }}</text></view>
          <view><text class="s">蛋白质</text><text class="b">{{ detail.summary.totalProtein.toFixed(1) }}g</text></view>
          <view><text class="s">脂肪</text><text class="b">{{ detail.summary.totalFat.toFixed(1) }}g</text></view>
          <view><text class="s">碳水</text><text class="b">{{ detail.summary.totalCarbohydrate.toFixed(1) }}g</text></view>
          <view><text class="s">食材数</text><text class="b">{{ detail.summary.ingredientCount }} 种</text></view>
        </view>
      </view>

      <!-- 视频号做菜教程：仅在配置了 videoChannelId 时展示 -->
      <!-- videoChannelId 录入约定：「feedId:feedToken」格式（微信视频号视频的分享参数） -->
      <view v-if="videoInfo" class="card ld-card">
        <view class="label">视频号做菜教程</view>
        <channel-video :feed-id="videoInfo.feedId" :feed-token="videoInfo.feedToken" />
      </view>

      <Disclaimer />
    </template>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading color="#6FBF73" />
      <text class="s">菜谱加载中...</text>
    </view>

    <!-- 加载失败 -->
    <view v-if="!loading && !detail" class="empty">
      <view class="ico">😢</view>
      <text class="b">菜谱不存在或已被删除</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import Disclaimer from '@/components/Disclaimer.vue'

const detail = ref(null)
const loading = ref(false)

// 解析视频号参数：videoChannelId 按「feedId:feedToken」格式录入，非法格式则不展示视频模块
const videoInfo = computed(() => {
  const v = detail.value && detail.value.videoChannelId
  if (!v) return null
  const idx = v.indexOf(':')
  if (idx <= 0) return null
  return { feedId: v.slice(0, idx), feedToken: v.slice(idx + 1) }
})

// 接收菜谱卡片跳转携带的 id
onLoad(async (query) => {
  const id = query && query.id
  if (!id) return
  loading.value = true
  try {
    const res = await callFunction('recipeService', { action: 'detail', recipeId: id })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      detail.value = ret.data
    } else {
      uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('菜谱详情加载失败', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding-bottom: 40rpx;
}

/* 顶部大图区 */
.hero {
  position: relative;
  height: 440rpx;

  .hero-img {
    width: 100%;
    height: 100%;

    &.ph {
      background: linear-gradient(145deg, var(--ld-primary-soft), var(--ld-primary));
      display: grid;
      place-items: center;
      font-size: 120rpx;
    }
  }

  .grad {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.55));
  }

  .ttl {
    position: absolute;
    left: 32rpx;
    right: 32rpx;
    bottom: 28rpx;

    .b { display: block; font-size: 42rpx; font-weight: 800; color: #fff; }
    .s { display: block; font-size: 24rpx; color: rgba(255, 255, 255, 0.85); margin-top: 8rpx; }
  }
}

.card {
  margin: 24rpx;
  padding: 32rpx;

  .label {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ld-text);
    margin-bottom: 24rpx;
  }
}

/* 食材行 */
.ing-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx dashed var(--ld-line);

  &:last-child { border-bottom: 0; }

  .ing-thumb {
    width: 88rpx;
    height: 88rpx;
    border-radius: var(--ld-radius-sm);
    flex-shrink: 0;

    &.ph {
      background: var(--ld-primary-soft);
      display: grid;
      place-items: center;
      font-size: 40rpx;
    }
  }

  .n {
    flex: 1;
    min-width: 0;

    .b { display: block; font-size: 28rpx; font-weight: 600; color: var(--ld-text); }
    .s {
      display: block;
      font-size: 22rpx;
      color: var(--ld-text-2);
      margin-top: 4rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .w {
    text-align: right;
    flex-shrink: 0;

    .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
    .s { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 4rpx; }
  }
}

/* 汇总六宫格 */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24rpx 0;

  > view {
    text-align: center;

    .s { display: block; font-size: 23rpx; color: var(--ld-text-3); }
    .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); margin-top: 8rpx; }
  }
}

.loading-box, .empty {
  text-align: center;
  padding: 160rpx 40rpx;

  .ico { font-size: 68rpx; margin-bottom: 20rpx; }
  .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
  .s { display: block; margin-top: 16rpx; font-size: 23rpx; color: var(--ld-text-3); }
}
</style>
