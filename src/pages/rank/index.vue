<!-- 文件路径：src/pages/rank/index.vue -->
<!-- 积分排行榜：按积分降序，分页加载，举报按钮仅 UI 占位（逻辑留待后续迭代） -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <view class="cause-note">排行榜仅展示用户打卡行为数据（昵称 / 头像 / 积分），不代表平台立场。</view>

    <view v-if="list.length" class="card ld-card">
      <view v-for="(u, i) in list" :key="i" class="rank-row" :class="{ self: u.isMe }">
        <text class="medal" :class="'m' + (i + 1)">{{ i + 1 }}</text>
        <image v-if="u.avatarUrl" class="av" :src="u.avatarUrl" mode="aspectFill" />
        <view v-else class="av ph">🧑‍🍳</view>
        <view class="rn">
          <text class="b">{{ u.nickName }}<text v-if="u.isMe" class="tag-me">我</text></text>
        </view>
        <view class="pts">{{ u.totalPoint }}<text class="s"> 分</text></view>
        <!-- 举报按钮仅 UI 占位，业务逻辑暂不实现 -->
        <view class="report" @click="onReport">🚩</view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && !list.length" class="empty">
      <view class="ico">🏆</view>
      <text class="b">暂无上榜用户</text>
      <text class="s">快去打卡积累积分吧</text>
    </view>

    <!-- 分页加载 -->
    <view v-if="loading" class="more">加载中...</view>
    <view v-else-if="hasMore" class="more" @click="loadList">上拉加载更多</view>

    <!-- 本人排名信息（未上榜时也展示入口） -->
    <view v-if="myRank" class="my-rank">我当前排名：第 {{ myRank }} 名</view>

    <Disclaimer />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onReachBottom } from '@dcloudio/uni-app'
import { callFunction } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import Disclaimer from '@/components/Disclaimer.vue'

const list = ref([])
const page = ref(1)
const hasMore = ref(false)
const loading = ref(false)
const myRank = ref(null)

async function loadList(reset) {
  if (loading.value) return
  if (reset) {
    page.value = 1
    list.value = []
  }
  loading.value = true
  try {
    const res = await callFunction('getPointRank', { page: page.value, pageSize: 20 })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      list.value = reset ? ret.data.list : list.value.concat(ret.data.list)
      hasMore.value = ret.data.hasMore
      myRank.value = ret.data.myRank
      page.value++
    } else {
      uni.showToast({ title: ret.message || '加载失败', icon: 'none' })
    }
  } catch (e) {
    console.error('排行榜加载失败', e)
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(() => loadList(true))
// 触底加载更多
onReachBottom(() => {
  if (hasMore.value) loadList()
})

// 举报按钮仅 UI 占位：点击仅提示，不提交任何数据（PRD 明确延后迭代）
function onReport() {
  uni.showToast({ title: '举报功能即将上线', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--ld-bg);
  padding: 24rpx 24rpx 0;
}

.cause-note {
  font-size: 23rpx;
  color: var(--ld-text-2);
  background: var(--ld-bg);
  border: 1rpx dashed var(--ld-line);
  border-radius: var(--ld-radius-sm);
  padding: 18rpx 24rpx;
  margin-bottom: 24rpx;
  line-height: 1.5;
}

.card {
  padding: 12rpx 28rpx;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx dashed var(--ld-line);

  &:last-child { border-bottom: 0; }

  &.self {
    background: var(--ld-primary-soft);
    border-radius: var(--ld-radius-sm);
    padding-left: 16rpx;
    padding-right: 16rpx;
    margin-left: -16rpx;
    margin-right: -16rpx;
  }

  .medal {
    width: 48rpx;
    text-align: center;
    font-size: 28rpx;
    font-weight: 800;
    color: var(--ld-text-3);

    &.m1 { color: #e0a63c; }
    &.m2 { color: #9aa192; }
    &.m3 { color: #b87d4b; }
  }

  .av {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;

    &.ph {
      background: var(--ld-primary-soft);
      display: grid;
      place-items: center;
      font-size: 36rpx;
    }
  }

  .rn {
    flex: 1;
    min-width: 0;

    .b {
      font-size: 28rpx;
      font-weight: 600;
      color: var(--ld-text);

      .tag-me {
        font-size: 19rpx;
        color: #fff;
        background: var(--ld-primary);
        padding: 2rpx 12rpx;
        border-radius: 999rpx;
        margin-left: 10rpx;
      }
    }
  }

  .pts {
    font-size: 32rpx;
    font-weight: 800;
    color: var(--ld-primary-dark);

    .s { font-size: 22rpx; font-weight: 400; color: var(--ld-text-3); }
  }

  .report {
    font-size: 26rpx;
    opacity: 0.5;
    padding: 8rpx;
  }
}

.empty {
  text-align: center;
  padding: 120rpx 40rpx;

  .ico { font-size: 68rpx; margin-bottom: 20rpx; }
  .b { display: block; font-size: 28rpx; font-weight: 700; color: var(--ld-text); }
  .s { display: block; margin-top: 12rpx; font-size: 23rpx; color: var(--ld-text-2); }
}

.more, .my-rank {
  text-align: center;
  font-size: 23rpx;
  color: var(--ld-text-3);
  padding: 20rpx 0;
}
</style>
