<!-- 文件路径：src/pages/recipe/library.vue -->
<!-- 菜单库 Tab：菜名搜索 + 食材筛选 + 菜谱卡片列表 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- 菜名搜索框 -->
    <view class="search">
      <text class="si">🔍</text>
      <input
        class="si-input"
        v-model="keyword"
        placeholder="搜索菜名，如 番茄炒蛋"
        placeholder-class="si-ph"
        confirm-type="search"
      />
      <text v-if="keyword" class="clear" @click="keyword = ''">✕</text>
    </view>

    <!-- 食材筛选按钮（虚线胶囊 + 红点，与随机页同款） -->
    <view class="filter-btn" :class="{ on: includeIds.length }" @click="openFilter">
      <text class="fi">🥬</text>
      <text>{{ includeIds.length ? '已选 ' + includeIds.length + ' 种食材' : '按食材筛选' }}</text>
      <view v-if="includeIds.length" class="dot"></view>
    </view>

    <view v-if="total" class="count">共 {{ total }} 道菜谱 · 下拉加载更多</view>

    <RecipeCard
      v-for="r in list"
      :key="r._id"
      :recipe="r"
      :show-price="false"
    />

    <!-- 空状态 -->
    <view v-if="!loading && !list.length" class="empty">
      <view class="ico">🍳</view>
      <text class="b">没有符合条件的菜谱</text>
      <text class="s">换个关键词或清空食材筛选试试</text>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-box">
      <wd-loading color="#6FBF73" />
      <text class="s">菜谱加载中...</text>
    </view>
    <view v-else-if="list.length && !hasMore" class="loading-box">
      <text class="s">已经到底啦</text>
    </view>

    <!-- ========== 食材筛选弹窗 ========== -->
    <wd-popup v-model="showFilter" position="center" custom-style="width: 600rpx; border-radius: 32rpx; background: var(--ld-card); padding: 0; overflow: hidden;">
      <view class="modal">
        <view class="m-head">
          <text class="t">按食材筛选</text>
          <text class="s">勾选后，仅展示包含所选食材的菜谱</text>
        </view>
        <scroll-view scroll-y class="m-body">
          <view
            v-for="ing in filterOptions"
            :key="ing._id"
            class="checkbox"
            :class="{ on: tempIncludeIds.includes(ing._id) }"
            @click="toggleInclude(ing._id)"
          >
            <view class="box">✓</view>
            <view class="ct">
              <text class="main">含{{ ing.name }}</text>
              <text class="hint">只看用了{{ ing.name }}的菜谱</text>
            </view>
          </view>
          <view v-if="!filterOptions.length" class="m-empty">食材加载中或暂无食材数据</view>
        </scroll-view>
        <view class="m-foot">
          <wd-button plain @click="resetFilter">重置</wd-button>
          <wd-button type="primary" @click="confirmFilter">确认</wd-button>
        </view>
      </view>
    </wd-popup>

    <Disclaimer />
    <view style="height: 160rpx"></view>
    <TabBar active="pages/recipe/library" />
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import RecipeCard from '@/components/RecipeCard.vue'

const list = ref([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)
const PAGE_SIZE = 10

// ---- 菜名搜索（服务端过滤，避免本地只能搜已加载页）----
const keyword = ref('')
let searchTimer = null
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    resetAndLoad()
  }, 300)
})

// ---- 食材筛选 ----
const filterOptions = ref([])
const includeIds = ref([])
const tempIncludeIds = ref([])
const showFilter = ref(false)

// 拉取菜谱列表（分页）
async function loadList() {
  if (loading.value) return
  if (!hasMore.value && page.value > 1) return
  loading.value = true
  try {
    const res = await callFunction('recipeService', {
      action: 'list',
      includeIngredientIdList: includeIds.value,
      keyword: keyword.value,
      page: page.value,
      pageSize: PAGE_SIZE
    })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      const d = ret.data || {}
      // 兼容旧版云函数（返回数组）和新版（返回 {list,total,hasMore}）
      const newList = Array.isArray(d) ? d : (d.list || [])
      if (page.value === 1) {
        list.value = newList
      } else {
        list.value = list.value.concat(newList)
      }
      total.value = Array.isArray(d) ? d.length : (d.total || 0)
      hasMore.value = Array.isArray(d) ? false : !!d.hasMore
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

// 拉取食材筛选项（3 秒超时兜底，失败用默认项）
async function loadFilterOptions() {
  try {
    const fetchP = callFunction('recipeService', { action: 'filterOptions' })
    const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
    const res = await Promise.race([fetchP, timeoutP])
    const ret = res.result || {}
    if (ret.code === 'OK' && ret.data && ret.data.length) {
      filterOptions.value = ret.data
    }
  } catch (e) {
    console.warn('筛选项加载失败，使用默认选项', e && e.message)
  }
}

onShow(() => {
  loadFilterOptions()
  loadList()
})

// ---- 筛选弹窗交互 ----
function openFilter() {
  tempIncludeIds.value = includeIds.value.slice()
  showFilter.value = true
}
function toggleInclude(id) {
  const idx = tempIncludeIds.value.indexOf(id)
  if (idx >= 0) tempIncludeIds.value.splice(idx, 1)
  else tempIncludeIds.value.push(id)
}
function resetFilter() {
  tempIncludeIds.value = []
}
function confirmFilter() {
  includeIds.value = tempIncludeIds.value.slice()
  showFilter.value = false
  resetAndLoad()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding: 24rpx 24rpx 0;
}

/* 菜名搜索框 */
.search {
  display: flex;
  align-items: center;
  gap: 14rpx;
  height: 88rpx;
  padding: 0 28rpx;
  margin-bottom: 24rpx;
  background: var(--ld-card);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(60, 80, 50, 0.05);

  .si { font-size: 30rpx; flex-shrink: 0; }

  .si-input {
    flex: 1;
    min-width: 0;
    font-size: 28rpx;
    color: var(--ld-text);
  }

  .si-ph { color: var(--ld-text-3); font-size: 27rpx; }

  .clear {
    flex-shrink: 0;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: var(--ld-bg);
    color: var(--ld-text-3);
    font-size: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 食材筛选虚线按钮（与随机页同款） */
.filter-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  border-radius: 26rpx;
  border: 2rpx dashed rgba(111, 191, 115, 0.55);
  background: var(--ld-primary-soft);
  color: var(--ld-primary-dark);
  font-size: 27rpx;
  font-weight: 600;

  .fi { font-size: 30rpx; }

  .dot {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
    width: 22rpx;
    height: 22rpx;
    background: var(--ld-danger, #ef5350);
    border: 4rpx solid var(--ld-bg);
    border-radius: 50%;
  }
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

/* 筛选弹窗 */
.modal {
  display: flex;
  flex-direction: column;
  max-height: 80vh;

  .m-head {
    padding: 36rpx 32rpx 20rpx;

    .t { display: block; font-size: 32rpx; font-weight: 800; color: var(--ld-text); }
    .s { display: block; margin-top: 10rpx; font-size: 23rpx; color: var(--ld-text-2); }
  }

  .m-body {
    max-height: 50vh;
    padding: 0 32rpx;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 22rpx 12rpx;
    border-bottom: 1rpx solid var(--ld-line);

    .box {
      width: 40rpx;
      height: 40rpx;
      border-radius: 10rpx;
      border: 3rpx solid var(--ld-text-3);
      color: transparent;
      font-size: 26rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    &.on .box {
      background: var(--ld-primary);
      border-color: var(--ld-primary);
      color: #fff;
    }

    .ct {
      .main { display: block; font-size: 28rpx; color: var(--ld-text); }
      .hint { display: block; margin-top: 4rpx; font-size: 22rpx; color: var(--ld-text-3); }
    }
  }

  .m-empty {
    padding: 60rpx 0;
    text-align: center;
    font-size: 24rpx;
    color: var(--ld-text-3);
  }

  .m-foot {
    display: flex;
    gap: 20rpx;
    padding: 24rpx 32rpx 36rpx;

    :deep(.wd-button) { flex: 1; }
  }
}
</style>
