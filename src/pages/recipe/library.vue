<!-- 文件路径：src/pages/recipe/library.vue -->
<!-- 菜品库 Tab：顶部菜品/食材切换 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- 顶部分段切换 -->
    <view class="seg">
      <view
        class="seg-item"
        :class="{ on: tab === 'recipe' }"
        @click="switchTab('recipe')"
      >菜品</view>
      <view
        class="seg-item"
        :class="{ on: tab === 'ingredient' }"
        @click="switchTab('ingredient')"
      >食材</view>
    </view>

    <!-- ========== 菜品 Tab ========== -->
    <template v-if="tab === 'recipe'">
      <!-- 菜名搜索框 -->
      <view class="search">
        <text class="si">🔍</text>
        <input
          class="si-input"
          v-model="keyword"
          placeholder="搜索菜名，如 番茄炒蛋"
          placeholder-class="si-ph"
          confirm-type="search"
          @confirm="onSearch"
        />
        <text v-if="keyword" class="clear" @click="keyword = ''; resetAndLoad()">✕</text>
      </view>

      <!-- 食材筛选按钮（虚线胶囊 + 红点） -->
      <view class="filter-btn" :class="{ on: includeIds.length }" @click="openFilter">
        <text class="fi">🥬</text>
        <text>{{ includeIds.length ? '已选 ' + includeIds.length + ' 种食材' : '按食材筛选' }}</text>
        <view v-if="includeIds.length" class="dot"></view>
      </view>

      <view v-if="total" class="count">共 {{ total }} 道菜品 · 下拉加载更多</view>

      <RecipeCard
        v-for="r in list"
        :key="r._id"
        :recipe="r"
        :show-price="false"
      />

      <!-- 空状态 -->
      <view v-if="!loading && !list.length" class="empty">
        <view class="ico">🍳</view>
        <text class="b">没有符合条件的菜品</text>
        <text class="s">换个关键词或清空食材筛选试试</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-box">
        <wd-loading color="#6FBF73" />
        <text class="s">菜品加载中...</text>
      </view>
      <view v-else-if="list.length && !hasMore" class="loading-box">
        <text class="s">已经到底啦</text>
      </view>
    </template>

    <!-- ========== 食材 Tab ========== -->
    <template v-else>
      <!-- 食材搜索框 -->
      <view class="search">
        <text class="si">🔍</text>
        <input
          class="si-input"
          v-model="ingKeyword"
          placeholder="搜索食材，如 鸡蛋"
          placeholder-class="si-ph"
          confirm-type="search"
          @confirm="onIngSearch"
        />
        <text v-if="ingKeyword" class="clear" @click="ingKeyword = ''; loadIngredients()">✕</text>
      </view>

      <!-- 食材分类 chips -->
      <scroll-view scroll-x class="cats" show-scrollbar="false">
        <view
          v-for="c in ingCategories"
          :key="c.key"
          class="cat"
          :class="{ on: ingCategory === c.key }"
          @click="ingCategory = c.key; loadIngredients()"
        >{{ c.label }}</view>
      </scroll-view>

      <view v-if="ingredients.length" class="count">共 {{ ingredients.length }} 种食材</view>

      <!-- 食材卡片列表（单列横排，与菜品卡片一致） -->
      <view v-if="!ingLoading && ingredients.length" class="ing-list">
        <view
          v-for="ing in ingredients"
          :key="ing._id"
          class="ing-item"
          @click="goIngDetail(ing)"
        >
          <view class="ing-img-wrap">
            <image
              v-if="ing.imageUrl"
              class="ing-img"
              :src="ing.imageUrl"
              mode="aspectFill"
            />
            <text v-else class="ing-emoji">{{ foodEmoji(ing.name) }}</text>
          </view>
          <view class="ing-info">
            <text class="ing-n">{{ ing.name }}</text>
            <text class="ing-kcal">{{ Math.round(ing.calories) }}kcal/100g · ¥{{ (Number(ing.price) || 0).toFixed(1) }}/斤</text>
          </view>
          <text class="ing-arrow">›</text>
        </view>
      </view>

      <view v-if="!ingLoading && !ingredients.length" class="empty">
        <view class="ico">🥬</view>
        <text class="b">没有找到食材</text>
        <text class="s">换个关键词试试</text>
      </view>
      <view v-if="ingLoading" class="loading-box">
        <wd-loading color="#6FBF73" />
        <text class="s">食材加载中...</text>
      </view>
    </template>

    <!-- ========== 菜品筛选弹窗 ========== -->
    <wd-popup v-model="showFilter" position="center" custom-style="width: 600rpx; border-radius: 32rpx; background: var(--ld-card); padding: 0; overflow: hidden;">
      <view class="modal">
        <view class="m-head">
          <text class="t">按食材筛选</text>
          <text class="s">勾选后，仅展示包含所选食材的菜品</text>
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
              <text class="hint">只看用了{{ ing.name }}的菜品</text>
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
import { foodEmoji } from '@/utils/foodEmoji'
import { isDark } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import RecipeCard from '@/components/RecipeCard.vue'

// 当前 tab：recipe / ingredient
const tab = ref('recipe')

// ---- 菜品 Tab 状态 ----
const list = ref([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const total = ref(0)
const PAGE_SIZE = 10

const keyword = ref('')
let searchTimer = null
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(resetAndLoad, 300)
})

const filterOptions = ref([])
const includeIds = ref([])
const tempIncludeIds = ref([])
const showFilter = ref(false)

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
      const newList = Array.isArray(d) ? d : (d.list || [])
      if (page.value === 1) list.value = newList
      else list.value = list.value.concat(newList)
      total.value = Array.isArray(d) ? d.length : (d.total || 0)
      hasMore.value = Array.isArray(d) ? false : !!d.hasMore
    } else {
      uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('菜品列表加载失败', e)
    uni.showToast({ title: '网络异常', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function resetAndLoad() {
  page.value = 1; hasMore.value = true; list.value = []; loadList()
}
function onSearch() { resetAndLoad() }

onReachBottom(() => {
  if (tab.value !== 'recipe') return
  if (!loading.value && hasMore.value) { page.value += 1; loadList() }
})

async function loadFilterOptions() {
  try {
    const fetchP = callFunction('recipeService', { action: 'filterOptions' })
    const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
    const res = await Promise.race([fetchP, timeoutP])
    const ret = res.result || {}
    if (ret.code === 'OK' && ret.data && ret.data.length) {
      filterOptions.value = ret.data
    }
  } catch (e) {}
}

// ---- 食材 Tab 状态 ----
const ingredients = ref([])
const ingLoading = ref(false)
const ingKeyword = ref('')
const ingCategory = ref('')
const ingCategories = [
  { key: '', label: '全部' },
  { key: 'meat', label: '肉类' },
  { key: 'seafood', label: '海鲜' },
  { key: 'veg', label: '蔬菜' },
  { key: 'staple', label: '主食' },
  { key: 'condiment', label: '调料' }
]

async function loadIngredients() {
  ingLoading.value = true
  try {
    const res = await callFunction('recipeService', {
      action: 'listIngredients',
      keyword: ingKeyword.value,
      category: ingCategory.value || undefined
    })
    const ret = res.result || {}
    if (ret.code === 'OK') ingredients.value = ret.data || []
    else uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
  } catch (e) {
    console.error('食材加载失败', e)
    uni.showToast({ title: '网络异常', icon: 'none' })
  } finally {
    ingLoading.value = false
  }
}
function onIngSearch() { loadIngredients() }

function switchTab(t) {
  if (tab.value === t) return
  tab.value = t
  // 切到食材 Tab 时若列表为空则主动加载，避免出现「没有找到食材」假空态
  if (t === 'ingredient' && !ingredients.value.length) loadIngredients()
}
function goIngDetail(ing) {
  uni.navigateTo({ url: `/pages/ingredient/detail?id=${ing._id}` })
}

onShow(() => {
  if (tab.value === 'recipe') {
    loadFilterOptions()
    loadList()
  } else {
    loadIngredients()
  }
})

// ---- 筛选弹窗 ----
function openFilter() { tempIncludeIds.value = includeIds.value.slice(); showFilter.value = true }
function toggleInclude(id) {
  const idx = tempIncludeIds.value.indexOf(id)
  if (idx >= 0) tempIncludeIds.value.splice(idx, 1)
  else tempIncludeIds.value.push(id)
}
function resetFilter() { tempIncludeIds.value = [] }
function confirmFilter() { includeIds.value = tempIncludeIds.value.slice(); showFilter.value = false; resetAndLoad() }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: var(--ld-bg); padding: 24rpx 24rpx 0; }

/* 顶部分段切换 */
.seg {
  display: flex;
  background: color-mix(in srgb, var(--ld-text-3) 16%, transparent);
  border-radius: 24rpx;
  padding: 8rpx;
  margin-bottom: 24rpx;

  .seg-item {
    flex: 1;
    text-align: center;
    font-size: 24rpx;
    padding: 16rpx 0;
    border-radius: 18rpx;
    color: var(--ld-text-2);
    font-weight: 600;
    transition: all 0.2s;

    &.on {
      background: var(--ld-card);
      color: var(--ld-primary-dark);
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
    }
  }
}

/* 搜索框 */
.search {
  display: flex;
  align-items: center;
  gap: 14rpx;
  height: 88rpx;
  padding: 0 28rpx;
  margin-bottom: 20rpx;
  background: var(--ld-card);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(60, 80, 50, 0.05);

  .si { font-size: 30rpx; flex-shrink: 0; }
  .si-input { flex: 1; min-width: 0; font-size: 28rpx; color: var(--ld-text); }
  .si-ph { color: var(--ld-text-3); font-size: 27rpx; }
  .clear {
    flex-shrink: 0; width: 40rpx; height: 40rpx; border-radius: 50%;
    background: var(--ld-bg); color: var(--ld-text-3); font-size: 24rpx;
    display: flex; align-items: center; justify-content: center;
  }
}

.filter-btn {
  position: relative;
  display: flex; align-items: center; justify-content: center; gap: 12rpx;
  padding: 24rpx; margin-bottom: 20rpx;
  border-radius: 26rpx;
  border: 2rpx dashed rgba(111, 191, 115, 0.55);
  background: var(--ld-primary-soft);
  color: var(--ld-primary-dark);
  font-size: 27rpx; font-weight: 600;

  .fi { font-size: 30rpx; }
  .dot {
    position: absolute; top: -10rpx; right: -10rpx;
    width: 22rpx; height: 22rpx; background: var(--ld-danger, #ef5350);
    border: 4rpx solid var(--ld-bg); border-radius: 50%;
  }
}

.count { font-size: 23rpx; color: var(--ld-text-2); margin: 0 4rpx 20rpx; }

/* 食材分类 chips */
.cats {
  white-space: nowrap;
  padding: 8rpx 4rpx 16rpx;
  margin-bottom: 12rpx;

  .cat {
    display: inline-block;
    padding: 14rpx 32rpx;
    margin-right: 16rpx;
    border-radius: 999rpx;
    font-size: 24rpx;
    background: var(--ld-card);
    color: var(--ld-text-2);
    border: 1rpx solid var(--ld-line);
    transition: all 0.2s;

    &.on {
      background: var(--ld-primary);
      color: #fff;
      font-weight: 600;
      border-color: var(--ld-primary);
    }
  }
}

/* 食材卡片列表（单列横排） */
.ing-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.ing-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: var(--ld-card);
  border-radius: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(60, 80, 50, 0.05);

  .ing-img-wrap {
    width: 96rpx; height: 96rpx; border-radius: 18rpx;
    background: var(--ld-bg-2, #f2f2f2);
    display: grid; place-items: center; overflow: hidden;
    flex-shrink: 0;
  }
  .ing-img { width: 100%; height: 100%; object-fit: cover; }
  .ing-emoji { font-size: 48rpx; line-height: 1; }
  .ing-info {
    flex: 1; min-width: 0;

    .ing-n { display: block; font-size: 28rpx; font-weight: 600; color: var(--ld-text); }
    .ing-kcal { display: block; margin-top: 6rpx; font-size: 22rpx; color: var(--ld-text-3); }
  }
  .ing-arrow { font-size: 36rpx; color: var(--ld-text-3); flex-shrink: 0; }
}

.empty {
  text-align: center; padding: 120rpx 40rpx;
  .ico { font-size: 68rpx; margin-bottom: 20rpx; }
  .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
  .s { display: block; margin-top: 12rpx; font-size: 23rpx; color: var(--ld-text-2); }
}
.loading-box { text-align: center; padding: 80rpx 0; .s { display: block; margin-top: 16rpx; font-size: 23rpx; color: var(--ld-text-3); } }

/* 筛选弹窗 */
.modal { display: flex; flex-direction: column; max-height: 80vh; }
.m-head { padding: 36rpx 32rpx 20rpx; .t { display: block; font-size: 32rpx; font-weight: 800; color: var(--ld-text); } .s { display: block; margin-top: 10rpx; font-size: 23rpx; color: var(--ld-text-2); } }
.m-body { max-height: 50vh; padding: 0 32rpx; }
.checkbox { display: flex; align-items: center; gap: 20rpx; padding: 22rpx 12rpx; border-bottom: 1rpx solid var(--ld-line);
  .box { width: 40rpx; height: 40rpx; border-radius: 10rpx; border: 3rpx solid var(--ld-text-3); color: transparent; font-size: 26rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  &.on .box { background: var(--ld-primary); border-color: var(--ld-primary); color: #fff; }
  .ct .main { display: block; font-size: 28rpx; color: var(--ld-text); } .ct .hint { display: block; margin-top: 4rpx; font-size: 22rpx; color: var(--ld-text-3); } }
.m-empty { padding: 60rpx 0; text-align: center; font-size: 24rpx; color: var(--ld-text-3); }
.m-foot { display: flex; gap: 20rpx; padding: 24rpx 32rpx 36rpx; :deep(.wd-button) { flex: 1; } }
</style>
