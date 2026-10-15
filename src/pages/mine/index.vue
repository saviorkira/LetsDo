<!-- 文件路径：src/pages/mine/index.vue -->
<!-- 我的 Tab：用户信息 / 每日打卡 / 打卡日历 / 积分 / 设置 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- 个人信息卡：微信头像昵称填写能力 -->
    <view class="card ld-card">
      <view class="profile">
        <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image v-if="profile.avatarUrl" class="avatar" :src="profile.avatarUrl" mode="aspectFill" />
          <view v-else class="avatar ph">🧑‍🍳</view>
        </button>
        <view class="pn">
          <!-- 昵称填写：微信 nickname 输入框 -->
          <input
            class="nick-input"
            type="nickname"
            v-model="profile.nickName"
            placeholder="点击设置昵称"
            placeholder-class="nick-ph"
            @blur="onNickNameBlur"
          />
          <text class="s">已连续打卡 {{ streak }} 天 · 累计打卡 {{ totalDays }} 天</text>
        </view>
      </view>
    </view>

    <!-- 今日打卡卡 -->
    <view class="checkin-card ld-card">
      <view class="row">
        <view class="t">
          <text class="b">今日已做</text>
          <text class="s">每日打卡一次，积分 +1</text>
        </view>
        <button
          class="checkin-btn"
          :class="{ done: checkedToday }"
          :disabled="checkedToday || checkinLoading"
          @click="doCheckin"
        >{{ checkedToday ? '今日已打卡' : (checkinLoading ? '打卡中...' : '打卡') }}</button>
      </view>
      <view class="streak">
        <view
          v-for="(d, i) in weekDots"
          :key="i"
          class="d"
          :class="{ f: d }"
        ></view>
      </view>
    </view>

    <!-- 打卡日历 -->
    <view class="card ld-card">
      <view class="cal-head"><text class="b">我的打卡日历 · {{ calTitle }}</text></view>
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

    <!-- 积分卡 -->
    <view class="card ld-card">
      <view class="point-row">
        <text class="big">{{ profile.totalPoint }}</text>
        <view class="pb">
          <text class="b">累计积分</text>
          <text class="s">每成功打卡 1 次 +1 分</text>
        </view>
        <view class="go" @click="goRank">积分排行榜 ›</view>
      </view>
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

// ---- 页面数据 ----
const profile = ref({ nickName: '', avatarUrl: '', totalPoint: 0, rankHidden: false })
const checkedToday = ref(false)
const checkinLoading = ref(false)
const monthDates = ref([]) // 当月已打卡日期 YYYY-MM-DD
const streak = ref(0)
const totalDays = ref(0)
const followSystem = ref(isFollowSystem())

// ---- 数据加载 ----
async function loadMine() {
  try {
    const res = await callFunction('userService', { action: 'getMine' })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      profile.value = ret.data.profile
      checkedToday.value = ret.data.checkedToday
      monthDates.value = ret.data.monthDates
      streak.value = ret.data.streak
      totalDays.value = ret.data.totalCheckinDays
    }
  } catch (e) {
    console.error('我的页面加载失败', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  }
}
onShow(loadMine)

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

// ---- 当月日历 ----
const nowDate = new Date(Date.now() + 8 * 3600 * 1000)
const calTitle = `${nowDate.getUTCFullYear()} 年 ${nowDate.getUTCMonth() + 1} 月`
const calCells = computed(() => {
  const year = nowDate.getUTCFullYear()
  const month = nowDate.getUTCMonth() // 0-based
  const today = nowDate.toISOString().slice(0, 10)
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const set = new Set(monthDates.value)

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

    .nick-input {
      font-size: 32rpx;
      font-weight: 700;
      color: var(--ld-text);
      width: 100%;
    }

    .nick-ph { color: var(--ld-text-3); font-weight: 400; }

    .s { display: block; font-size: 23rpx; color: var(--ld-text-2); margin-top: 8rpx; }
  }
}

/* 打卡卡 */
.checkin-card {
  padding: 32rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(135deg, var(--ld-primary), var(--ld-primary-dark));

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .t {
      .b { display: block; font-size: 32rpx; font-weight: 800; color: #fff; }
      .s { display: block; font-size: 23rpx; color: rgba(255, 255, 255, 0.85); margin-top: 6rpx; }
    }

    .checkin-btn {
      background: #fff;
      color: var(--ld-primary-dark);
      font-size: 26rpx;
      font-weight: 700;
      border-radius: 999rpx;
      padding: 0 44rpx;
      height: 72rpx;
      line-height: 72rpx;
      margin: 0;

      &.done {
        background: rgba(255, 255, 255, 0.25);
        color: rgba(255, 255, 255, 0.9);
      }

      &::after { border: none; }
    }
  }

  .streak {
    display: flex;
    gap: 14rpx;
    margin-top: 28rpx;

    .d {
      width: 22rpx;
      height: 22rpx;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);

      &.f { background: #fff; }
    }
  }
}

/* 日历 */
.cal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;

  .b { font-size: 26rpx; font-weight: 600; color: var(--ld-text); }
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

/* 积分卡 */
.point-row {
  display: flex;
  align-items: center;
  gap: 24rpx;

  .big {
    font-size: 64rpx;
    font-weight: 800;
    color: var(--ld-primary-dark);
  }

  .pb {
    flex: 1;

    .b { display: block; font-size: 28rpx; font-weight: 600; color: var(--ld-text); }
    .s { display: block; font-size: 23rpx; color: var(--ld-text-3); margin-top: 4rpx; }
  }

  .go {
    font-size: 24rpx;
    color: var(--ld-primary-dark);
    font-weight: 600;
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
