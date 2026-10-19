<!-- 文件路径：src/pages/exercise/library.vue -->
<!-- 运动库 Tab：类别分段 + 运动卡片列表（点进详情看好处与消耗） -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- 类别分段切换 -->
    <view class="seg">
      <view
        v-for="c in categories"
        :key="c"
        class="seg-item"
        :class="{ on: cat === c }"
        @click="cat = c"
      >{{ c }}</view>
    </view>

    <!-- 体重换算说明 -->
    <view class="tip-bar">
      <text class="tb-i">⚖️</text>
      <text>热量消耗按体重换算：{{ weightText }}</text>
    </view>

    <view v-if="total" class="count">共 {{ total }} 项运动 · 下拉加载更多</view>

    <ExerciseCard v-for="e in list" :key="e._id" :exercise="e" />

    <view v-if="list.length && !hasMore" class="loading-box">
      <text class="s">已经到底啦</text>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && !list.length" class="empty">
      <view class="ico">🏃</view>
      <text class="b">暂无运动数据</text>
      <text class="s">请确认已部署 exerciseService 云函数并导入运动库</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading color="#6FBF73" />
      <text class="s">运动加载中...</text>
    </view>

    <Disclaimer />
    <view style="height: 160rpx"></view>
    <TabBar active="pages/exercise/library" />
  </view>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import ExerciseCard from '@/components/ExerciseCard.vue'

const list = ref([])
const loading = ref(false)
const cat = ref('全部')
const weight = ref(0)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)
const PAGE_SIZE = 10

const categories = ['全部', '有氧', '力量', '柔韧', '球类', '日常']

const weightText = computed(() =>
  weight.value ? `当前 ${weight.value}kg` : '默认 60kg（在「我的」录入体重后更准确）'
)

watch(cat, () => resetAndLoad())

async function loadList() {
  if (loading.value) return
  if (!hasMore.value && page.value > 1) return
  loading.value = true
  try {
    const res = await callFunction('exerciseService', {
      action: 'list',
      category: cat.value,
      page: page.value,
      pageSize: PAGE_SIZE
    })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      const d = ret.data || {}
      // 兼容旧版云函数（返回数组）和新版（返回 {list,total,hasMore,weight}）
      const newList = Array.isArray(d) ? d : (d.list || [])
      if (page.value === 1) {
        list.value = newList
      } else {
        list.value = list.value.concat(newList)
      }
      total.value = Array.isArray(d) ? d.length : (d.total || 0)
      hasMore.value = Array.isArray(d) ? false : !!d.hasMore
      weight.value = (Array.isArray(d) ? (d[0] && d[0].weight) : d.weight) || 0
    } else {
      uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('运动列表加载失败', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  page.value = 1
  hasMore.value = true
  list.value = []
  loadList()
}

onReachBottom(() => {
  if (!loading.value && hasMore.value) {
    page.value += 1
    loadList()
  }
})

onShow(loadList)
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding: 24rpx 24rpx 0;
}

/* 类别分段 */
.seg {
  display: flex;
  background: rgba(165, 173, 161, 0.16);
  border-radius: 999rpx;
  padding: 6rpx;
  margin-bottom: 24rpx;

  .seg-item {
    flex: 1;
    text-align: center;
    font-size: 25rpx;
    color: var(--ld-text-2);
    padding: 16rpx 0;
    border-radius: 999rpx;
    transition: all 0.2s;

    &.on {
      background: var(--ld-card);
      color: var(--ld-primary-dark);
      font-weight: 700;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
    }
  }
}

/* 体重换算说明条 */
.tip-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 26rpx;
  margin-bottom: 24rpx;
  border-radius: var(--ld-radius-md);
  background: var(--ld-primary-soft);
  color: var(--ld-text-2);
  font-size: 23rpx;
  line-height: 1.5;

  .tb-i { font-size: 28rpx; flex-shrink: 0; }
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
  .s { display: block; margin-top: 12rpx; font-size: 23rpx; color: var(--ld-text-2); line-height: 1.6; }
}

.loading-box {
  text-align: center;
  padding: 80rpx 0;

  .s { display: block; margin-top: 16rpx; font-size: 23rpx; color: var(--ld-text-3); }
}
</style>
