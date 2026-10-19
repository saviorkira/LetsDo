<!-- 文件路径：src/pages/exercise/detail.vue -->
<!-- 运动详情页：运动好处 / 热量消耗 / 消耗计算过程 / 运动要点 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <template v-if="detail">
      <!-- 顶部图标区 -->
      <view class="hero">
        <view class="hero-icon">{{ detail.icon || '🏃' }}</view>
        <view class="ttl">
          <text class="b">{{ detail.name }}</text>
          <text class="s">{{ detail.desc }}</text>
        </view>
      </view>

      <!-- 运动好处 -->
      <view class="card ld-card">
        <view class="label">运动好处</view>
        <text class="para">{{ detail.benefits }}</text>
      </view>

      <!-- 热量消耗 -->
      <view class="card ld-card">
        <view class="label">热量消耗</view>
        <view class="stat-grid">
          <view><text class="s">每分钟</text><text class="b">{{ kpm.toFixed(1) }} kcal</text></view>
          <view><text class="s">30 分钟</text><text class="b">{{ Math.round(k30) }} kcal</text></view>
          <view><text class="s">强度 MET</text><text class="b">{{ detail.met }}</text></view>
        </view>
        <view class="note">按体重 {{ detail.weight }}kg 换算{{ weight? '' : '（未录入体重，使用默认值）' }}</view>
      </view>

      <!-- 消耗计算过程（可展开） -->
      <view class="card ld-card">
        <view class="calc-head" @click="showCalc = !showCalc">
          <text class="label">消耗计算过程</text>
          <text class="toggle">{{ showCalc ? '收起 ▲' : '展开 ▼' }}</text>
        </view>
        <view v-if="showCalc" class="calc-body">
          <text class="calc-note">公式：每分钟消耗 = MET × 3.5 × 体重(kg) ÷ 200</text>
          <view class="calc-line">
            <text class="k">代入</text>
            <text class="v">{{ detail.met }} × 3.5 × {{ detail.weight }} ÷ 200 = {{ kpm.toFixed(2) }} kcal/分钟</text>
          </view>
          <view class="calc-line">
            <text class="k">30 分钟</text>
            <text class="v">{{ kpm.toFixed(2) }} × 30 = {{ k30.toFixed(1) }} kcal</text>
          </view>
          <view class="calc-line">
            <text class="k">体重</text>
            <text class="v">在「我的」录入身高体重后，这里会按你的实际体重自动更新</text>
          </view>
        </view>
      </view>

      <!-- 运动要点 -->
      <view class="card ld-card">
        <view class="label">运动要点</view>
        <text class="para">{{ detail.tip }}</text>
      </view>

      <Disclaimer />
    </template>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading color="#6FBF73" />
      <text class="s">运动加载中...</text>
    </view>

    <!-- 加载失败 -->
    <view v-if="!loading && !detail" class="empty">
      <view class="ico">😢</view>
      <text class="b">运动不存在或已被删除</text>
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
const showCalc = ref(false)

const kpm = computed(() => Number(detail.value && detail.value.kcalPerMin) || 0)
const k30 = computed(() => Number(detail.value && detail.value.kcalPer30min) || 0)
// 是否已录入体重（60 为默认参考值）
const weight = computed(() => Number(detail.value && detail.value.weight) || 0)

onLoad(async (query) => {
  const id = query && query.id
  if (!id) return
  loading.value = true
  try {
    const res = await callFunction('exerciseService', { action: 'detail', exerciseId: id })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      detail.value = ret.data
    } else {
      uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('运动详情加载失败', e)
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

/* 顶部图标区 */
.hero {
  background: linear-gradient(145deg, var(--ld-primary-soft), var(--ld-primary));
  padding: 56rpx 40rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .hero-icon {
    width: 160rpx;
    height: 160rpx;
    border-radius: 48rpx;
    background: rgba(255, 255, 255, 0.6);
    display: grid;
    place-items: center;
    font-size: 84rpx;
    line-height: 1;
    margin-bottom: 24rpx;
  }

  .ttl {
    .b { display: block; font-size: 42rpx; font-weight: 800; color: #fff; }
    .s { display: block; font-size: 24rpx; color: rgba(255, 255, 255, 0.9); margin-top: 10rpx; }
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

.para {
  display: block;
  font-size: 26rpx;
  color: var(--ld-text-2);
  line-height: 1.8;
}

/* 消耗三宫格 */
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

.note {
  margin-top: 20rpx;
  font-size: 22rpx;
  color: var(--ld-text-3);
  text-align: center;
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

.calc-line {
  display: flex;
  gap: 14rpx;
  margin-top: 10rpx;

  .k {
    flex-shrink: 0;
    width: 90rpx;
    font-size: 21rpx;
    color: var(--ld-text-3);
  }

  .v {
    flex: 1;
    font-size: 21rpx;
    color: var(--ld-text-2);
    line-height: 1.6;
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
