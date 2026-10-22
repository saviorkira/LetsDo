<!-- 文件路径：src/pages/ingredient/detail.vue -->
<!-- 食材详情页：大图 / 每100g营养 / 价格参考 / 营养亮点 / 用到它的菜品 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <template v-if="detail">
      <!-- 顶部大图区 -->
      <view class="hero">
        <image v-if="detail.imageUrl" class="hero-img" :src="detail.imageUrl" mode="aspectFill" />
        <view v-else class="hero-img ph">{{ ingIcon }}</view>
        <view class="grad"></view>
        <view class="ttl">
          <text class="b">{{ detail.name }}</text>
          <text class="s">{{ categoryText }}</text>
        </view>
      </view>

      <!-- 营养参考（每 100g） -->
      <view class="card ld-card">
        <view class="label">营养参考（每 100g）</view>
        <view class="stat-grid">
          <view><text class="s">热量</text><text class="b">{{ Math.round(detail.calories) }} kcal</text></view>
          <view><text class="s">蛋白质</text><text class="b">{{ detail.protein.toFixed(1) }}g</text></view>
          <view><text class="s">脂肪</text><text class="b">{{ detail.fat.toFixed(1) }}g</text></view>
          <view><text class="s">碳水</text><text class="b">{{ detail.carbohydrate.toFixed(1) }}g</text></view>
        </view>
      </view>

      <!-- 价格参考 -->
      <view class="card ld-card">
        <view class="label">价格参考</view>
        <view class="price-row">
          <view class="p-item">
            <text class="p-b">¥{{ detail.price.toFixed(1) }}</text>
            <text class="p-s">每斤（500g）</text>
          </view>
          <view class="p-div"></view>
          <view class="p-item">
            <text class="p-b">¥{{ detail.pricePer100g.toFixed(2) }}</text>
            <text class="p-s">每 100g</text>
          </view>
        </view>
      </view>

      <!-- 营养亮点 -->
      <view v-if="detail.nutritionDesc" class="card ld-card">
        <view class="label">营养亮点</view>
        <text class="desc">{{ detail.nutritionDesc }}</text>
      </view>

      <!-- 用到它的菜品 -->
      <view class="card ld-card">
        <view class="label">用到它的菜品（{{ detail.recipeList.length }}）</view>
        <view
          v-for="r in detail.recipeList"
          :key="r._id"
          class="recipe-row"
          @click="goRecipeDetail(r._id)"
        >
          <image v-if="r.imageUrl" class="r-thumb" :src="r.imageUrl" mode="aspectFill" />
          <view v-else class="r-thumb ph">{{ foodEmoji(r.name) }}</view>
          <view class="r-n">
            <text class="b">{{ r.name }}</text>
            <text class="s">{{ r.desc || ('本菜用量 ' + r.ingredientWeight + 'g') }}</text>
          </view>
          <view class="r-w">
            <text class="b">{{ r.totalCalories }} kcal</text>
            <text class="s">用量 {{ r.ingredientWeight }}g</text>
          </view>
          <text class="r-arrow">›</text>
        </view>
        <view v-if="!detail.recipeList.length" class="no-recipe">暂无菜品使用此食材</view>
      </view>

      <Disclaimer />
    </template>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading color="#6FBF73" />
      <text class="s">食材加载中...</text>
    </view>

    <!-- 加载失败 -->
    <view v-if="!loading && !detail" class="empty">
      <view class="ico">😢</view>
      <text class="b">食材不存在或已被删除</text>
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

// 顶部大图占位图标：按食材名推断贴切 emoji
const ingIcon = computed(() => {
  const d = detail.value
  return d ? foodEmoji(d.name, { isVegetable: d.isVegetable, isStaple: d.isStaple }) : '🥬'
})

// 分类标签：主食 / 调料 / 蔬菜 / 饮品 / 食材
const categoryText = computed(() => {
  const d = detail.value
  if (!d) return ''
  if (d.isStaple) return '主食'
  if (d.isCondiment) return '调料'
  if (d.isDrink) return '饮品'
  if (d.isVegetable) return '蔬菜'
  return '食材'
})

function goRecipeDetail(id) {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${id}` })
}

onLoad(async (query) => {
  const id = query && query.id
  if (!id) return
  loading.value = true
  try {
    const res = await callFunction('recipeService', { action: 'ingredientDetail', ingredientId: id })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      detail.value = ret.data
    } else {
      uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('食材详情加载失败', e)
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

/* 顶部大图区（与菜谱详情页同款） */
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

/* 营养四宫格 */
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 24rpx 0;

  > view {
    text-align: center;

    .s { display: block; font-size: 23rpx; color: var(--ld-text-3); }
    .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); margin-top: 8rpx; }
  }
}

/* 价格参考 */
.price-row {
  display: flex;
  align-items: center;

  .p-item {
    flex: 1;
    text-align: center;

    .p-b { display: block; font-size: 40rpx; font-weight: 800; color: var(--ld-primary-dark); }
    .p-s { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 8rpx; }
  }

  .p-div {
    width: 1rpx;
    height: 64rpx;
    background: var(--ld-line);
  }
}

.desc {
  font-size: 25rpx;
  color: var(--ld-text-2);
  line-height: 1.7;
}

/* 用到它的菜品行 */
.recipe-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx dashed var(--ld-line);

  &:last-child { border-bottom: 0; }

  .r-thumb {
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

  .r-n {
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

  .r-w {
    text-align: right;
    flex-shrink: 0;

    .b { display: block; font-size: 26rpx; font-weight: 700; color: var(--ld-text); }
    .s { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 4rpx; }
  }

  .r-arrow { font-size: 32rpx; color: var(--ld-text-3); flex-shrink: 0; }
}

.no-recipe {
  padding: 40rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--ld-text-3);
}

.loading-box, .empty {
  text-align: center;
  padding: 160rpx 40rpx;

  .ico { font-size: 68rpx; margin-bottom: 20rpx; }
  .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
  .s { display: block; margin-top: 16rpx; font-size: 23rpx; color: var(--ld-text-3); }
}
</style>
