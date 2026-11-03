<!-- 文件路径：src/pages/random/index.vue -->
<!-- 随机 Tab（默认首页）：随机菜单 / 随机原料（拼好菜·调美酒）/ 随机运动 三模式 -->
<template>
  <view class="page">
    <!-- 顶部模式分段切换 -->
    <view class="seg">
      <view class="seg-item" :class="{ on: mode === 'heatLimit' }" @click="mode = 'heatLimit'">随机菜单</view>
      <view class="seg-item" :class="{ on: mode === 'fullRandom' }" @click="mode = 'fullRandom'">随机原料</view>
      <view class="seg-item" :class="{ on: mode === 'exercise' }" @click="mode = 'exercise'">随机运动</view>
    </view>

    <!-- 模式面板：统一高度，保证三种模式下「操作按钮」位置完全一致 -->
    <view class="panel">
      <!-- ========== 随机菜单（热量区间） ========== -->
      <template v-if="mode === 'heatLimit'">
        <view class="cal-card plan-card">
          <!-- 卡头：图标徽章 + 标题 -->
          <view class="pc-head">
            <view class="pc-ico">🍽️</view>
            <view class="pc-titles">
              <text class="pc-title">随机菜单</text>
              <text class="pc-sub">随机搭配一顿饭菜</text>
            </view>
          </view>

          <!-- 卡体：目标热量区间可折叠（默认收起只显示当前值，点击展开滑块调节） -->
          <view class="pc-body">
            <view class="sec-label sec-toggle" @click="calOpen = !calOpen">
              目标热量区间
              <view class="st-right">
                <text class="sec-badge" :class="{ off: !calLimited }">{{ calLimited ? calRange[0] + '—' + calRange[1] + ' kcal' : '不限' }}</text>
                <text class="st-arrow" :class="{ up: calOpen }">▾</text>
              </view>
            </view>
            <template v-if="calOpen">
              <view class="kcal-big">
                <text class="num">{{ calRange[0] }}</text>
                <text class="sep">—</text>
                <text class="num">{{ calRange[1] }}</text>
                <text class="unit">kcal</text>
              </view>
              <!-- Wot UI 双滑块（v-model 传入数组即为双滑块模式） -->
              <view class="slider-panel">
                <view class="slider-wrap">
                  <wd-slider v-model="calRange" :min="300" :max="3000" :step="50" />
                </view>
                <view class="ticks"><text>300</text><text>1200</text><text>2100</text><text>3000</text></view>
              </view>
            </template>

            <!-- 饮料搭配（可折叠：酒 / 饮料 可多选，默认搭配饮料） -->
            <view class="sec-label sec-toggle ex-gap" @click="drinkOpen = !drinkOpen">
              饮料搭配
              <view class="st-right">
                <text class="sec-badge" :class="{ off: !includeAlcohol && !includeDrink }">{{ drinkLabel }}</text>
                <text class="st-arrow" :class="{ up: drinkOpen }">▾</text>
              </view>
            </view>
            <view v-if="drinkOpen" class="chip-row">
              <view class="chip" :class="{ on: includeAlcohol }" @click="includeAlcohol = !includeAlcohol">酒</view>
              <view class="chip" :class="{ on: includeDrink }" @click="includeDrink = !includeDrink">饮料</view>
            </view>

            <!-- 忌口（可折叠：默认没有忌口，点开多选） -->
            <view class="sec-label sec-toggle ex-gap" @click="excludeOpen = !excludeOpen">
              忌口
              <view class="st-right">
                <text class="sec-badge" :class="{ off: !excludeIds.length }">{{ excludeLabel }}</text>
                <text class="st-arrow" :class="{ up: excludeOpen }">▾</text>
              </view>
            </view>
            <view v-if="excludeOpen" class="chip-row">
              <view
                v-for="ing in filterOptions"
                :key="ing._id"
                class="chip"
                :class="{ on: excludeIds.includes(ing._id) }"
                @click="toggleExcludeChip(ing._id)"
              >{{ ing.name }}</view>
            </view>
          </view>
        </view>

        <view class="secondary">
          <!-- 提示行：勾选忌口时才显示，避免菜单卡与按钮之间留出大空白 -->
          <text v-if="excludeIds.length" class="filter-hint">
            已勾选 <em>{{ excludeIds.length }}</em> 项忌口，生成时将排除对应菜品
          </text>
          <view class="cause-note">
            <text class="cn">ℹ️</text>
            <text>按热量区间随机 2~4 道主菜，搭配酒 / 饮料各 1 杯（默认只配饮料）；区间不限时自动放宽。</text>
          </view>
        </view>
      </template>

      <!-- ========== 完全随机 ========== -->
      <template v-else-if="mode === 'fullRandom'">
        <view class="random-card plan-card">
          <view class="pc-head">
            <view class="pc-ico">🎲</view>
            <view class="pc-titles">
              <text class="pc-title">{{ mixMode === 'cocktail' ? '调美酒，基酒随心配' : '随机原料，随缘拼菜' }}</text>
              <text class="pc-sub">{{ mixMode === 'cocktail' ? '选一种基酒，随机搭配辅料调出一杯' : '随机抽取 2~4 种食材，组合出一个菜名' }}</text>
            </view>
          </view>
          <view class="pc-body">
            <!-- 内层模式切换：拼好菜（食材组合）/ 调美酒（基酒调饮） -->
            <view class="mode-seg">
              <view class="mode-seg-item" :class="{ on: mixMode === 'food' }" @click="setMixMode('food')">拼好菜</view>
              <view class="mode-seg-item" :class="{ on: mixMode === 'cocktail' }" @click="setMixMode('cocktail')">调美酒</view>
            </view>

            <!-- 拼好菜：菜品类型筛选（默认折叠） -->
            <template v-if="mixMode === 'food'">
              <view class="sec-label sec-toggle" @click="dishTypeOpen = !dishTypeOpen">
                菜品类型
                <view class="st-right">
                  <text class="sec-badge">{{ dishTypeLabel }}</text>
                  <text class="st-arrow" :class="{ up: dishTypeOpen }">▾</text>
                </view>
              </view>
              <view v-if="dishTypeOpen" class="chip-row">
                <view
                  v-for="t in dishTypes"
                  :key="t.key"
                  class="chip"
                  :class="{ on: dishType === t.key }"
                  @click="dishType = t.key"
                >{{ t.label }}</view>
              </view>
            </template>

            <!-- 调美酒：基酒选择（默认折叠） -->
            <template v-else>
              <view class="sec-label sec-toggle" @click="baseLiquorOpen = !baseLiquorOpen">
                基酒
                <view class="st-right">
                  <text class="sec-badge">{{ baseLiquorLabel }}</text>
                  <text class="st-arrow" :class="{ up: baseLiquorOpen }">▾</text>
                </view>
              </view>
              <view v-if="baseLiquorOpen" class="chip-row">
                <view
                  v-for="b in baseLiquors"
                  :key="b.key"
                  class="chip"
                  :class="{ on: baseLiquor === b.key }"
                  @click="baseLiquor = b.key"
                >{{ b.label }}</view>
              </view>
            </template>
          </view>
        </view>
        <view class="secondary">
          <view class="cause-note">
            <text class="cn">ℹ️</text>
            <text>{{ mixMode === 'cocktail' ? '调美酒模式按基酒随机搭配辅料，不做忌口过滤；需要排除食材请用「随机菜单」。' : '拼好菜模式完全看缘分，不做忌口过滤；需要排除食材请用「随机菜单」。' }}</text>
          </view>
        </view>
      </template>

      <!-- ========== 随机运动 ========== -->
      <template v-else>
        <view class="random-card plan-card">
          <view class="pc-head">
            <view class="pc-ico">🏃</view>
            <view class="pc-titles">
              <text class="pc-title">随便动一动</text>
              <text class="pc-sub">按时长或热量，随机定制运动计划</text>
            </view>
            <text class="pc-badge">{{ exPlanMode === 'duration' ? exDuration + ' 分钟' : exBurnRange[0] + '—' + exBurnRange[1] + ' kcal' }}</text>
          </view>
          <view class="pc-body">
            <!-- 生成方式：按时长 / 按热量（分段控件） -->
            <view class="mode-seg">
              <view class="mode-seg-item" :class="{ on: exPlanMode === 'duration' }" @click="exPlanMode = 'duration'">按时长</view>
              <view class="mode-seg-item" :class="{ on: exPlanMode === 'calorie' }" @click="exPlanMode = 'calorie'">按热量</view>
            </view>

            <!-- 按时长：时长单选（默认折叠） -->
            <template v-if="exPlanMode === 'duration'">
              <view class="sec-label sec-toggle" @click="exDurationOpen = !exDurationOpen">
                运动时长
                <view class="st-right">
                  <text class="sec-badge">{{ exDuration }} 分钟</text>
                  <text class="st-arrow" :class="{ up: exDurationOpen }">▾</text>
                </view>
              </view>
              <view v-if="exDurationOpen" class="chip-row">
                <view
                  v-for="d in durationOptions"
                  :key="d"
                  class="chip"
                  :class="{ on: exDuration === d }"
                  @click="exDuration = d"
                >{{ d }} 分钟</view>
              </view>
            </template>

            <!-- 按热量：双滑块区间（默认折叠） -->
            <template v-else>
              <view class="sec-label sec-toggle" @click="exBurnOpen = !exBurnOpen">
                目标热量区间
                <view class="st-right">
                  <text class="sec-badge">{{ exBurnRange[0] }}—{{ exBurnRange[1] }} kcal</text>
                  <text class="st-arrow" :class="{ up: exBurnOpen }">▾</text>
                </view>
              </view>
              <template v-if="exBurnOpen">
                <view class="kcal-big ex-kcal">
                  <text class="num">{{ exBurnRange[0] }}</text>
                  <text class="sep">—</text>
                  <text class="num">{{ exBurnRange[1] }}</text>
                  <text class="unit">kcal</text>
                </view>
                <view class="slider-panel">
                  <view class="slider-wrap">
                    <wd-slider v-model="exBurnRange" :min="50" :max="600" :step="10" />
                  </view>
                  <view class="ticks"><text>50</text><text>200</text><text>400</text><text>600</text></view>
                </view>
              </template>
            </template>

            <!-- 训练强度（默认折叠） -->
            <view class="sec-label sec-toggle ex-gap" @click="exIntensityOpen = !exIntensityOpen">
              训练强度
              <view class="st-right">
                <text class="sec-badge">{{ exIntensityLabel }}</text>
                <text class="st-arrow" :class="{ up: exIntensityOpen }">▾</text>
              </view>
            </view>
            <view v-if="exIntensityOpen" class="chip-row">
              <view
                v-for="it in intensityOptions"
                :key="it.key"
                class="chip"
                :class="{ on: exIntensity === it.key }"
                @click="exIntensity = it.key"
              >{{ it.label }}</view>
            </view>
          </view>
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
      <template v-if="exerciseResult && exerciseResult.list && exerciseResult.list.length">
        <view class="result-divider">
          <view class="line"></view>
          <text class="txt">你的运动计划</text>
          <view class="line"></view>
        </view>

        <!-- 绿色渐变汇总卡（与随机菜单同款）：合计消耗 -->
        <view class="summary">
          <text class="sum-name">{{ exerciseResult.list.map(e => e.name).join(' + ') }}</text>
          <view class="top">
            <view class="t-l">
              <text class="big">{{ Math.round(exerciseResult.totalBurn) }}大卡</text>
              <text class="s">合计消耗</text>
            </view>
            <view class="price">合计时长<b>{{ exerciseResult.totalMinutes }} 分钟</b></view>
          </view>
          <view class="macro">
            <view><text class="s">运动项目</text><text class="b">{{ exerciseResult.list.length }} 项</text></view>
            <view><text class="s">参考体重</text><text class="b">{{ exerciseResult.weight }}kg</text></view>
            <view><text class="s">平均每分钟</text><text class="b">{{ (exerciseResult.totalBurn / exerciseResult.totalMinutes).toFixed(1) }}kcal</text></view>
          </view>
        </view>

        <view class="list-label">计划安排（{{ exerciseResult.list.length }} 项 · 共 {{ exerciseResult.totalMinutes }} 分钟）</view>
        <ExerciseCard
          v-for="ex in exerciseResult.list"
          :key="ex._id"
          :exercise="ex"
          :minutes="ex.suggestMinutes"
          :burn="ex.suggestBurn"
        />
      </template>

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

      <!-- 饮品搭配（酒 / 饮料 各自随机 1 个，与菜品分开显示） -->
      <template v-if="result.alcohol || result.drink">
        <view class="list-label">饮品</view>
        <RecipeCard
          v-if="result.alcohol"
          :key="result.alcohol._id"
          :recipe="result.alcohol"
          :ingredient-summary="result.alcohol.ingredientSummary"
          show-price
        />
        <RecipeCard
          v-if="result.drink"
          :key="result.drink._id"
          :recipe="result.drink"
          :ingredient-summary="result.drink.ingredientSummary"
          show-price
        />
      </template>
    </template>

    <!-- ========== 随机原料结果 ========== -->
    <template v-else-if="mode === 'fullRandom' && dishResult">
      <view class="result-divider">
        <view class="line"></view>
        <text class="txt">{{ mixMode === 'cocktail' ? '本次调酒' : '本次随机原料' }}</text>
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
          <text class="di-w">{{ ing.weight }}{{ weightUnit(ing) }} · {{ Math.round(ing.calories) }}kcal</text>
          <text class="di-arrow">›</text>
        </view>
      </view>
    </template>

    <Disclaimer />
    <view style="height: 160rpx"></view>
    <TabBar active="pages/random/index" />
  </view>
</template>

<script setup>
// 文件路径：src/pages/random/index.vue (script)
import { ref, computed } from 'vue'
import { onLoad, onShow, onUnload, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { foodEmoji } from '@/utils/foodEmoji'
import { weightUnit } from '@/utils/format'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import RecipeCard from '@/components/RecipeCard.vue'
import ExerciseCard from '@/components/ExerciseCard.vue'

// ---- 页面状态 ----
const mode = ref('heatLimit')
// 热量区间：300~3000，默认全区间（相当于不限定热量）
const CAL_MIN = 300
const CAL_MAX = 3000
const calRange = ref([CAL_MIN, CAL_MAX])
// 目标热量区间折叠开关：默认收起，只显示小标题行 + 右侧当前值，点击展开滑块
const calOpen = ref(false)
// 是否实际限定了热量（区间被收窄才算限定）
const calLimited = computed(() => calRange.value[0] > CAL_MIN || calRange.value[1] < CAL_MAX)
// 随机运动：生成方式 / 时长 / 热量区间 / 强度
const exPlanMode = ref('duration')            // duration=按时长 / calorie=按热量
const exDuration = ref(30)                    // 目标总时长（分钟）
const exBurnRange = ref([150, 300])           // 目标消耗区间（kcal）
const exIntensity = ref('any')                // any/low/mid/high
const durationOptions = [10, 15, 30, 60]
const intensityOptions = [
  { key: 'any', label: '不限' },
  { key: 'low', label: '低强度' },
  { key: 'mid', label: '中强度' },
  { key: 'high', label: '高强度' }
]
// 随机餐饮：是否搭配饮品（默认勾选，云端额外搭配 1 个酒类菜谱）
// 饮料搭配：酒 / 饮料 两个选项可多选（默认只搭配饮料，两个都选则各随机 1 个）
const includeAlcohol = ref(false)
const includeDrink = ref(true)
const drinkOpen = ref(false)
const drinkLabel = computed(() => {
  if (includeAlcohol.value && includeDrink.value) return '酒 + 饮料'
  if (includeAlcohol.value) return '酒'
  if (includeDrink.value) return '饮料'
  return '不搭配'
})
// 忌口折叠：默认没有忌口
const excludeOpen = ref(false)
// 随机原料：菜品类型 / 基酒 折叠行（默认收起，右侧显示当前选中）
const dishTypeOpen = ref(false)
const baseLiquorOpen = ref(false)
const dishTypeLabel = computed(() => dishTypes.find(t => t.key === dishType.value)?.label || '全部')
const baseLiquorLabel = computed(() => baseLiquors.find(b => b.key === baseLiquor.value)?.label || '全部')
// 随机运动：运动时长 / 目标热量区间 / 训练强度 折叠行（默认收起）
const exDurationOpen = ref(false)
const exBurnOpen = ref(false)
const exIntensityOpen = ref(false)
const exIntensityLabel = computed(() => intensityOptions.find(it => it.key === exIntensity.value)?.label || '不限')
const loading = ref(false)
// 防卡死三件套：
// 1) loading 由 beginRequest/endRequest 统一管理，异常/超时必复位
// 2) slowHint：请求超过 8s 时按钮文案改为「仍在计算」，避免用户误以为卡死
// 3) reqSeq：请求序号。旧请求晚返回时若已被新请求取代，直接丢弃，防止状态串台
const SLOW_HINT_MS = 8000
const slowHint = ref(false)
let slowTimer = null
let reqSeq = 0

function beginRequest() {
  reqSeq += 1
  loading.value = true
  slowHint.value = false
  if (slowTimer) clearTimeout(slowTimer)
  slowTimer = setTimeout(() => { slowHint.value = true }, SLOW_HINT_MS)
  return reqSeq
}

function endRequest(seq) {
  if (slowTimer) { clearTimeout(slowTimer); slowTimer = null }
  slowHint.value = false
  // 只有「当前」请求才能解锁按钮，旧请求不得复位
  if (seq === reqSeq) loading.value = false
}

const result = ref(null)
const dishResult = ref(null)
const exerciseResult = ref(null)
// 拼好菜：菜品类型筛选（'' = 全部）
const dishType = ref('')
const dishTypes = [
  { key: '', label: '全部' },
  { key: 'noodle', label: '面' },
  { key: 'rice', label: '盖饭' },
  { key: 'sandwich', label: '三明治' },
  { key: 'stirfry', label: '炒菜' }
]
// 调美酒：内层模式（food=拼好菜 / cocktail=调美酒）与基酒选择（'' = 全部，key 需与云端 ingredient.name 精确一致）
const mixMode = ref('food')
const baseLiquor = ref('')
const baseLiquors = [
  { key: '', label: '全部' },
  { key: '伏特加', label: '伏特加' },
  { key: '金酒', label: '金酒' },
  { key: '朗姆酒', label: '朗姆' },
  { key: '椰子朗姆酒', label: '椰子朗姆' },
  { key: '龙舌兰', label: '龙舌兰' },
  { key: '威士忌', label: '威士忌' },
  { key: '白兰地', label: '白兰地' },
  { key: '白酒', label: '白酒' },
  { key: '清酒', label: '清酒' },
  { key: '梅酒', label: '梅酒' },
  { key: '二锅头', label: '二锅头' },
  { key: '咖啡利口酒', label: '咖啡利口' },
  { key: '奶油利口酒', label: '奶油利口' },
  { key: '杏仁利口酒', label: '杏仁利口' },
  { key: '蜜桃利口酒', label: '蜜桃利口' },
  { key: '蜜瓜利口酒', label: '蜜瓜利口' },
  { key: '干味美思', label: '干味美思' },
  { key: '甜味美思', label: '甜味美思' },
  { key: '金巴利', label: '金巴利' }
]
// 切换拼好菜/调美酒时清空上一次结果
function setMixMode(m) {
  if (mixMode.value === m) return
  mixMode.value = m
  dishResult.value = null
}

// 主按钮文案随模式变化
const mainBtnText = computed(() => {
  if (loading.value && slowHint.value) return '仍在计算，请稍候...'
  if (mode.value === 'exercise') return loading.value ? '生成中...' : '生成运动计划'
  if (mode.value === 'fullRandom') {
    if (loading.value) return mixMode.value === 'cocktail' ? '调酒中...' : '组合中...'
    return mixMode.value === 'cocktail' ? '随机调酒' : '随机原料'
  }
  return loading.value ? '生成中...' : '随机菜单'
})

// ---- 忌口筛选状态（仅本次页面会话内保留）----
// 先放默认 mock 数据，保证 chips 不会空；云端 ingredient 数据加载成功后覆盖
const filterOptions = ref([
  { _id: 'mock-cilantro', name: '香菜' },
  { _id: 'mock-pork', name: '猪肉' },
  { _id: 'mock-carrot', name: '胡萝卜' },
  { _id: 'mock-onion', name: '洋葱' }
])
// 忌口筛选暂时固定只展示这 4 种食材（顺序即展示顺序）
const FILTER_NAMES = ['香菜', '猪肉', '胡萝卜', '洋葱']
const excludeIds = ref([])
// 忌口折叠行右侧的状态文案
const excludeLabel = computed(() => (excludeIds.value.length ? excludeIds.value.length + ' 项忌口' : '没有忌口'))

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
        if (hit) picked.push({ _id: hit._id, name })
      }
      if (picked.length) filterOptions.value = picked
    }
  } catch (e) {
    // 超时 / 云函数未部署：保留默认 mock 数据即可
    console.warn('筛选项加载失败（可能云函数未部署），使用默认选项', e && e.message)
  }
}

// ---- 页面生命周期 ----
onLoad(() => {
  loadFilterOptions()
})
// 页面每次可见都强制 reset loading，防止云函数超时 / 页面切换后 loading 卡死导致按钮永远禁用
onShow(() => {
  loading.value = false
  slowHint.value = false
  if (slowTimer) { clearTimeout(slowTimer); slowTimer = null }
})
onUnload(() => {
  excludeIds.value = []
})

// ---- 忌口 chips 直接点击切换 ----
function toggleExcludeChip(id) {
  const idx = excludeIds.value.indexOf(id)
  if (idx >= 0) excludeIds.value.splice(idx, 1)
  else excludeIds.value.push(id)
}

// ---- 主按钮：按当前模式分发 ----
function onMainAction() {
  if (mode.value === 'exercise') return randomExercise()
  return generate()
}

// ---- 生成（随机餐饮 / 随机原料） ----
async function generate() {
  if (loading.value) return
  const seq = beginRequest()
  try {
    if (mode.value === 'fullRandom') {
      // 调美酒：按基酒随机搭配辅料调一杯；拼好菜：云端随机抽取食材并组合菜名
      const params = mixMode.value === 'cocktail'
        ? { action: 'randomCocktail', baseLiquor: baseLiquor.value || undefined }
        : { action: 'randomDish', dishType: dishType.value || undefined }
      const res = await callFunction('recipeService', params)
      if (seq !== reqSeq) return // 已被更新的请求取代，丢弃本次结果
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
    // 随机菜单：按热量区间搭配菜谱；区间保持 300~3000 时不限热量；酒 / 饮料 可各随机搭配 1 个
    const params = {
      mode: 'heatLimit',
      calLimit: calLimited.value,
      minCal: calRange.value[0],
      maxCal: calRange.value[1],
      excludeIngredientIdList: excludeIds.value,
      includeAlcohol: includeAlcohol.value,
      includeDrink: includeDrink.value
    }
    const res = await callFunction('generateMenu', params)
    if (seq !== reqSeq) return // 已被更新的请求取代，丢弃本次结果
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
    const msg = (e && e.errMsg === 'timeout') ? '请求超时，请检查网络后重试'
             : (e && e.errMsg) || '网络异常，请稍后再试'
    if (seq !== reqSeq) return // 旧请求的报错不打扰当前请求
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    endRequest(seq)
  }
}

// ---- 跳转食材详情页 ----
function goIngDetail(ingredientId) {
  if (!ingredientId) return
  uni.navigateTo({ url: `/pages/ingredient/detail?id=${ingredientId}` })
}

// ---- 随机运动：按时长 / 按热量生成运动计划 ----
async function randomExercise() {
  if (loading.value) return
  const seq = beginRequest()
  try {
    const params = { action: 'random', planMode: exPlanMode.value, intensity: exIntensity.value }
    if (exPlanMode.value === 'duration') {
      params.targetMinutes = exDuration.value
    } else {
      params.minBurn = exBurnRange.value[0]
      params.maxBurn = exBurnRange.value[1]
    }
    const res = await callFunction('exerciseService', params)
    if (seq !== reqSeq) return // 已被更新的请求取代，丢弃本次结果
    const ret = res.result || {}
    if (ret.code === 'OK') {
      exerciseResult.value = ret.data
      uni.pageScrollTo({ scrollTop: 0, duration: 200 })
    } else {
      uni.showToast({ title: ret.message || '随机失败，请稍后再试', icon: 'none' })
    }
  } catch (e) {
    console.error('[randomExercise] 错误:', e)
    const msg = (e && e.errMsg === 'timeout') ? '请求超时，请检查网络后重试' : '网络异常，请稍后再试'
    if (seq !== reqSeq) return // 旧请求的报错不打扰当前请求
    uni.showToast({ title: msg, icon: 'none' })
  } finally {
    endRequest(seq)
  }
}
// 微信右上角菜单：转发给朋友 / 分享到朋友圈
onShareAppMessage(() => ({ title: 'LetsDo · 吃得健康，动得开心' }))
onShareTimeline(() => ({ title: 'LetsDo · 吃得健康，动得开心' }))
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

/* 模式面板：不再锁高度 */
.panel {
  min-height: 0;
}

/* === 计划卡（目标热量 / 随机食材 / 随机运动 通用骨架，内容常驻不折叠）=== */
.plan-card {
  box-sizing: border-box;
  background: var(--ld-card);
  border-radius: 32rpx;
  border: 1rpx solid var(--ld-line);
  box-shadow: 0 12rpx 36rpx rgba(60, 80, 50, 0.07);
  margin-bottom: 28rpx;
  padding: 30rpx 30rpx 34rpx;

  /* 卡头：图标徽章 + 标题组 + 状态胶囊 */
  .pc-head {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding-bottom: 26rpx;
    margin-bottom: 28rpx;
    border-bottom: 1rpx solid var(--ld-line);

    .pc-ico {
      width: 84rpx;
      height: 84rpx;
      border-radius: 26rpx;
      background: linear-gradient(145deg, var(--ld-primary-soft), color-mix(in srgb, var(--ld-primary) 24%, var(--ld-card)));
      box-shadow: inset 0 0 0 1rpx color-mix(in srgb, var(--ld-primary) 18%, transparent);
      display: grid;
      place-items: center;
      font-size: 44rpx;
      line-height: 1;
      flex-shrink: 0;
    }

    .pc-titles {
      flex: 1;
      min-width: 0;

      .pc-title {
        display: block;
        font-size: 29rpx;
        font-weight: 800;
        color: var(--ld-text);
        letter-spacing: 0.2rpx;
      }

      .pc-sub {
        display: block;
        margin-top: 6rpx;
        font-size: 21rpx;
        color: var(--ld-text-3);
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .pc-badge {
      flex-shrink: 0;
      max-width: 250rpx;
      font-size: 21rpx;
      font-weight: 700;
      color: var(--ld-primary-dark);
      background: var(--ld-primary-soft);
      padding: 10rpx 22rpx;
      border-radius: 999rpx;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.off {
        color: var(--ld-text-3);
        background: color-mix(in srgb, var(--ld-text-3) 10%, transparent);
        font-weight: 500;
      }
    }
  }
}

/* 小节标题：绿色渐变短棒 + 文字 */
.sec-label {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 23rpx;
  font-weight: 700;
  color: var(--ld-text-2);
  margin-bottom: 18rpx;

  &::before {
    content: '';
    width: 8rpx;
    height: 22rpx;
    border-radius: 4rpx;
    background: linear-gradient(180deg, var(--ld-primary), var(--ld-primary-dark));
  }
}

.ex-gap { margin-top: 30rpx; }

/* 可折叠小节标题（目标热量区间）：右侧当前值胶囊 + 展开箭头 */
.sec-toggle { cursor: pointer; }

.st-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.sec-badge {
  font-size: 21rpx;
  font-weight: 700;
  color: var(--ld-primary-dark);
  background: var(--ld-primary-soft);
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  white-space: nowrap;

  &.off {
    color: var(--ld-text-3);
    background: color-mix(in srgb, var(--ld-text-3) 10%, transparent);
    font-weight: 500;
  }
}

.st-arrow {
  font-size: 22rpx;
  color: var(--ld-text-3);
  transition: transform 0.2s ease;

  &.up { transform: rotate(180deg); }
}

/* 通用 chips 行（菜品类型 / 运动时长 / 训练强度） */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  padding: 13rpx 32rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: var(--ld-text-2);
  background: color-mix(in srgb, var(--ld-text-3) 9%, transparent);
  border: 2rpx solid transparent;
  transition: all 0.2s;

  &.on {
    color: var(--ld-primary-dark);
    background: var(--ld-primary-soft);
    border-color: var(--ld-primary);
    font-weight: 700;
  }
}

/* 分段控件（按时长 / 按热量），与页面顶部 seg 同一设计语言 */
.mode-seg {
  display: flex;
  background: color-mix(in srgb, var(--ld-text-3) 12%, transparent);
  border-radius: 20rpx;
  padding: 6rpx;
  margin-bottom: 30rpx;

  .mode-seg-item {
    flex: 1;
    text-align: center;
    padding: 16rpx 0;
    border-radius: 15rpx;
    font-size: 24rpx;
    font-weight: 600;
    color: var(--ld-text-2);
    transition: all 0.2s;

    &.on {
      background: var(--ld-card);
      color: var(--ld-primary-dark);
      font-weight: 700;
      box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.08);
    }
  }
}

/* 滑块承载面板：浅色内嵌底，滑块与刻度归拢 */
.slider-panel {
  background: color-mix(in srgb, var(--ld-text-3) 7%, transparent);
  border-radius: 22rpx;
  padding: 18rpx 24rpx 14rpx;
}

.slider-wrap { transition: opacity 0.25s ease; }

/* === 饮品勾选（卡内整行） === */
.alcohol-check {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  padding: 0 28rpx;
  height: 92rpx;
  border-radius: 24rpx;
  border: 2rpx solid var(--ld-line);
  background: var(--ld-card);
  color: var(--ld-text-2);
  font-size: 26rpx;
  font-weight: 700;
  transition: all 0.15s;

  .ac-box {
    width: 34rpx;
    height: 34rpx;
    border-radius: 9rpx;
    border: 3rpx solid var(--ld-text-3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    font-size: 22rpx;
    font-weight: 700;
    transition: all 0.15s;
  }

  &.on {
    border-color: var(--ld-primary);
    background: var(--ld-primary-soft);
    color: var(--ld-primary-dark);

    .ac-box {
      background: var(--ld-primary);
      border-color: var(--ld-primary);
      color: #fff;
    }
  }
}

/* === 热量卡片 / 随机卡片：外观由 .plan-card 统一 === */

.kcal-big {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 16rpx;
  margin: 18rpx 0 22rpx;
  transition: opacity 0.2s ease;

  .num {
    font-size: 64rpx;
    font-weight: 800;
    color: var(--ld-primary-dark);
    letter-spacing: -1rpx;
  }
  .sep { color: var(--ld-text-3); }
  .unit { font-size: 24rpx; color: var(--ld-text-3); font-weight: 600; }
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

/* 按热量模式复用 .kcal-big：字号略收 */
.ex-kcal {
  justify-content: center;
  margin: 6rpx 0 14rpx;

  .num { font-size: 52rpx; }
}

/* 次要元素区：固定高度，三种模式总高一致 */
.secondary {
  min-height: 140rpx;
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

/* ===== 随机原料汇总卡（复用 .summary 绿色渐变卡） ===== */
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
</style>
