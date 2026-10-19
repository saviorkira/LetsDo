<!-- 文件路径：src/components/ExerciseCard.vue -->
<!-- 运动卡片：图标 / 名称 / 类别 / 好处 / 消耗热量，点击跳转详情（运动库与随机结果共用） -->
<template>
  <view class="exercise-card ld-card" @click="goDetail">
    <view class="icon">{{ exercise.icon || '🏃' }}</view>
    <view class="info">
      <view class="name">
        <text class="t">{{ exercise.name }}</text>
        <text v-if="exercise.category" class="tag">{{ exercise.category }}</text>
      </view>
      <text class="sub">{{ exercise.benefits }}</text>
      <view class="meta">
        <text class="kcal-pill">约 {{ kcalPerMin }} kcal/分钟</text>
        <text v-if="minutes" class="extra">建议 {{ minutes }} 分钟 · 消耗 {{ burnText }} kcal</text>
      </view>
    </view>
    <view class="chev">›</view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 运动对象：含 name / category / icon / met / benefits / kcalPerMin
  exercise: { type: Object, required: true },
  // 建议时长（分钟），传入后展示「建议 X 分钟 · 消耗 Y kcal」
  minutes: { type: Number, default: 0 },
  // 该时长下的总消耗 kcal
  burn: { type: Number, default: 0 }
})

const kcalPerMin = computed(() => Number(props.exercise.kcalPerMin || 0).toFixed(1))
const burnText = computed(() => Math.round(Number(props.burn) || 0))

function goDetail() {
  uni.navigateTo({ url: `/pages/exercise/detail?id=${props.exercise._id}` })
}
</script>

<style lang="scss" scoped>
.exercise-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: var(--ld-radius-sm);
  flex-shrink: 0;
  background: linear-gradient(145deg, var(--ld-primary-soft), var(--ld-primary));
  display: grid;
  place-items: center;
  font-size: 56rpx;
  line-height: 1;
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

    .tag {
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

    .extra {
      font-size: 21rpx;
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
