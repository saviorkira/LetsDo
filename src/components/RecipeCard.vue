<!-- 文件路径：src/components/RecipeCard.vue -->
<!-- 菜谱卡片：封面 / 菜名 / 食材摘要 / 热量 / 价格，点击跳转详情（随机结果与菜单库共用） -->
<template>
  <view class="recipe-card ld-card" @click="goDetail">
    <image v-if="recipe.imageUrl" class="cover" :src="recipe.imageUrl" mode="aspectFill" />
    <view v-else class="cover ph">{{ coverIcon }}</view>
    <view class="info">
      <view class="name">
        <text class="t">{{ recipe.name }}</text>
        <text v-if="recipe.isStaple" class="tag-staple">主食</text>
      </view>
      <text class="sub">{{ subText }}</text>
      <view class="meta">
        <text class="kcal-pill">{{ Math.round(recipe.totalCalories || 0) }} kcal</text>
        <text v-if="showPrice" class="price">预估 ¥{{ (recipe.totalPrice || 0).toFixed(1) }}</text>
        <text v-if="!showPrice && recipe.ingredientCount" class="price">{{ recipe.ingredientCount }} 种食材</text>
      </view>
    </view>
    <view class="chev">›</view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { foodEmoji } from '@/utils/foodEmoji'

const props = defineProps({
  // 菜谱对象：云函数已基于食材库计算好 totalCalories / totalPrice 等
  recipe: { type: Object, required: true },
  // 是否展示价格（随机结果页展示价格，菜单库展示食材数）
  showPrice: { type: Boolean, default: true },
  // 食材摘要文字（如 番茄 · 鸡蛋 · 食用油），优先于 desc 展示
  ingredientSummary: { type: String, default: '' }
})

const subText = computed(() => props.ingredientSummary || props.recipe.desc || '')

// 封面占位图标：按菜名推断（青菜 🥬 / 肉类 🥩 / 主食 🍚 等）
const coverIcon = computed(() => foodEmoji(props.recipe.name, { isStaple: props.recipe.isStaple }))

function goDetail() {
  uni.navigateTo({ url: `/pages/recipe/detail?id=${props.recipe._id}` })
}
</script>

<style lang="scss" scoped>
.recipe-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: var(--ld-radius-sm);
  flex-shrink: 0;

  &.ph {
    background: linear-gradient(145deg, var(--ld-primary-soft), var(--ld-primary));
    display: grid;
    place-items: center;
    font-size: 52rpx;
  }
}

.info {
  flex: 1;
  min-width: 0;

  .name {
    display: flex;
    align-items: center;
    gap: 10rpx;

    .t {
      font-size: 28rpx;
      font-weight: 600;
      color: var(--ld-text);
    }

    .tag-staple {
      font-size: 19rpx;
      color: var(--ld-primary-dark);
      background: var(--ld-primary-soft);
      padding: 2rpx 12rpx;
      border-radius: 999rpx;
    }
  }

  .sub {
    display: block;
    font-size: 23rpx;
    color: var(--ld-text-2);
    margin-top: 6rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-top: 10rpx;

    .kcal-pill {
      font-size: 21rpx;
      font-weight: 600;
      color: var(--ld-primary-dark);
      background: var(--ld-primary-soft);
      padding: 4rpx 16rpx;
      border-radius: 999rpx;
    }

    .price {
      font-size: 23rpx;
      color: var(--ld-text-3);
    }
  }
}

.chev {
  color: var(--ld-text-3);
  font-size: 40rpx;
  line-height: 1;
  flex-shrink: 0;
}
</style>
