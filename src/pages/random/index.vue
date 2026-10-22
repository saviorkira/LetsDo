<!-- 文件路径：src/pages/random/index.vue -->
<!-- 随机 Tab（默认首页）：热量限定随机 / 完全随机 / 随机运动 三模式 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- 顶部模式分段切换 -->
    <view class="seg">
      <view class="seg-item" :class="{ on: mode === 'heatLimit' }" @click="mode = 'heatLimit'">随机菜单</view>
      <view class="seg-item" :class="{ on: mode === 'fullRandom' }" @click="mode = 'fullRandom'">随机食材</view>
      <view class="seg-item" :class="{ on: mode === 'exercise' }" @click="mode = 'exercise'">随机运动</view>
    </view>

    <!-- 模式面板：统一高度，保证三种模式下「操作按钮」位置完全一致 -->
    <view class="panel">
      <!-- ========== 热量限定随机 ========== -->
      <template v-if="mode === 'heatLimit'">
        <view class="cal-card">
          <view class="label">目标热量区间</view>
          <view class="kcal-big">
            <text class="num">{{ calRange[0] }}</text>
            <text class="sep">—</text>
            <text class="num">{{ calRange[1] }}</text>
            <text class="unit">kcal</text>
          </view>
          <view class="kcal-sub">整套菜单总热量需落在此区间</view>
          <!-- Wot UI 双滑块（v-model 传入数组即为双滑块模式） -->
          <view class="slider-wrap">
            <wd-slider v-model="calRange" :min="300" :max="1200" :step="50" />
          </view>
          <view class="ticks"><text>300</text><text>600</text><text>900</text><text>1200</text></view>
        </view>

        <view class="secondary">
          <!-- 忌口按钮（虚线胶囊 + 红点） -->
          <view class="filter-btn" :class="{ on: excludeIds.length }" @click="openFilter">
            <text>忌口</text>
            <view v-if="excludeIds.length" class="dot"></view>
          </view>
          <!-- 提示行：固定高度，无选中时隐藏但保留占位，避免按钮位移 -->
          <text class="filter-hint" :class="{ hide: !excludeIds.length }">
            已勾选 <em>{{ excludeIds.length }}</em> 项忌口，生成时将排除对应菜品
          </text>
        </view>
      </template>

      <!-- ========== 完全随机 ========== -->
      <template v-else-if="mode === 'fullRandom'">
        <view class="random-card">
          <view class="dice">🎲</view>
          <text class="t">随机食材，随缘拼菜</text>
          <text class="s">系统随机抽取 2~4 种食材\n为它们组合出一个合适的菜名</text>
        </view>
        <!-- 菜品类型筛选 -->
        <view class="dish-types">
          <view
            v-for="t in dishTypes"
            :key="t.key"
            class="dt-chip"
            :class="{ on: dishType === t.key }"
            @click="dishType = t.key"
          >{{ t.label }}</view>
        </view>
        <view class="secondary">
          <view class="cause-note">
            <text class="cn">ℹ️</text>
            <text>随机食材模式完全看缘分，不做忌口过滤；需要排除食材请用「随机菜单」。</text>
          </view>
        </view>
      </template>

      <!-- ========== 随机运动 ========== -->
      <template v-else>
        <view class="random-card">
          <view class="dice">🏃</view>
          <text class="t">随便动一动</text>
          <text class="s">按你的体重随机推荐一项运动\n并给出建议时长与消耗热量</text>
        </view>
        <view class="secondary">
          <view class="cause-note">
            <text class="cn">ℹ️</text>
            <text>消耗热量按「MET × 3.5 × 体重 ÷ 200」计算，在「我的」录入身高体重后更准确。</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 主操作按钮：菜单生成 / 随机运动 -->
    <wd-button
      type="primary"
      block
      size="large"
      :loading="loading"
      :disabled="loading"
      @click="onMainAction"
    >{{ mainBtnText }}</wd-button>

    <!-- ========== 随机运动结果 ========== -->
    <template v-if="mode === 'exercise'">
      <template v-if="exerciseResult">
        <view class="result-divider">
          <view class="line"></view>
          <text class="txt">随机运动推荐</text>
          <view class="line"></view>
        </view>

        <ExerciseCard
          :exercise="exerciseResult"
          :minutes="exerciseResult.suggestMinutes"
          :burn="exerciseResult.suggestBurn"
        />

        <view class="ex-calc ld-card">
          <text class="ec-t">消耗计算过程</text>
          <text class="ec-l">每分钟消耗 = {{ exerciseResult.met }} MET × 3.5 × {{ exerciseResult.weight }}kg ÷ 200 = {{ exerciseResult.kcalPerMin.toFixed(1) }} kcal/分钟</text>
          <text class="ec-l">建议 {{ exerciseResult.suggestMinutes }} 分钟 → 约消耗 {{ Math.round(exerciseResult.suggestBurn) }} kcal</text>
        </view>
      </template>

      <view v-else class="empty">
        <view class="ico">🏃</view>
        <text class="b">还没有推荐</text>
        <text class="s">点击「随机运动」，按体重随机推荐一项运动</text>
      </view>
    </template>

    <!-- ========== 菜单生成结果（随机菜单模式） ========== -->
    <template v-else-if="mode === 'heatLimit' && result">
      <!-- 分隔线：把「生成按钮」与下方结果清晰分开 -->
      <view class="result-divider">
        <view class="line"></view>
        <text class="txt">本次生成结果</text>
        <view class="line"></view>
      </view>

      <!-- 绿色渐变汇总卡 -->
      <view class="summary">
        <text class="sum-name">{{ result.recipes.map(r => r.name).join(' + ') }}</text>
        <view class="top">
          <view class="t-l">
            <text class="big">{{ Math.round(result.summary.totalCalories) }}大卡</text>
            <text class="s">预估热量</text>
          </view>
          <view class="price">预估总价<b>¥{{ result.summary.totalPrice.toFixed(1) }}</b></view>
        </view>
        <view class="macro">
          <view><text class="s">蛋白质</text><text class="b">{{ result.summary.totalProtein.toFixed(1) }}g</text></view>
          <view><text class="s">脂肪</text><text class="b">{{ result.summary.totalFat.toFixed(1) }}g</text></view>
          <view><text class="s">碳水</text><text class="b">{{ result.summary.totalCarbohydrate.toFixed(1) }}g</text></view>
        </view>
      </view>

      <view class="list-label">本次搭配（{{ result.recipes.length }} 道）</view>
      <RecipeCard
        v-for="r in result.recipes"
        :key="r._id"
        :recipe="r"
        :ingredient-summary="r.ingredientSummary"
        show-price
      />
    </template>

    <!-- ========== 随机食材结果 ========== -->
    <template v-else-if="mode === 'fullRandom' && dishResult">
      <view class="result-divider">
        <view class="line"></view>
        <text class="txt">本次随机食材</text>
        <view class="line"></view>
      </view>

      <!-- 绿色渐变汇总卡（与随机菜单同款） -->
      <view class="summary dish-summary">
        <text class="sum-name">{{ dishResult.dishName }}</text>
        <view class="top">
          <view class="t-l">
            <text class="big">{{ dishResult.summary.totalCalories }}大卡</text>
            <text class="s">预估热量</text>
          </view>
          <view class="price">预估总价<b>¥{{ dishResult.summary.totalPrice.toFixed(1) }}</b></view>
        </view>
        <view class="macro">
          <view><text class="s">蛋白质</text><text class="b">{{ dishResult.summary.totalProtein.toFixed(1) }}g</text></view>
          <view><text class="s">脂肪</text><text class="b">{{ dishResult.summary.totalFat.toFixed(1) }}g</text></view>
          <view><text class="s">碳水</text><text class="b">{{ dishResult.summary.totalCarbohydrate.toFixed(1) }}g</text></view>
        </view>
      </view>

      <view class="list-label">本次搭配（{{ dishResult.ingredientList.length }} 种）</view>
      <view class="dish-ings">
        <view v-for="ing in dishResult.ingredientList" :key="ing.ingredientId" class="di" @click="goIngDetail(ing.ingredientId)">
          <image v-if="ing.imageUrl" class="di-img" :src="ing.imageUrl" mode="aspectFill" />
          <text v-else class="di-emoji">{{ foodEmoji(ing.name) }}</text>
          <text class="di-n">{{ ing.name }}</text>
          <text class="di-w">{{ ing.weight }}g · {{ Math.round(ing.calories) }}kcal</text>
          <text class="di-arrow">›</text>
        </view>
      </view>
    </template>

    <!-- ========== 未生成空状态 ========== -->
    <view v-else class="empty">
      <view class="ico">🔥</view>
      <text class="b">还没有菜单</text>
      <text class="s">{{ emptyText }}</text>
    </view>

    <!-- ========== 忌口筛选弹窗 ========== -->
    <wd-popup v-model="showFilter" position="center" custom-style="width: 600rpx; border-radius: 32rpx; background: var(--ld-card); padding: 0; overflow: hidden;">
      <view class="modal">
        <view class="m-head">
          <text class="t">忌口食材筛选</text>
          <text class="s">勾选后，生成菜单将排除包含所选食材的菜品</text>
        </view>
        <scroll-view scroll-y class="m-body">
          <view
            v-for="ing in filterOptions"
            :key="ing._id"
            class="checkbox"
            :class="{ on: tempExcludeIds.includes(ing._id) }"
            @click="toggleExclude(ing._id)"
          >
            <view class="ct">
              <text class="main">{{ ing.label || ('不吃' + ing.name) }}</text>
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
    <TabBar active="pages/random/index" />
  </view>
</template>

<script setup>
// 文件路径：src/pages/random/index.vue (script)
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import { foodEmoji } from '@/utils/foodEmoji'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import ExerciseCard from '@/components/ExerciseCard.vue'

// ---- 页面状态 ----
const mode = ref('heatLimit')
const calRange = ref([600, 900])
const loading = ref(false)
const result = ref(null)
const dishResult = ref(null)
const exerciseResult = ref(null)
// 随机食材：菜品类型筛选（'' = 全部）
const dishType = ref('')
const dishTypes = [
  { key: '', label: '全部' },
  { key: 'noodle', label: '面' },
  { key: 'rice', label: '盖饭' },
  { key: 'sandwich', label: '三明治' },
  { key: 'stirfry', label: '炒菜' }
]

// 主按钮文案随模式变化
const mainBtnText = computed(() => {
  if (mode.value === 'exercise') return loading.value ? '随机中...' : '随机运动'
  if (mode.value === 'fullRandom') return loading.value ? '组合中...' : '随机食材'
  return loading.value ? '生成中...' : '随机菜单'
})

// 空状态提示文案
const emptyText = computed(() => {
  if (mode.value === 'heatLimit') return '拖动滑块设置热量区间，点击「随机菜单」为你随机搭配 2~4 道菜品'
  if (mode.value === 'fullRandom') return '点击「随机食材」，随机抽取 2~4 种食材，为它们组合出一道菜'
  return '点击「随机运动」，按体重随机推荐一项运动'
})

// ---- 忌口筛选状态（仅本次页面会话内保留）----
// 先放默认 mock 数据，保证弹窗不会空；云端 ingredient 数据加载成功后覆盖
const filterOptions = ref([
  { _id: 'mock-cilantro', name: '香菜', label: '不吃香菜' },
  { _id: 'mock-pork', name: '猪肉', label: '不吃猪肉' },
  { _id: 'mock-carrot', name: '胡萝卜', label: '不吃胡萝卜' },
  { _id: 'mock-onion', name: '洋葱', label: '不吃洋葱' }
])
// 忌口筛选暂时固定只展示这 4 种食材（顺序即展示顺序）
const FILTER_NAMES = ['香菜', '猪肉', '胡萝卜', '洋葱']
const excludeIds = ref([])
const tempExcludeIds = ref([])
const showFilter = ref(false)

// 加载筛选项：Promise.race 3s 超时，避免云函数未部署时卡住页面
async function loadFilterOptions() {
  try {
    const fetchP = callFunction('recipeService', { action: 'filterOptions' })
    const timeoutP = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
    const res = await Promise.race([fetchP, timeoutP])
    const ret = res.result || {}
    if (ret.code === 'OK' && ret.data && ret.data.length) {
      // 只保留固定 4 种忌口食材，按 FILTER_NAMES 顺序；用真实 _id 才能命中云端排除逻辑
      const picked = []
      for (const name of FILTER_NAMES) {
        const hit = ret.data.find(ing => ing.name === name)
        if (hit) picked.push({ _id: hit._id, name, label: '不吃' + name })
      }
      if (picked.length) filterOptions.value = picked
    }
  } catch (e) {
    // 超时 / 云函数未部署：保留默认 mock 数据即可
    console.warn('筛选项加载失败（可能云函数未部署），使用默认选项', e && e.message)
  }
}

onLoad(() => {
  // 页面首次加载时异步获取筛选项，不阻塞渲染
  loadFilterOptions()
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
function toggleExclude(id) {
  const idx = tempExcludeIds.value.indexOf(id)
  if (idx >= 0) tempExcludeIds.value.splice(idx, 1)
  else tempExcludeIds.value.push(id)
}
function resetFilter() {
  tempExcludeIds.value = []
}
function confirmFilter() {
  excludeIds.value = tempExcludeIds.value.slice()
  showFilter.value = false
}

// ---- 主按钮：按当前模式分发 ----
function onMainAction() {
  if (mode.value === 'exercise') return randomExercise()
  return generate()
}

// ---- 生成（随机菜单 / 随机食材） ----
async function generate() {
  if (loading.value) return
  loading.value = true
  try {
    if (mode.value === 'fullRandom') {
      // 随机食材：云端随机抽取食材并组合菜名
      const res = await callFunction('recipeService', { action: 'randomDish', dishType: dishType.value || undefined })
      const ret = res.result || {}
      if (ret.code === 'OK') {
        dishResult.value = ret.data
        result.value = null
        uni.pageScrollTo({ scrollTop: 0, duration: 200 })
      } else {
        uni.showToast({ title: ret.message || '组合失败，请稍后再试', icon: 'none' })
      }
      return
    }
    // 随机菜单：按热量区间搭配菜谱
    const params = { mode: 'heatLimit', minCal: calRange.value[0], maxCal: calRange.value[1], excludeIngredientIdList: excludeIds.value }
    const res = await callFunction('generateMenu', params)
    const ret = res.result || {}
    if (ret.code === 'OK') {
      result.value = ret.data
      dishResult.value = null
      uni.pageScrollTo({ scrollTop: 0, duration: 200 })
    } else if (ret.code === 'NO_MATCH') {
      uni.showModal({
        title: '暂无符合条件菜品',
        content: ret.message || '请放宽忌口条件（取消部分忌口或扩大热量区间）',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#6FBF73'
      })
    } else {
      uni.showToast({ title: ret.message || '生成失败，请稍后再试', icon: 'none' })
    }
  } catch (e) {
    console.error('[generate] catch 错误:', e)
    uni.showToast({ title: (e && e.errMsg) || '网络异常，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

// ---- 跳转食材详情页 ----
function goIngDetail(ingredientId) {
  if (!ingredientId) return
  uni.navigateTo({ url: `/pages/ingredient/detail?id=${ingredientId}` })
}

// ---- 随机运动：云端按体重随机返回一项运动 ----
async function randomExercise() {
  if (loading.value) return
  loading.value = true
  try {
    const res = await callFunction('exerciseService', { action: 'random' })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      exerciseResult.value = ret.data
      uni.pageScrollTo({ scrollTop: 0, duration: 200 })
    } else {
      uni.showToast({ title: ret.message || '随机失败，请稍后再试', icon: 'none' })
    }
  } catch (e) {
    console.error('[randomExercise] 错误:', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
/* 精确对齐 UI 设计稿 (UI_design.html) 色值与间距 */
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding: 28rpx 32rpx 0;
  box-sizing: border-box;
}

/* 顶部分段控制：浅灰底 + 白色浮起激活项 */
.seg {
  display: flex;
  background: color-mix(in srgb, var(--ld-text-3) 16%, transparent);
  border-radius: 24rpx;
  padding: 8rpx;
  margin-bottom: 28rpx;

  .seg-item {
    flex: 1;
    text-align: center;
    font-size: 22rpx;
    white-space: nowrap;
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

/* 模式面板：卡片 + 次要元素总高度固定，保证主按钮位置一致 */
.panel {
  min-height: 528rpx;
}

/* === 通用卡 === */
.label {
  font-size: 23rpx;
  font-weight: 700;
  color: var(--ld-text-2);
  letter-spacing: 0.4rpx;
  margin-bottom: 20rpx;
}

/* === 热量卡片 / 随机卡片：统一高度 === */
.cal-card,
.random-card {
  box-sizing: border-box;
  min-height: 388rpx;
  background: var(--ld-card);
  border-radius: var(--ld-radius-lg);
  box-shadow: 0 8rpx 28rpx rgba(60, 80, 50, 0.06);
  margin-bottom: 28rpx;
}

.cal-card {
  padding: 32rpx;
}

.kcal-big {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 8rpx;

  .num {
    font-size: 60rpx;
    font-weight: 800;
    color: var(--ld-primary-dark);
    letter-spacing: -1rpx;
  }
  .sep { color: var(--ld-text-3); }
  .unit { font-size: 24rpx; color: var(--ld-text-3); font-weight: 600; }
}

.kcal-sub {
  text-align: center;
  font-size: 23rpx;
  color: var(--ld-text-3);
  margin-bottom: 32rpx;
}

.slider-wrap {
  padding: 0 4rpx;

  /* 兜底：强制 Wot UI 滑块可见 */
  :deep(.wd-slider) {
    height: 68rpx !important;
  }
  :deep(.wd-slider__bar-wrapper) {
    background: rgba(165, 173, 161, 0.28) !important;
  }
  :deep(.wd-slider__bar) {
    background: linear-gradient(90deg, #6FBF73, #4E9A54) !important;
    height: 6rpx !important;
  }
  :deep(.wd-slider__button) {
    width: 36rpx !important;
    height: 36rpx !important;
    background: var(--ld-card) !important;
    border: 6rpx solid var(--ld-primary) !important;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18) !important;
  }
}

.ticks {
  display: flex;
  justify-content: space-between;
  font-size: 21rpx;
  color: var(--ld-text-3);
  padding: 4rpx 4rpx 0;
}

/* 次要元素区：固定高度，三种模式总高一致 */
.secondary {
  min-height: 140rpx;
}

/* === 筛选按钮 === */
.filter-btn {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 26rpx;
  border: 3rpx dashed color-mix(in srgb, var(--ld-primary) 55%, transparent);
  background: var(--ld-primary-soft);
  color: var(--ld-primary-dark);
  font-size: 26rpx;
  font-weight: 700;

  &.on { border-style: solid; }

  .fi { font-size: 28rpx; }

  .dot {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
    width: 22rpx;
    height: 22rpx;
    background: var(--ld-danger);
    border-radius: 50%;
    border: 4rpx solid var(--ld-bg);
  }
}

.filter-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44rpx;
  font-size: 23rpx;
  text-align: center;
  color: var(--ld-text-2);

  em { font-style: normal; color: var(--ld-danger); font-weight: 700; }

  /* 无选中时仍占位，保证按钮不位移 */
  &.hide { visibility: hidden; }
}

/* === 完全随机 / 随机运动 模式 === */
.random-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  text-align: center;

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

.cause-note {
  box-sizing: border-box;
  height: 140rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 26rpx;
  border-radius: var(--ld-radius-md);
  background: var(--ld-primary-soft);
  color: var(--ld-text-2);
  font-size: 23rpx;
  line-height: 1.6;

  .cn { font-size: 28rpx; flex-shrink: 0; color: var(--ld-primary-dark); }
}

/* 随机运动：消耗计算过程卡 */
.ex-calc {
  padding: 28rpx 32rpx;
  margin-top: 4rpx;

  .ec-t {
    display: block;
    font-size: 24rpx;
    font-weight: 700;
    color: var(--ld-text);
    margin-bottom: 14rpx;
  }

  .ec-l {
    display: block;
    font-size: 22rpx;
    color: var(--ld-text-2);
    line-height: 1.7;
  }
}

/* === 绿色渐变汇总卡 === */
.summary {
  background: linear-gradient(140deg, var(--ld-primary), var(--ld-primary-dark));
  color: #fff;
  border-radius: var(--ld-radius-lg);
  padding: 32rpx 34rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 20rpx 44rpx rgba(111, 191, 115, 0.32);

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: nowrap;
    margin-bottom: 28rpx;

    .t-l {
      display: flex;
      align-items: baseline;
      gap: 10rpx;
      flex-shrink: 0;

      .big { font-size: 30rpx; font-weight: 800; letter-spacing: -0.5rpx; }
      .s { font-size: 22rpx; opacity: 0.9; }
    }

    .price {
      display: flex;
      align-items: baseline;
      gap: 10rpx;
      flex-shrink: 0;
      font-size: 22rpx;
      opacity: 0.95;

      b { font-size: 30rpx; font-weight: 800; letter-spacing: -0.5rpx; }
    }
  }

  .macro {
    display: flex;
    gap: 16rpx;

    > view {
      flex: 1;
      background: rgba(255, 255, 255, 0.18);
      border-radius: 22rpx;
      padding: 16rpx 12rpx;
      text-align: center;

      .s { display: block; font-size: 20rpx; opacity: 0.88; margin-bottom: 6rpx; }
      .b { font-size: 26rpx; }
    }
  }
}

/* 生成结果分隔线：与生成按钮拉开距离 */
.result-divider {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin: 48rpx 4rpx 28rpx;

  .line {
    flex: 1;
    height: 1rpx;
    background: var(--ld-line);
  }

  .txt {
    font-size: 23rpx;
    color: var(--ld-text-3);
    font-weight: 600;
    letter-spacing: 0.6rpx;
    flex-shrink: 0;
  }
}

.list-label {
  font-size: 24rpx;
  color: var(--ld-text-2);
  font-weight: 700;
  margin: 0 4rpx 20rpx;
}

/* === 空状态 === */
.empty {
  text-align: center;
  padding: 72rpx 40rpx 24rpx;

  .ico {
    width: 120rpx;
    height: 120rpx;
    margin: 0 auto 24rpx;
    border-radius: 64rpx;
    background: var(--ld-primary-soft);
    display: grid;
    place-items: center;
    font-size: 56rpx;
    color: var(--ld-primary-dark);
  }
  .b { display: block; font-size: 28rpx; color: var(--ld-text-2); margin-bottom: 10rpx; }
  .s { display: block; font-size: 23rpx; color: var(--ld-text-3); line-height: 1.6; }
}

/* === 筛选弹窗 === */
.modal {
  padding: 0;
}
.m-head {
  padding: 36rpx 40rpx 12rpx;

  .t { display: block; font-size: 31rpx; font-weight: 700; color: var(--ld-text); margin-bottom: 10rpx; }
  .s { display: block; font-size: 23rpx; color: var(--ld-text-2); line-height: 1.6; }
}
.m-body {
  padding: 24rpx 40rpx 8rpx;
  max-height: 800rpx;
}
.checkbox {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  margin-bottom: 14rpx;
  background: var(--ld-bg-2, #f2f2f2);
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &.on {
    background: var(--ld-primary-soft);
    border-color: var(--ld-primary);
  }

  &:last-child { margin-bottom: 0; }

  .ct { flex: 1; min-width: 0; }
  .main { display: block; font-size: 28rpx; color: var(--ld-text); font-weight: 600; }
  .hint { display: block; font-size: 21rpx; color: var(--ld-text-3); margin-top: 4rpx; }

  &.on .main { color: var(--ld-primary-dark); font-weight: 700; }
}
.m-empty {
  text-align: center;
  font-size: 23rpx;
  color: var(--ld-text-3);
  padding: 40rpx 0;
}
.m-foot {
  display: flex;
  gap: 22rpx;
  padding: 32rpx 40rpx 36rpx;

  :deep(.wd-button) { flex: 1; }
}
/* ===== 随机食材汇总卡（复用 .summary 绿色渐变卡） ===== */
.summary.dish-summary .price-txt {
  font-size: 22rpx;
  opacity: 0.85;
}
.dish-ings {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 12rpx;
}
.di {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: var(--ld-card);
  border: 1rpx solid var(--ld-line);

  .di-img {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }
  .di-emoji { font-size: 40rpx; line-height: 1; flex-shrink: 0; }
  .di-n { font-size: 28rpx; font-weight: 600; color: var(--ld-text); flex: 1; }
  .di-w { font-size: 22rpx; color: var(--ld-text-3); flex-shrink: 0; }
  .di-arrow { font-size: 32rpx; color: var(--ld-text-3); flex-shrink: 0; }
}

/* ===== 汇总卡名字（顶部） ===== */
.summary .sum-name {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
  color: #fff;
  margin-bottom: 16rpx;
  line-height: 1.3;
}

/* ===== 菜品类型筛选 chips ===== */
.dish-types {
  display: flex;
  gap: 16rpx;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24rpx;
}
.dt-chip {
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  background: var(--ld-bg-2, #f2f2f2);
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
</style>
