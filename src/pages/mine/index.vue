<!-- 文件路径：src/pages/mine/index.vue -->
<!-- 我的 Tab：身体数据 / 今日热量 / 差额与运动推荐 / 个人信息 / 每日打卡 / 打卡日历 / 积分 / 设置 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- ========== 个人信息卡：头像昵称 + 累计热量 + 身体数据入口 ========== -->
    <view class="card ld-card">
      <view class="profile">
        <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image v-if="profile.avatarUrl" class="avatar" :src="profile.avatarUrl" mode="aspectFill" />
          <view v-else class="avatar ph">🧑‍🍳</view>
        </button>
        <view class="pn">
          <view class="nick-row">
            <input
              class="nick-input"
              type="nickname"
              v-model="profile.nickName"
              placeholder="点击设置昵称"
              placeholder-class="nick-ph"
              @blur="onNickNameBlur"
            />
            <view class="body-btn" @click="showProfilePopup = true">身体数据</view>
          </view>
          <text class="s">已连续打卡 {{ streak }} 天 · 累计打卡 {{ totalDays }} 天</text>
        </view>
      </view>
      <!-- 积分 / 累计摄入 / 消耗 -->
      <view class="total-box">
        <view class="tb-item">
          <text class="tb-v">⭐ {{ profile.totalPoint || 0 }}</text>
          <text class="tb-k">积分</text>
        </view>
        <view class="tb-sep"></view>
        <view class="tb-item">
          <text class="tb-v">{{ health.totalIntake || 0 }}</text>
          <text class="tb-k">累计摄入 kcal</text>
        </view>
        <view class="tb-sep"></view>
        <view class="tb-item">
          <text class="tb-v">{{ health.totalExpenditure || 0 }}</text>
          <text class="tb-k">累计消耗 kcal</text>
        </view>
      </view>

      <!-- 今日打卡 -->
      <view class="ck-row">
        <view class="ck-l">
          <text class="b">今日已做</text>
          <text class="s">每日打卡一次，积分 +1</text>
          <view class="streak">
            <view
              v-for="(d, i) in weekDots"
              :key="i"
              class="d"
              :class="{ f: d }"
            ></view>
          </view>
        </view>
        <button
          class="checkin-btn"
          :class="{ done: checkedToday }"
          :disabled="checkedToday || checkinLoading"
          @click="doCheckin"
        >{{ checkedToday ? '今日已打卡' : (checkinLoading ? '打卡中...' : '打卡') }}</button>
      </view>

    </view>

    <!-- ========== 今日热量记录 ========== -->
    <view class="card ld-card">
      <view class="label">今日热量记录</view>

      <view class="rec-block">
        <view class="rb-head">
          <text class="rb-t">今日摄入热量</text>
          <text class="rb-s">已记录 {{ health.today.intake }} kcal{{ health.today.intakeRecorded ? ' · 今日已加分' : ' · 每日首次录入 +1 积分' }}</text>
        </view>
        <view class="rb-row">
          <input class="rb-input" type="digit" v-model="intakeInput" placeholder="填写今日摄入 kcal" placeholder-class="bd-ph" />
          <view class="rb-btn" :class="{ dis: savingIntake }" @click="recordIntake">{{ savingIntake ? '保存中' : '记录' }}</view>
        </view>
      </view>

      <view class="rec-block">
        <view class="rb-head">
          <text class="rb-t">今日消耗热量</text>
          <text class="rb-s">已记录 {{ health.today.expenditure }} kcal · 不含新陈代谢{{ health.today.expenditureRecorded ? ' · 今日已加分' : ' · 每日首次录入 +1 积分' }}</text>
        </view>
        <view class="rb-row">
          <input class="rb-input" type="digit" v-model="expenditureInput" placeholder="填写今日消耗 kcal" placeholder-class="bd-ph" />
          <view class="rb-btn" :class="{ dis: savingExpenditure }" @click="recordExpenditure">{{ savingExpenditure ? '保存中' : '记录' }}</view>
        </view>
      </view>
    </view>

    <!-- ========== 今日热量差额与运动推荐 ========== -->
    <view class="card ld-card">
      <view class="label">今日热量差额与运动推荐</view>

      <text v-if="!health.hasProfile" class="hint">先点击上方「身体数据」录入身高 / 体重 / 年龄 / 性别，才能计算基础代谢</text>

      <text v-else-if="!health.today.intake" class="hint">先记录今日摄入热量，才能计算差额并推荐运动</text>

      <template v-else>
        <view class="diff-box" :class="health.diff > 0 ? 'surplus' : 'deficit'">
          <text class="d-label">{{ health.diff > 0 ? '热量盈余' : '热量缺口' }}</text>
          <view class="d-num">
            <text class="n">{{ Math.abs(health.diff) }}</text>
            <text class="u">kcal</text>
          </view>
          <text class="d-sub">今日摄入 {{ health.today.intake }} − 今日消耗 {{ health.today.expenditure }} − 基础代谢 {{ health.bmr }} = {{ health.diff }} kcal</text>
        </view>

        <view v-if="health.recommend" class="rec">
          <view class="rec-head">
            <text class="rh-t">{{ health.recommend.surplus ? '推荐运动' : '放松推荐' }}</text>
            <text class="rh-s">{{ health.recommend.surplus ? '还需再消耗约 ' + health.remaining + ' kcal' : '今日没有热量盈余，做点轻运动放松即可' }}</text>
          </view>
          <ExerciseCard :exercise="recExercise" :minutes="health.recommend.minutes" :burn="health.recommend.totalBurn" />
        </view>

        <view class="calc-head" @click="showRecCalc = !showRecCalc">
          <text class="ct">查看计算过程</text>
          <text class="toggle">{{ showRecCalc ? '收起 ▲' : '展开 ▼' }}</text>
        </view>
        <view v-if="showRecCalc" class="calc-body">
          <view v-for="l in calcLines" :key="l.k" class="calc-line">
            <text class="k">{{ l.k }}</text>
            <text class="v">{{ l.v }}</text>
          </view>
        </view>
      </template>
    </view>

    <!-- 打卡日历 -->
    <view class="card ld-card">
      <view class="cal-head">
        <view class="cal-nav">
          <text class="chev" @click="prevMonth">‹</text>
          <text class="b">{{ calTitle }}</text>
          <text class="chev" @click="nextMonth">›</text>
        </view>
        <view class="cal-stats">
          <text class="sti">本月 <text class="num">{{ monthCheckinCount }}</text> 天</text>
          <text class="dot-sep">·</text>
          <text class="sti">本年 <text class="num">{{ yearCheckinCount }}</text> 天</text>
        </view>
      </view>
      <view class="cal-week">
        <text v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</text>
      </view>
      <view class="cal-grid">
        <text
          v-for="(cell, i) in calCells"
          :key="i"
          :class="cell.cls"
        >{{ cell.label }}</text>
      </view>
    </view>

    <!-- 积分排行榜入口 -->
    <view class="card ld-card rank-entry" @click="goRank">
      <text class="re-ico">🏆</text>
      <view class="re-mid">
        <text class="b">积分排行榜</text>
        <text class="s">看看你的排名</text>
      </view>
      <text class="re-arr">›</text>
    </view>

    <!-- 设置 -->
    <view class="card ld-card">
      <view class="label">设置</view>
      <view class="set-row">
        <view class="st">
          <text class="b">展示在积分排行榜</text>
          <text class="s">排行榜仅展示昵称、头像、打卡积分，可随时关闭退出</text>
        </view>
        <wd-switch :model-value="!profile.rankHidden" @change="onRankSwitch" />
      </view>
      <view class="set-row">
        <view class="st">
          <text class="b">暗色模式</text>
          <text class="s">跟随微信主题自动切换深色外观</text>
        </view>
        <wd-switch :model-value="followSystem" @change="onDarkSwitch" />
      </view>
    </view>

    <!-- 身体数据弹窗（居中） -->
    <wd-popup v-model="showProfilePopup" position="center" custom-style="border-radius: 32rpx; width: 88vw; max-width: 680rpx;">
      <view class="popup-body">
        <view class="label">身体数据（用于计算基础代谢）</view>
        <text class="bd-note">每月仅可修改一次{{ profileEditable ? '，请如实填写' : '，本月已修改，下月可再改' }}</text>
        <view class="bd-grid">
          <view class="bd-item">
            <text class="bd-k">身高 (cm)</text>
            <input class="bd-input" :class="{ dis: !profileEditable }" type="digit" v-model="form.height" :disabled="!profileEditable" placeholder="如 170" placeholder-class="bd-ph" />
          </view>
          <view class="bd-item">
            <text class="bd-k">体重 (kg)</text>
            <input class="bd-input" :class="{ dis: !profileEditable }" type="digit" v-model="form.weight" :disabled="!profileEditable" placeholder="如 60" placeholder-class="bd-ph" />
          </view>
          <view class="bd-item">
            <text class="bd-k">年龄</text>
            <input class="bd-input" :class="{ dis: !profileEditable }" type="number" v-model="form.age" :disabled="!profileEditable" placeholder="如 25" placeholder-class="bd-ph" />
          </view>
          <view class="bd-item">
            <text class="bd-k">性别</text>
            <view class="gender">
              <view class="g-item" :class="{ on: form.gender === 'male', dis: !profileEditable }" @click="setGender('male')">男</view>
              <view class="g-item" :class="{ on: form.gender === 'female', dis: !profileEditable }" @click="setGender('female')">女</view>
            </view>
          </view>
        </view>

        <view v-if="health.hasProfile" class="bmr-box">
          <text class="s">每日基础代谢 BMR</text>
          <text class="b">{{ health.bmr }} kcal</text>
        </view>

        <wd-button type="primary" block :loading="savingProfile" :disabled="savingProfile || !profileEditable" @click="saveProfile">{{ profileEditable ? '保存身体数据' : '本月已修改，下月可再改' }}</wd-button>
      </view>
    </wd-popup>

    <Disclaimer />
    <view style="height: 140rpx"></view>
    <TabBar active="pages/mine/index" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark, isFollowSystem, setFollowSystem } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'
import Disclaimer from '@/components/Disclaimer.vue'
import ExerciseCard from '@/components/ExerciseCard.vue'

// ---- 页面数据 ----
const profile = ref({ nickName: '', avatarUrl: '', totalPoint: 0, rankHidden: false })
const checkedToday = ref(false)
const checkinLoading = ref(false)
const monthDates = ref([]) // 当月已打卡日期 YYYY-MM-DD
const allDates = ref([]) // 全部已打卡日期
const streak = ref(0)
const totalDays = ref(0)
const followSystem = ref(isFollowSystem())
const monthOffset = ref(0) // 月份偏移：0=本月，-1=上月，+1=下月

// ---- 身体数据 / 热量管理 ----
const health = ref({
  hasProfile: false,
  bmr: 0,
  today: { date: '', intake: 0, expenditure: 0, intakeRecorded: false, expenditureRecorded: false },
  diff: 0,
  remaining: 0,
  recommend: null,
  totalIntake: 0,
  totalExpenditure: 0
})
const form = ref({ height: '', weight: '', age: '', gender: 'male' })
const showProfilePopup = ref(false)
const intakeInput = ref('')
const expenditureInput = ref('')
const savingProfile = ref(false)
const savingIntake = ref(false)
const savingExpenditure = ref(false)
const showRecCalc = ref(false)

// 身体数据每月仅可修改一次（未录入过则始终可填）
const profileEditable = computed(() => health.value.profileEditable !== false)

function setGender(g) {
  if (!profileEditable.value) return
  form.value.gender = g
}

// 推荐运动对象：补上 _id 供卡片跳转详情
const recExercise = computed(() => {
  const r = health.value.recommend
  if (!r) return null
  return { ...r, _id: r.exerciseId }
})

// 差额计算过程逐行展示
const calcLines = computed(() => {
  const h = health.value
  if (!h.hasProfile) return []
  const p = h.profile
  const isFemale = p.gender === 'female'
  const constTerm = isFemale ? '− 161' : '+ 5'
  return [
    {
      k: '基础代谢',
      v: `10 × ${p.weight}kg + 6.25 × ${p.height}cm − 5 × ${p.age}岁 ${constTerm} = ${h.bmr} kcal（${isFemale ? '女' : '男'}性 Mifflin-St Jeor 公式）`
    },
    { k: '今日摄入', v: `${h.today.intake} kcal（来自你记录的今日摄入热量）` },
    { k: '今日消耗', v: `${h.today.expenditure} kcal（不含新陈代谢）` },
    { k: '热量盈余', v: `摄入 ${h.today.intake} − 消耗 ${h.today.expenditure} − 基础代谢 ${h.bmr} = ${h.diff} kcal` },
    { k: '剩余需消耗', v: `盈余大于 0 时需通过运动抵消，剩余需消耗 = max(0, ${h.diff}) = ${h.remaining} kcal` }
  ]
})

// ---- 数据加载 ----
async function loadMine() {
  try {
    const res = await callFunction('userService', { action: 'getMine' })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      profile.value = ret.data.profile
      checkedToday.value = ret.data.checkedToday
      monthDates.value = ret.data.monthDates
      // 兼容旧版云函数：allDates 不存在时回退用当月数据
      allDates.value = ret.data.allDates || ret.data.monthDates || []
      streak.value = ret.data.streak
      totalDays.value = ret.data.totalCheckinDays
    }
  } catch (e) {
    console.error('我的页面加载失败', e)
  }
}

async function loadHealth() {
  try {
    const res = await callFunction('healthService', { action: 'getHealth' })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      const d = ret.data
      health.value = d
      form.value = {
        height: d.profile.height || '',
        weight: d.profile.weight || '',
        age: d.profile.age || '',
        gender: d.profile.gender || 'male'
      }
      intakeInput.value = d.today.intake ? String(d.today.intake) : ''
      expenditureInput.value = d.today.expenditure ? String(d.today.expenditure) : ''
      if (typeof d.totalPoint === 'number') profile.value.totalPoint = d.totalPoint
    }
  } catch (e) {
    console.error('身体数据加载失败（healthService 可能未部署）', e)
  }
}

onShow(() => {
  loadMine()
  loadHealth()
})

// ---- 保存身体数据 ----
async function saveProfile() {
  if (!profileEditable.value) return uni.showToast({ title: '身体数据每月只能修改一次', icon: 'none' })
  const { height, weight, age, gender } = form.value
  const h = Number(height)
  const w = Number(weight)
  const a = Number(age)
  if (!(h >= 90 && h <= 250)) return uni.showToast({ title: '身高需在 90~250cm', icon: 'none' })
  if (!(w >= 20 && w <= 300)) return uni.showToast({ title: '体重需在 20~300kg', icon: 'none' })
  if (!(a >= 5 && a <= 120)) return uni.showToast({ title: '年龄需在 5~120 岁', icon: 'none' })
  savingProfile.value = true
  try {
    const res = await callFunction('healthService', { action: 'saveProfile', height: h, weight: w, age: a, gender })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      uni.showToast({ title: `已保存，基础代谢 ${ret.data.bmr} kcal`, icon: 'none' })
      showProfilePopup.value = false
      loadHealth()
    } else {
      uni.showToast({ title: ret.message || '保存失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    savingProfile.value = false
  }
}

// ---- 记录今日摄入热量 ----
async function recordIntake() {
  const cal = Number(intakeInput.value)
  if (!intakeInput.value || !(cal >= 0) || cal > 10000) {
    return uni.showToast({ title: '请填写 0~10000 之间的摄入热量', icon: 'none' })
  }
  savingIntake.value = true
  try {
    const res = await callFunction('healthService', { action: 'recordIntake', calories: cal })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      uni.showToast({ title: ret.data.pointAdded ? '已记录，积分 +1' : '已更新（今日已记录过，不重复加分）', icon: 'none' })
      // 等待最新差额与运动推荐返回后再刷新页面数据
      await loadHealth()
      loadMine()
    } else {
      uni.showToast({ title: ret.message || '记录失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    savingIntake.value = false
  }
}

// ---- 记录今日消耗热量（不含新陈代谢）----
async function recordExpenditure() {
  const cal = Number(expenditureInput.value)
  if (!expenditureInput.value || !(cal >= 0) || cal > 10000) {
    return uni.showToast({ title: '请填写 0~10000 之间的消耗热量', icon: 'none' })
  }
  savingExpenditure.value = true
  try {
    const res = await callFunction('healthService', { action: 'recordExpenditure', calories: cal })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      uni.showToast({ title: ret.data.pointAdded ? '已记录，积分 +1' : '已更新（今日已记录过，不重复加分）', icon: 'none' })
      // 等待最新差额与运动推荐返回后再刷新页面数据
      await loadHealth()
      loadMine()
    } else {
      uni.showToast({ title: ret.message || '记录失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    savingExpenditure.value = false
  }
}

// ---- 头像昵称填写 ----
// 选择头像：上传云存储换 fileID 后保存
async function onChooseAvatar(e) {
  const tempPath = e.detail.avatarUrl
  try {
    uni.showLoading({ title: '上传头像中', mask: true })
    const up = await uni.cloud.uploadFile({
      cloudPath: `avatars/${Date.now()}.png`,
      filePath: tempPath
    })
    await callFunction('userService', { action: 'updateProfile', avatarUrl: up.fileID })
    profile.value.avatarUrl = up.fileID
  } catch (err) {
    console.error('头像保存失败', err)
    uni.showToast({ title: '头像保存失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// 昵称失焦保存
async function onNickNameBlur() {
  const name = (profile.value.nickName || '').trim()
  if (!name) return
  try {
    await callFunction('userService', { action: 'updateProfile', nickName: name })
  } catch (e) {
    console.warn('昵称保存失败', e)
  }
}

// ---- 打卡 ----
async function doCheckin() {
  if (checkedToday.value || checkinLoading.value) return
  checkinLoading.value = true
  try {
    const res = await callFunction('doCheckin', {})
    const ret = res.result || {}
    if (ret.code === 'OK') {
      checkedToday.value = true
      profile.value.totalPoint = ret.data.totalPoint
      uni.showToast({ title: '打卡成功，积分 +1', icon: 'none' })
      loadMine() // 刷新日历与连续天数
    } else if (ret.code === 'ALREADY') {
      checkedToday.value = true
      uni.showToast({ title: '今日已打卡', icon: 'none' })
    } else {
      uni.showToast({ title: ret.message || '打卡失败', icon: 'none' })
    }
  } catch (e) {
    console.error('打卡失败', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    checkinLoading.value = false
  }
}

// ---- 近 7 天打卡圆点 ----
const weekDots = computed(() => {
  const dots = []
  const set = new Set(monthDates.value) // 当月集合（近7天一般都在当月，跨月时边缘日期会缺，可接受）
  const now = new Date(Date.now() + 8 * 3600 * 1000)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime())
    d.setUTCDate(now.getUTCDate() - i)
    dots.push(set.has(d.toISOString().slice(0, 10)))
  }
  return dots
})

// ---- 月份翻页 ----
function prevMonth() { monthOffset.value-- }
function nextMonth() { monthOffset.value++ }

// ---- 当前显示的年月 ----
const calDate = computed(() => {
  const now = new Date(Date.now() + 8 * 3600 * 1000)
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth() + monthOffset.value
  const d = new Date(Date.UTC(y, m, 1))
  return d
})
const calTitle = computed(() => {
  const y = calDate.value.getUTCFullYear()
  const m = calDate.value.getUTCMonth() + 1
  return `${y} 年 ${m} 月`
})

// ---- 当前显示月份的签到天数 ----
const monthCheckinCount = computed(() => {
  const y = calDate.value.getUTCFullYear()
  const m = calDate.value.getUTCMonth()
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
  return allDates.value.filter(d => d.startsWith(prefix)).length
})

// ---- 本年签到天数（不随翻页变化） ----
const yearCheckinCount = computed(() => {
  const year = new Date(Date.now() + 8 * 3600 * 1000).getUTCFullYear()
  return allDates.value.filter(d => d.startsWith(String(year))).length
})

// ---- 日历格子 ----
const calCells = computed(() => {
  const year = calDate.value.getUTCFullYear()
  const month = calDate.value.getUTCMonth()
  const nowDate = new Date(Date.now() + 8 * 3600 * 1000)
  const today = nowDate.toISOString().slice(0, 10)
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const set = new Set(allDates.value)

  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ label: '', cls: 'mute' })
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    let cls = ''
    if (ds === today) cls = 'today'
    else if (set.has(ds)) cls = 'done'
    cells.push({ label: String(d), cls })
  }
  return cells
})

// ---- 排行榜开关（wd-switch change 事件参数为 { value }） ----
async function onRankSwitch({ value }) {
  // 开关值 = 是否展示在排行榜，对应 rankHidden 取反
  const hidden = !value
  try {
    const res = await callFunction('userService', { action: 'updateRankHidden', hidden })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      profile.value.rankHidden = hidden
      uni.showToast({ title: hidden ? '已退出排行榜' : '已展示在排行榜', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '设置失败，请稍后再试', icon: 'none' })
  }
}

// ---- 暗色模式开关（跟随系统；change 事件参数为 { value }） ----
function onDarkSwitch({ value }) {
  followSystem.value = value
  setFollowSystem(value)
}

function goRank() {
  uni.navigateTo({ url: '/pages/rank/index' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding: 24rpx 24rpx 0;
}

.card {
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.label {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--ld-text);
  margin-bottom: 20rpx;
}

.hint {
  display: block;
  font-size: 24rpx;
  color: var(--ld-text-3);
  line-height: 1.6;
}

/* ===== 身体数据 ===== */
.bd-note {
  display: block;
  font-size: 21rpx;
  color: var(--ld-text-3);
  margin: -8rpx 0 16rpx;
}

.bd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;

  .bd-item {
    .bd-k {
      display: block;
      font-size: 22rpx;
      color: var(--ld-text-3);
      margin-bottom: 10rpx;
    }
  }

  .bd-input {
    height: 80rpx;
    padding: 0 22rpx;
    border-radius: 18rpx;
    background: var(--ld-bg);
    font-size: 28rpx;
    color: var(--ld-text);

    &.dis { opacity: 0.55; }
  }

  .bd-ph { color: var(--ld-text-3); font-size: 26rpx; }

  .gender {
    display: flex;
    gap: 12rpx;

    .g-item {
      flex: 1;
      height: 80rpx;
      line-height: 80rpx;
      text-align: center;
      border-radius: 18rpx;
      background: var(--ld-bg);
      font-size: 28rpx;
      color: var(--ld-text-2);

      &.on {
        background: var(--ld-primary-soft);
        color: var(--ld-primary-dark);
        font-weight: 700;
      }

      &.dis { opacity: 0.55; }
    }
  }
}

.bmr-box {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 24rpx 0;
  padding: 22rpx 26rpx;
  border-radius: var(--ld-radius-md);
  background: var(--ld-primary-soft);

  .s { font-size: 23rpx; color: var(--ld-text-2); }
  .b { font-size: 34rpx; font-weight: 800; color: var(--ld-primary-dark); }
}

/* ===== 今日热量记录 ===== */
.rec-block {
  padding: 20rpx 0;
  border-bottom: 1rpx dashed var(--ld-line);

  &:last-child { border-bottom: 0; }

  .rb-head {
    .rb-t { display: block; font-size: 28rpx; font-weight: 600; color: var(--ld-text); }
    .rb-s { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 6rpx; }
  }

  .rb-row {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-top: 16rpx;
  }

  .rb-input {
    flex: 1;
    min-width: 0;
    height: 80rpx;
    padding: 0 22rpx;
    border-radius: 18rpx;
    background: var(--ld-bg);
    font-size: 28rpx;
    color: var(--ld-text);
  }

  .rb-btn {
    flex-shrink: 0;
    height: 80rpx;
    line-height: 80rpx;
    padding: 0 32rpx;
    border-radius: 999rpx;
    background: var(--ld-primary);
    color: #fff;
    font-size: 26rpx;
    font-weight: 700;

    &.dis { opacity: 0.6; }
  }
}

/* ===== 差额与推荐 ===== */
.diff-box {
  padding: 28rpx;
  border-radius: var(--ld-radius-md);
  text-align: center;
  margin-bottom: 24rpx;

  &.surplus { background: linear-gradient(135deg, #fff1e2, #ffe2cc); }
  &.deficit { background: linear-gradient(135deg, var(--ld-primary-soft), #dff0e0); }

  .d-label { display: block; font-size: 23rpx; color: var(--ld-text-2); }

  .d-num {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 8rpx;
    margin: 8rpx 0;

    .n { font-size: 62rpx; font-weight: 800; color: var(--ld-primary-dark); letter-spacing: -1rpx; }
    .u { font-size: 24rpx; color: var(--ld-text-3); font-weight: 600; }
  }

  .d-sub { display: block; font-size: 22rpx; color: var(--ld-text-2); }
}

.rec {
  .rec-head {
    margin-bottom: 16rpx;

    .rh-t { display: block; font-size: 26rpx; font-weight: 700; color: var(--ld-text); }
    .rh-s { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 6rpx; }
  }
}

.calc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx dashed var(--ld-line);

  .ct { font-size: 24rpx; color: var(--ld-text-2); font-weight: 600; }
  .toggle { font-size: 23rpx; color: var(--ld-primary-dark); font-weight: 600; }
}

.calc-body {
  margin-top: 18rpx;
}

.calc-line {
  display: flex;
  gap: 14rpx;
  margin-top: 12rpx;

  .k {
    flex-shrink: 0;
    width: 130rpx;
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

/* 个人信息 */
.profile {
  display: flex;
  align-items: center;
  gap: 24rpx;

  .avatar-btn {
    padding: 0;
    margin: 0;
    background: none;
    line-height: normal;

    &::after { border: none; }
  }

  .avatar {
    width: 110rpx;
    height: 110rpx;
    border-radius: 50%;

    &.ph {
      background: linear-gradient(145deg, var(--ld-primary-soft), var(--ld-primary));
      display: grid;
      place-items: center;
      font-size: 52rpx;
    }
  }

  .pn {
    flex: 1;
    min-width: 0;

    .nick-row {
      display: flex;
      align-items: center;
      gap: 16rpx;
    }

    .nick-input {
      flex: 1;
      min-width: 0;
      font-size: 32rpx;
      font-weight: 700;
      color: var(--ld-text);
    }

    .body-btn {
      flex-shrink: 0;
      padding: 0 22rpx;
      height: 52rpx;
      line-height: 52rpx;
      border-radius: 999rpx;
      background: var(--ld-primary-soft);
      color: var(--ld-primary-dark);
      font-size: 22rpx;
      font-weight: 600;
    }

    .nick-ph { color: var(--ld-text-3); font-weight: 400; }

    .s { display: block; font-size: 23rpx; color: var(--ld-text-2); margin-top: 8rpx; }
  }
}

/* 累计摄入 / 消耗 */
.total-box {
  display: flex;
  align-items: center;
  margin-top: 28rpx;
  padding: 24rpx 0 4rpx;
  border-top: 1rpx dashed var(--ld-line);

  .tb-item {
    flex: 1;
    text-align: center;

    .tb-v { display: block; font-size: 44rpx; font-weight: 800; color: var(--ld-primary-dark); letter-spacing: -1rpx; }
    .tb-k { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 6rpx; }
  }

  .tb-sep {
    width: 1rpx;
    height: 56rpx;
    background: var(--ld-line);
  }
}

/* 身体数据弹窗 */
.popup-body {
  padding: 36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom));
}

/* 头像卡内打卡区（绿底胶囊） */
.ck-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, var(--ld-primary), var(--ld-primary-dark));

  .ck-l {
    flex: 1;
    min-width: 0;

    .b { display: block; font-size: 28rpx; font-weight: 800; color: #fff; }
    .s { display: block; font-size: 22rpx; color: rgba(255, 255, 255, 0.85); margin-top: 4rpx; }

    .streak {
      display: flex;
      gap: 10rpx;
      margin-top: 14rpx;

      .d {
        width: 18rpx;
        height: 18rpx;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);

        &.f { background: #fff; }
      }
    }
  }

  .checkin-btn {
    background: #fff;
    color: var(--ld-primary-dark);
    font-size: 26rpx;
    font-weight: 700;
    border-radius: 999rpx;
    padding: 0 40rpx;
    height: 64rpx;
    line-height: 64rpx;
    margin: 0;
    flex-shrink: 0;

    &.done {
      background: rgba(255, 255, 255, 0.25);
      color: rgba(255, 255, 255, 0.9);
    }

    &::after { border: none; }
  }
}

/* 积分排行榜入口 */
.rank-entry {
  display: flex;
  align-items: center;
  gap: 20rpx;

  .re-ico { font-size: 44rpx; }

  .re-mid {
    flex: 1;

    .b { display: block; font-size: 30rpx; font-weight: 700; color: var(--ld-text); }
    .s { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 4rpx; }
  }

  .re-arr { font-size: 44rpx; color: var(--ld-text-3); line-height: 1; }
}

/* 日历 */
.cal-head {
  margin-bottom: 20rpx;

  .cal-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40rpx;

    .chev {
      font-size: 40rpx;
      color: var(--ld-primary-dark);
      font-weight: 300;
      padding: 0 12rpx;
      line-height: 1;
    }

    .b { font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
  }

  .cal-stats {
    margin-top: 12rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12rpx;
    font-size: 23rpx;
    color: var(--ld-text-2);

    .num {
      color: var(--ld-primary-dark);
      font-weight: 700;
    }
  }
}

.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 21rpx;
  color: var(--ld-text-3);
  padding-bottom: 12rpx;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8rpx 0;

  text {
    text-align: center;
    font-size: 24rpx;
    color: var(--ld-text);
    height: 56rpx;
    line-height: 56rpx;

    &.mute { color: transparent; }
    &.done {
      color: var(--ld-primary-dark);
      font-weight: 700;
      background: var(--ld-primary-soft);
      border-radius: 50%;
      width: 56rpx;
      justify-self: center;
    }
    &.today {
      color: #fff;
      font-weight: 700;
      background: var(--ld-primary);
      border-radius: 50%;
      width: 56rpx;
      justify-self: center;
    }
  }
}

/* 设置行 */
.set-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx dashed var(--ld-line);

  &:last-child { border-bottom: 0; }

  .st {
    flex: 1;

    .b { display: block; font-size: 28rpx; color: var(--ld-text); }
    .s { display: block; font-size: 22rpx; color: var(--ld-text-3); margin-top: 6rpx; }
  }
}
</style>
