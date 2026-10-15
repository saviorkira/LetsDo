<!-- 文件路径：src/pages/random/index.vue -->
<!-- 随机 Tab（默认首页）：热量限定随机 / 完全随机 双模式菜单生成 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- 顶部模式分段切换 -->
    <view class="seg ld-card">
      <view class="seg-item" :class="{ on: mode === 'heatLimit' }" @click="mode = 'heatLimit'">热量限定随机</view>
      <view class="seg-item" :class="{ on: mode === 'fullRandom' }" @click="mode = 'fullRandom'">完全随机</view>
    </view>

    <!-- ========== Tab1：热量限定随机 ========== -->
    <template v-if="mode === 'heatLimit'">
      <view class="cal-card ld-card">
        <view class="label">目标热量区间</view>
        <view class="kcal-big">
          <text class="num">{{ calRange[0] }}</text>
          <text class="sep">—</text>
          <text class="num">{{ calRange[1] }}</text>
          <text class="unit">kcal</text>
        </view>
        <view class="kcal-sub">整套菜单总热量需落在此区间</view>
        <!-- Wot UI 双滑块（v-model 传数组即双滑块模式），范围 300~1200kcal，步进 50 -->
        <wd-slider v-model="calRange" :min="300" :max="1200" :step="50" />
        <view class="ticks"><text>300</text><text>600</text><text>900</text><text>1200</text></view>
      </view>

      <!-- 筛选按钮：存在已勾选忌口项时显示红点 -->
      <view class="filter-row">
        <view class="filter-btn ld-card" @click="openFilter">
          <text>🧂 筛选</text>
          <view v-if="excludeIds.length" class="dot"></view>
        </view>
        <text v-if="excludeIds.length" class="filter-hint">
          已勾选 <text class="em">{{ excludeIds.length }} 项</text>忌口，生成时将排除对应菜谱
        </text>
      </view>
    </template>

    <!-- ========== Tab2：完全随机 ========== -->
    <template v-else>
      <view class="random-card ld-card">
        <view class="dice">🎲</view>
        <text class="t">不限热量，随缘一餐</text>
        <text class="s">系统随机组合 2~4 道菜谱{'\n'}主食类食材份量不少于 50g</text>
      </view>
      <view class="cause-note">
        <text>完全随机模式不做忌口过滤，若需排除特定食材请切换到「热量限定随机」。</text>
      </view>
    </template>

    <!-- 生成按钮：生成期间置灰 loading，防重复点击 -->
    <wd-button
      type="primary"
      block
      size="large"
      :loading="loading"
      :disabled="loading"
      @click="generate"
    >{{ loading ? '生成中...' : '生成菜单' }}</wd-button>

    <!-- ========== 生成结果 ========== -->
    <template v-if="result">
      <view class="summary ld-card">
        <view class="top">
          <view class="t-l">
            <text class="big">{{ Math.round(result.summary.totalCalories) }}</text>
            <text class="s">整套菜单总热量 kcal</text>
          </view>
          <view class="price">预估总价<text class="b">¥{{ result.summary.totalPrice.toFixed(1) }}</text></view>
        </view>
        <view class="macro">
          <view><text class="s">蛋白质</text><text class="b">{{ result.summary.totalProtein.toFixed(1) }}g</text></view>
          <view><text class="s">脂肪</text><text class="b">{{ result.summary.totalFat.toFixed(1) }}g</text></view>
          <view><text class="s">碳水</text><text class="b">{{ result.summary.totalCarbohydrate.toFixed(1) }}g</text></view>
        </view>
      </view>

      <view class="label" style="margin: 8rpx 4rpx 20rpx">本次搭配（{{ result.recipes.length }} 道）</view>
      <RecipeCard
        v-for="r in result.recipes"
        :key="r._id"
        :recipe="r"
        :ingredient-summary="r.ingredientSummary"
        show-price
      />
    </template>

    <!-- ========== 未生成空状态 ========== -->
    <view v-else class="empty">
      <view class="ico">🔥</view>
      <text class="b">还没有菜单</text>
      <text class="s" v-if="mode === 'heatLimit'">拖动滑块设置热量区间，点击「生成菜单」{'\n'}为你随机搭配 2~4 道菜谱</text>
      <text class="s" v-else>点击「生成菜单」，随机为你搭配一餐</text>
    </view>

    <!-- ========== 忌口筛选弹窗 ========== -->
    <wd-popup v-model="showFilter" position="center" custom-style="width: 620rpx; border-radius: 32rpx; background: var(--ld-card);" @close="cancelFilter">
      <view class="modal">
        <view class="m-head">
          <text class="t">忌口食材筛选</text>
          <text class="s">勾选后，生成菜单将排除包含所选食材的菜谱</text>
        </view>
        <scroll-view scroll-y class="m-body">
          <wd-checkbox-group v-model="tempExcludeIds">
            <wd-checkbox
              v-for="ing in filterOptions"
              :key="ing._id"
              :model-value="ing._id"
              custom-class="filter-check"
            >不要{{ ing.name }}</wd-checkbox>
          </wd-checkbox-group>
          <view v-if="!filterOptions.length" class="m-empty">食材加载中或暂无食材数据</view>
        </scroll-view>
        <view class="m-foot">
          <wd-button plain @click="resetFilter">重置</wd-button>
          <wd-button type="primary" @click="confirmFilter">确认</wd-button>
        </view>
      </view>
    </wd-popup>

    <Disclaimer />
    <!-- 底部占位，避免内容被 TabBar 遮挡 -->
    <view style="height: 140rpx"></view>
    <TabBar active="pages/random/index" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import RecipeCard from '@/components/RecipeCard.vue'

// ---- 页面状态 ----
const mode = ref('heatLimit') // heatLimit 热量限定 / fullRandom 完全随机
const calRange = ref([600, 900]) // 热量区间（双滑块）
const loading = ref(false)
const result = ref(null) // 生成结果 { recipes, summary }

// ---- 忌口筛选状态（仅本次页面会话内保留，页面卸载即重置）----
const filterOptions = ref([]) // 可筛选食材列表（来自 recipeService.filterOptions）
const excludeIds = ref([]) // 已生效的忌口食材 _id
const tempExcludeIds = ref([]) // 弹窗内编辑中的勾选
const showFilter = ref(false)

// 进入页面加载筛选项，失败不阻塞主流程
async function loadFilterOptions() {
  try {
    const res = await callFunction('recipeService', { action: 'filterOptions' })
    if (res.result && res.result.code === 'OK') filterOptions.value = res.result.data
  } catch (e) {
    console.warn('加载筛选项失败', e)
  }
}
onShow(() => {
  if (!filterOptions.value.length) loadFilterOptions()
})
// 页面卸载重置筛选条件（PRD 交互规则）
onUnload(() => {
  excludeIds.value = []
  tempExcludeIds.value = []
})

// ---- 筛选弹窗交互 ----
function openFilter() {
  tempExcludeIds.value = excludeIds.value.slice()
  showFilter.value = true
}
function resetFilter() {
  tempExcludeIds.value = []
}
function confirmFilter() {
  excludeIds.value = tempExcludeIds.value.slice()
  showFilter.value = false
}
function cancelFilter() {
  // 点击遮罩关闭：放弃本次编辑，还原为已生效状态
  tempExcludeIds.value = excludeIds.value.slice()
}

// ---- 生成菜单 ----
async function generate() {
  if (loading.value) return
  loading.value = true
  try {
    const params = mode.value === 'heatLimit'
      ? { mode: 'heatLimit', minCal: calRange.value[0], maxCal: calRange.value[1], excludeIngredientIdList: excludeIds.value }
      : { mode: 'fullRandom' }
    const res = await callFunction('generateMenu', params)
    const ret = res.result || {}
    if (ret.code === 'OK') {
      result.value = ret.data
    } else if (ret.code === 'NO_MATCH') {
      // 无匹配菜谱：弹窗引导放宽条件
      uni.showModal({
        title: '暂无符合条件菜谱',
        content: ret.message || '请放宽筛选条件（取消部分忌口或扩大热量区间）',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#6FBF73'
      })
    } else {
      uni.showToast({ title: ret.message || '生成失败，请稍后再试', icon: 'none' })
    }
  } catch (e) {
    console.error('generateMenu 调用失败', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding: 24rpx 24rpx 0;
}

/* 顶部分段切换 */
.seg {
  display: flex;
  padding: 8rpx;
  border-radius: 999rpx;
  margin-bottom: 24rpx;

  .seg-item {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    font-size: 26rpx;
    color: var(--ld-text-2);
    border-radius: 999rpx;
    transition: all 0.2s;

    &.on {
      background: var(--ld-primary);
      color: #fff;
      font-weight: 600;
    }
  }
}

/* 热量区间卡片 */
.cal-card {
  padding: 32rpx;
  margin-bottom: 24rpx;

  .label {
    font-size: 26rpx;
    font-weight: 600;
    color: var(--ld-text);
    margin-bottom: 16rpx;
  }

  .kcal-big {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 12rpx;

    .num {
      font-size: 56rpx;
      font-weight: 800;
      color: var(--ld-primary-dark);
    }
    .sep { color: var(--ld-text-3); }
    .unit { font-size: 24rpx; color: var(--ld-text-3); }
  }

  .kcal-sub {
    text-align: center;
    font-size: 23rpx;
    color: var(--ld-text-3);
    margin: 8rpx 0 16rpx;
  }

  .ticks {
    display: flex;
    justify-content: space-between;
    font-size: 21rpx;
    color: var(--ld-text-3);
    margin-top: 8rpx;
  }
}

/* 筛选按钮行 */
.filter-row {
  margin-bottom: 24rpx;

  .filter-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    padding: 16rpx 32rpx;
    border-radius: 999rpx;
    font-size: 26rpx;
    color: var(--ld-text);

    .dot {
      position: absolute;
      top: 8rpx;
      right: 8rpx;
      width: 14rpx;
      height: 14rpx;
      border-radius: 50%;
      background: var(--ld-danger);
    }
  }

  .filter-hint {
    display: block;
    margin-top: 12rpx;
    font-size: 23rpx;
    color: var(--ld-text-3);

    .em { color: var(--ld-primary-dark); font-weight: 600; }
  }
}

/* 完全随机说明卡 */
.random-card {
  padding: 52rpx 36rpx;
  text-align: center;
  margin-bottom: 24rpx;

  .dice {
    width: 120rpx;
    height: 120rpx;
    margin: 0 auto 24rpx;
    border-radius: 40rpx;
    background: var(--ld-primary-soft);
    display: grid;
    place-items: center;
    font-size: 60rpx;
  }

  .t { display: block; font-size: 30rpx; font-weight: 700; color: var(--ld-text); }
  .s {
    display: block;
    margin-top: 16rpx;
    font-size: 23rpx;
    color: var(--ld-text-2);
    line-height: 1.7;
    white-space: pre-line;
  }
}

/* 提示条 */
.cause-note {
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 23rpx;
  color: var(--ld-text-2);
  background: var(--ld-primary-soft);
  border-radius: var(--ld-radius-sm);
  padding: 18rpx 24rpx;
  margin-bottom: 24rpx;
  line-height: 1.5;
}

/* 结果汇总卡 */
.summary {
  padding: 32rpx;
  margin-top: 24rpx;
  margin-bottom: 24rpx;

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 24rpx;
    border-bottom: 1rpx dashed var(--ld-line);

    .t-l {
      .big { font-size: 56rpx; font-weight: 800; color: var(--ld-primary-dark); }
      .s { display: block; font-size: 23rpx; color: var(--ld-text-3); margin-top: 4rpx; }
    }

    .price {
      font-size: 23rpx;
      color: var(--ld-text-2);
      .b { font-size: 32rpx; font-weight: 700; color: var(--ld-gold); margin-left: 6rpx; }
    }
  }

  .macro {
    display: flex;
    padding-top: 24rpx;

    > view {
      flex: 1;
      text-align: center;

      .s { display: block; font-size: 23rpx; color: var(--ld-text-3); }
      .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); margin-top: 6rpx; }
    }
  }
}

/* 空状态 */
.empty {
  text-align: center;
  padding: 72rpx 40rpx 24rpx;

  .ico { font-size: 68rpx; margin-bottom: 20rpx; opacity: 0.85; }
  .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
  .s {
    display: block;
    margin-top: 12rpx;
    font-size: 23rpx;
    color: var(--ld-text-2);
    line-height: 1.7;
    white-space: pre-line;
  }
}

/* 筛选弹窗 */
.modal {
  padding: 36rpx 32rpx 32rpx;

  .m-head {
    margin-bottom: 24rpx;
    .t { display: block; font-size: 30rpx; font-weight: 700; color: var(--ld-text); }
    .s { display: block; font-size: 23rpx; color: var(--ld-text-2); margin-top: 8rpx; }
  }

  .m-body {
    max-height: 560rpx;
  }

  .m-empty {
    text-align: center;
    font-size: 23rpx;
    color: var(--ld-text-3);
    padding: 40rpx 0;
  }

  .m-foot {
    display: flex;
    gap: 20rpx;
    margin-top: 28rpx;

    :deep(.wd-button) { flex: 1; }
  }
}

:deep(.filter-check) {
  display: flex;
  padding: 18rpx 4rpx;
}
</style>
