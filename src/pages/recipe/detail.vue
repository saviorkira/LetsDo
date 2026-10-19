<!-- 文件路径：src/pages/recipe/detail.vue -->
<!-- 菜谱配方详情页：大图 / 食材配比 / 营养汇总 / 视频号教程 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <template v-if="detail">
      <!-- 顶部大图区 -->
      <view class="hero">
        <image v-if="detail.imageUrl" class="hero-img" :src="detail.imageUrl" mode="aspectFill" />
        <view v-else class="hero-img ph">{{ dishIcon }}</view>
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
          <view v-else class="ing-thumb ph">{{ ingredientIcon(ing) }}</view>
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

      <!-- 计算过程（可展开）：展示整套菜谱营养/价格是怎么算出来的 -->
      <view class="card ld-card">
        <view class="calc-head" @click="showCalc = !showCalc">
          <text class="label">整套菜谱计算过程</text>
          <text class="toggle">{{ showCalc ? '收起 ▲' : '展开 ▼' }}</text>
        </view>
        <view v-if="showCalc" class="calc-body">
          <text class="calc-note">所有数值都按「食材库每 100g 基准 ÷ 100 × 实际用量」逐项累加得出。</text>

          <view v-for="row in calcRows" :key="row.name" class="calc-item">
            <view class="ci-head">
              <text class="ci-name">{{ row.name }}</text>
              <text class="ci-w">{{ row.weight }}g</text>
            </view>
            <view class="ci-line">
              <text class="ci-k">热量</text>
              <text class="ci-v">{{ row.weight }} ÷ 100 × {{ row.calPer100g }}kcal = {{ row.calories.toFixed(1) }} kcal</text>
            </view>
            <view class="ci-line">
              <text class="ci-k">价格</text>
              <text class="ci-v">{{ row.weight }} ÷ 100 × ¥{{ row.pricePer100g }} = ¥{{ row.price.toFixed(2) }}</text>
            </view>
          </view>

          <view class="calc-sum">
            <view class="sum-line"><text class="sk">总热量</text><text class="sv">{{ detail.summary.totalCalories.toFixed(1) }} kcal</text></view>
            <view class="sum-line"><text class="sk">总价</text><text class="sv">¥{{ detail.summary.totalPrice.toFixed(2) }}</text></view>
            <view class="sum-line"><text class="sk">蛋白质</text><text class="sv">{{ detail.summary.totalProtein.toFixed(1) }} g</text></view>
            <view class="sum-line"><text class="sk">脂肪</text><text class="sv">{{ detail.summary.totalFat.toFixed(1) }} g</text></view>
            <view class="sum-line"><text class="sk">碳水化合物</text><text class="sv">{{ detail.summary.totalCarbohydrate.toFixed(1) }} g</text></view>
          </view>
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
import { foodEmoji } from '@/utils/foodEmoji'
import Disclaimer from '@/components/Disclaimer.vue'

const detail = ref(null)
const loading = ref(false)
const showCalc = ref(false)

// 顶部大图占位图标：按菜名推断贴切 emoji
const dishIcon = computed(() => foodEmoji(detail.value && detail.value.name))

// 食材缩略图占位图标：青菜类 🥬 / 肉类 🥩 / 水产 🐟 等
function ingredientIcon(ing) {
  return foodEmoji(ing.name, { isVegetable: ing.isVegetable, isStaple: ing.isStaple })
}

// 计算过程逐项数据：统一转数字并兜底，避免云函数旧版本缺字段时报错
const calcRows = computed(() => {
  const d = detail.value
  if (!d || !d.ingredientList) return []
  return d.ingredientList.map(ing => ({
    name: ing.name,
    weight: Number(ing.weight) || 0,
    calPer100g: Number(ing.caloriesPer100g) || 0,
    calories: Number(ing.calories) || 0,
    pricePer100g: Number(ing.pricePer100g) || 0,
    price: Number(ing.price) || 0
  }))
})

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

/* 计算过程 */
.calc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .label { margin-bottom: 0; }

  .toggle {
    font-size: 23rpx;
    color: var(--ld-primary-dark);
    font-weight: 600;
  }
}

.calc-body {
  margin-top: 24rpx;

  .calc-note {
    display: block;
    font-size: 22rpx;
    color: var(--ld-text-3);
    line-height: 1.6;
    margin-bottom: 18rpx;
  }
}

.calc-item {
  padding: 18rpx 0;
  border-bottom: 1rpx dashed var(--ld-line);

  .ci-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;

    .ci-name { font-size: 27rpx; font-weight: 600; color: var(--ld-text); }
    .ci-w { font-size: 24rpx; color: var(--ld-text-2); }
  }

  .ci-line {
    display: flex;
    gap: 12rpx;
    margin-top: 8rpx;

    .ci-k {
      flex-shrink: 0;
      width: 64rpx;
      font-size: 21rpx;
      color: var(--ld-text-3);
    }

    .ci-v {
      font-size: 21rpx;
      color: var(--ld-text-2);
    }
  }
}

.calc-sum {
  margin-top: 20rpx;

  .sum-line {
    display: flex;
    justify-content: space-between;
    padding: 8rpx 0;

    .sk { font-size: 24rpx; color: var(--ld-text-2); }
    .sv { font-size: 24rpx; font-weight: 700; color: var(--ld-primary-dark); }
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
