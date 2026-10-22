<!-- 文件路径：src/pages/avatar/index.vue -->
<!-- 形象 Tab：健康虚拟形象 + 点击/按住舞台移动 + 装扮/宠物/家具/背景商店 + 装备管理 -->
<template>
  <view class="page" :class="{ 'theme-dark wd-dark': isDark }">
    <!-- 顶部信息卡 -->
    <view class="card ld-card info-card">
      <template v-if="avatar.hasProfile">
        <view class="stat-row">
          <view class="stat">
            <text class="sv">{{ avatar.bmi }}</text>
            <text class="sk">BMI</text>
          </view>
          <view class="stat">
            <text class="sv">{{ avatar.bmr }}</text>
            <text class="sk">基础代谢</text>
          </view>
          <view class="stat">
            <text class="sv tag">{{ avatar.label }}</text>
            <text class="sk">当前体格</text>
          </view>
        </view>
        <text v-if="avatar.mood" class="mood">{{ avatar.mood }}</text>
      </template>
      <template v-else>
        <text class="mood">还没有身体数据，形象还没孵化出来哦</text>
        <view class="go-profile" @click="goMine">去「我的」录入身高体重 ›</view>
      </template>
    </view>

    <!-- 形象小屋 -->
    <view class="card ld-card stage-card">
      <view class="hut-head">
        <view class="pt-pill">⭐ {{ avatar.totalPoint }} 积分</view>
        <view class="hut-actions">
          <view class="hut-btn attr" @click="showAttr = true"><text class="hut-ico">📊</text>状态</view>
          <view class="hut-btn place" :class="{ on: furnishing }" @click="toggleFurnish"><text class="hut-ico">🛠</text>布置</view>
          <view class="hut-btn shop" @click="openShop"><text class="hut-ico">🛍</text>饰品</view>
        </view>
      </view>

      <!-- 舞台：点击/按住移动人物（布置模式下家具可拖拽） -->
      <view class="stage" :class="[stageBgClass, room === 'bmi' ? 'room-bmi' : '']" @touchstart="onStageTouchStart" @touchmove="onStageTouchMove" @touchend="onStageTouchEnd" @touchcancel="onStageTouchEnd">
        <!-- 家具层（仅在 home，可多件同时摆放；布置模式可拖动/缩放） -->
        <template v-if="room === 'home'">
          <view
            v-for="f in equipped.furniture"
            :key="f.id"
            class="furniture"
            :class="[f.id, { placing: furnishing, selected: selectedFurn === f.id }]"
            :style="furnStyle(f)"
            @touchstart.stop="onItemTouch(f, 'furniture', $event)"
            @touchmove.stop.prevent="onItemTouchMove(f, 'furniture', $event)"
          >
            <text v-if="FUR_EMOJI[f.id]" class="fur-emoji">{{ FUR_EMOJI[f.id] }}</text>
          </view>
          <!-- 左侧门：出门（走过去触发） -->
          <view class="door door-left">
            <view class="door-plank"><view class="door-knob"></view></view>
            <text class="door-label">出门</text>
          </view>
          <!-- 右侧门：BMI 展示间 -->
          <view class="door door-right">
            <view class="door-plank"><view class="door-knob"></view></view>
            <view class="door-label"><text>BMI</text><text>人物展示</text></view>
          </view>

          <!-- 布置模式工具条 -->
          <view v-if="furnishing" class="furn-bar">
            <text class="fb-tip">{{ selectedFurn ? '拖动移动 · ± 调大小' : '点击家具/宠物选中后可调整' }}</text>
            <view class="fb-btn" :class="{ dis: !selectedFurn }" @click="furnScale(-0.2)">－</view>
            <view class="fb-btn" :class="{ dis: !selectedFurn }" @click="furnScale(0.2)">＋</view>
            <view class="fb-btn warn" :class="{ dis: !selectedFurn }" @click="furnRemove">卸下</view>
            <view class="fb-btn done" @click="toggleFurnish">完成</view>
          </view>
        </template>

        <!-- 宠物层（仅在 home，可同时带多只；布置模式可拖动/缩放） -->
        <view
          v-for="p in (room === 'home' ? equipped.pet : [])"
          :key="p.id"
          class="pet"
          :class="[p.id, { placing: furnishing, selected: selectedFurn === p.id }]"
          :style="furnStyle(p)"
          @touchstart.stop="onItemTouch(p, 'pet', $event)"
          @touchmove.stop.prevent="onItemTouchMove(p, 'pet', $event)"
        >
          <text class="pet-emoji">{{ PET_EMOJI[p.id] || '🐾' }}</text>
        </view>

        <!-- BMI 展示间 -->
        <template v-if="room === 'bmi'">
          <!-- 左侧门：返回小屋 -->
          <view class="door door-left">
            <view class="door-plank"><view class="door-knob"></view></view>
            <text class="door-label">返回小屋</text>
          </view>
          <text class="bmi-title">同一身高 · 不同 BMI 的你</text>
          <view
            v-for="m in bmiModels"
            :key="m.bmi"
            class="model-wrap"
            :style="{ left: m.left + '%' }"
          >
            <view
              class="char model"
              :class="avatar.gender === 'female' ? 'girl' : 'boy'"
              :style="{ '--fat': m.fat, '--fat-head': m.fatHead }"
            >
              <view class="char-inner">
                <view class="shadow"></view>
                <view class="leg l1"></view>
                <view class="leg l2"></view>
                <view class="body"><view class="torso"></view><view class="arm a1"></view><view class="arm a2"></view></view>
                <view class="head"><view class="hair"></view><view class="eye e1"></view><view class="eye e2"></view><view class="blush b1"></view><view class="blush b2"></view><view class="mouth"></view></view>
              </view>
            </view>
            <view class="model-tag">
              <text class="mt-bmi">BMI {{ m.bmi }}</text>
              <text class="mt-w">{{ m.weight }}kg</text>
              <text class="mt-label">{{ m.label }}</text>
            </view>
          </view>
        </template>

        <!-- 人物 -->
        <view v-if="avatar.hasProfile" class="char" :class="charClass" :style="charStyle">
          <view class="char-inner">
            <view class="shadow"></view>
            <view class="leg l1"></view>
            <view class="leg l2"></view>
            <view class="body">
              <view class="torso" :class="equipped.top"></view>
              <view class="pants" :class="equipped.pants"></view>
              <view class="arm a1"></view>
              <view class="arm a2"></view>
              <view class="glove g1" :class="equipped.gloves"></view>
              <view class="glove g2" :class="equipped.gloves"></view>
            </view>
            <view class="head">
              <view class="hair"></view>
              <view class="eye e1"></view>
              <view class="eye e2"></view>
              <view class="blush b1"></view>
              <view class="blush b2"></view>
              <view class="mouth"></view>
            </view>
            <view v-if="equipped.hat.length" class="hat" :class="equipped.hat"></view>
            <view v-if="equipped.acc.length" class="acc" :class="equipped.acc"></view>
          </view>
        </view>
        <view v-else class="egg">🥚</view>

        <!-- 出门倒计时：仅覆盖舞台区域，底部导航可正常点击，倒计时继续 -->
        <view v-if="outing" class="outing-mask">
          <view class="outing-card">
            <text class="outing-icon">{{ outingPlace.icon }}</text>
            <text class="outing-name">{{ outingPlace.name }}</text>
            <text class="outing-timer">{{ outingRemain }}</text>
            <text class="outing-tip">时间到自动返回并获得属性加成</text>
            <view class="outing-quit" @click="quitOuting">提前回家（无奖励）</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 饰品商店弹窗：商店 + 我的饰品合并（兑换→装备→卸下一体） -->
    <wd-popup v-model="showShop" position="center" custom-style="border-radius: 32rpx; width: 88vw; max-width: 680rpx; margin-bottom: 140rpx;">
      <view class="shop-panel">
        <view class="shop-head">
          <text class="t">饰品商店</text>
          <text class="p">⭐ {{ avatar.totalPoint }} 积分</text>
        </view>
        <text class="shop-tip">点击积分按钮兑换，兑换后可随时装备/卸下</text>
        <view class="shop-tabs equip-tabs">
          <view v-for="t in shopTabs" :key="t.key" class="tab" :class="{ on: shopTab === t.key }" @click="shopTab = t.key">{{ t.label }}</view>
        </view>
        <scroll-view scroll-y class="goods-wrap">
          <view class="goods">
            <view v-for="g in filteredShop" :key="g.id" class="good">
              <view class="pv-box"><view class="pv" :class="g.id"></view></view>
              <text class="gn">{{ g.name }}</text>
              <text class="gt">{{ g.tip }}</text>
              <view class="gb" :class="goodBtnClass(g)" @click="onGood(g)">{{ goodBtnText(g) }}</view>
            </view>
          </view>
        </scroll-view>
      </view>
    </wd-popup>

    <!-- 属性弹窗 -->
    <wd-popup v-model="showAttr" position="center" custom-style="border-radius: 32rpx; width: 88vw; max-width: 680rpx; margin-bottom: 140rpx;">
      <view class="shop-panel">
        <view class="shop-head">
          <text class="t">人物状态</text>
          <text class="p">总评 {{ attrTotal }}</text>
        </view>
        <view class="attr-list">
          <view class="attr-item" v-for="a in attrList" :key="a.key">
            <text class="attr-icon">{{ a.icon }}</text>
            <view class="attr-info">
              <text class="attr-name">{{ a.name }}</text>
              <text class="attr-desc">{{ a.desc }}</text>
            </view>
            <text class="attr-value">{{ a.value }}</text>
          </view>
        </view>
        <text class="attr-tip">属性通过出门历练和装备提升，是挑战自我的门槛</text>
      </view>
    </wd-popup>

    <!-- 出门弹窗 -->
    <wd-popup v-model="showOut" position="center" custom-style="border-radius: 32rpx; width: 88vw; max-width: 680rpx; margin-bottom: 140rpx;">
      <view class="shop-panel">
        <view class="shop-head">
          <text class="t">出门</text>
          <text class="p">⭐ {{ avatar.totalPoint }} 积分</text>
        </view>
        <scroll-view scroll-y class="goods-wrap">
          <view class="out-list">
            <view class="out-item" v-for="p in outPlaces" :key="p.id" @click="onGoOut(p)">
              <text class="out-icon">{{ p.icon }}</text>
              <view class="out-info">
                <text class="out-name">{{ p.name }}</text>
                <text class="out-desc">{{ p.desc }}</text>
              </view>
              <view class="out-cost">
                <text class="out-attr">{{ p.attrText }}</text>
                <text class="out-price">{{ p.cost }} 积分 / {{ p.duration }}分钟</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="out-footer" @click="showBoss = true">
          <text class="boss-link">⚔️ 挑战自我</text>
        </view>
      </view>
    </wd-popup>

    <!-- Boss 挑战弹窗 -->
    <wd-popup v-model="showBoss" position="center" custom-style="border-radius: 32rpx; width: 88vw; max-width: 680rpx; margin-bottom: 140rpx;">
      <view class="shop-panel">
        <view class="shop-head">
          <text class="t">挑战自我</text>
        </view>
        <scroll-view scroll-y class="goods-wrap">
          <view class="boss-list">
            <view class="boss-item" v-for="b in bosses" :key="b.id" @click="onChallengeBoss(b)">
              <text class="boss-icon">{{ b.icon }}</text>
              <view class="boss-info">
                <text class="boss-name">{{ b.name }}</text>
                <text class="boss-desc">{{ b.desc }}</text>
                <text class="boss-need">需要总评 {{ b.needTotal }}（{{ b.needText }}）</text>
                <text class="boss-reward">必得：{{ b.rewardName }}</text>
              </view>
              <view class="boss-btn" :class="{ dis: !b.canChallenge }">{{ b.canChallenge ? '挑战' : '属性不足' }}</view>
            </view>
          </view>
        </scroll-view>
      </view>
    </wd-popup>

    <TabBar active="pages/avatar/index" />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { callFunction, reportCloudError } from '@/utils/cloud'
import { isDark } from '@/utils/theme'
import TabBar from '@/components/TabBar.vue'

// ---- 数据 ----
const avatar = ref({
  hasProfile: false, gender: 'male', bmi: 0, bmr: 0, label: '', mood: '', fat: 1,
  totalPoint: 0, equipped: {}, shop: []
})
const showShop = ref(false)
const showAttr = ref(false)
const showOut = ref(false)
const showBoss = ref(false)
const shopTab = ref('all')

// 出门倒计时
const outing = ref(false)
const outingPlace = ref({})
const outingRemain = ref('')
let outingTimer = null

// 饰品商店分类（全部商品 + 已拥有的稀有/掉落物品）
const shopTabs = [
  { key: 'all', label: '全部' },
  { key: 'top', label: '上衣' },
  { key: 'hat', label: '帽子' },
  { key: 'pants', label: '裤子' },
  { key: 'gloves', label: '手套' },
  { key: 'acc', label: '配饰' },
  { key: 'pet', label: '宠物' },
  { key: 'furniture', label: '家具' },
  { key: 'bg', label: '背景' }
]

// 宠物 emoji 映射
const PET_EMOJI = { pet_cat: '🐱', pet_dog: '🐕', pet_rabbit: '🐇', pet_chick: '🐤', pet_hamster: '🐹', pet_panda: '🐼', pet_fox: '🦊', pet_penguin: '🐧', rare_dragon: '🐉' }
// 家具 emoji 映射（fur_rug 是纯 CSS 地毯，fur_window/fur_clock 也是 CSS 绘制）
const FUR_EMOJI = { fur_sofa: '🛋️', fur_bed: '🛏️', fur_lamp: '💡', fur_plant: '🪴', fur_table: '🪑', fur_tv: '📺', fur_bookshelf: '📚', rare_castle: '🏰', rare_mirror: '🪞', drop_scroll: '📜', drop_shell: '🐚', fur_wallstar: '✨', fur_painting: '🖼️', fur_photo: '📷', fur_cloud: '☁️', fur_windbell: '🎐', fur_tapestry: '🧶' }
// 家具默认摆放位置（百分比，x/y 为元素左上角；与原 CSS 定位换算一致）
const DEFAULT_FURN_POS = {
  fur_sofa: { x: 8, y: 74 }, fur_bed: { x: 84, y: 72 }, fur_lamp: { x: 88, y: 20 },
  fur_rug: { x: 44, y: 82 }, fur_plant: { x: 5, y: 16 }, fur_table: { x: 52, y: 78 },
  fur_tv: { x: 76, y: 62 }, fur_bookshelf: { x: 20, y: 12 }, rare_castle: { x: 38, y: 72 },
  rare_mirror: { x: 84, y: 24 }, drop_scroll: { x: 30, y: 80 }, drop_shell: { x: 66, y: 84 },
  fur_window: { x: 50, y: 12 }, fur_clock: { x: 92, y: 14 },
  // 墙面装饰：默认贴在墙上（y 小 = 靠上）
  fur_wallstar: { x: 26, y: 1 }, fur_painting: { x: 24, y: 12 }, fur_photo: { x: 40, y: 9 },
  fur_cloud: { x: 74, y: 3 }, fur_windbell: { x: 58, y: 5 }, fur_tapestry: { x: 6, y: 12 }
}
// 宠物默认站位（百分比，x/y 为元素左上角，分散在屋内）
const DEFAULT_PET_POS = {
  pet_cat: { x: 18, y: 78 }, pet_dog: { x: 70, y: 80 }, pet_rabbit: { x: 32, y: 82 },
  pet_chick: { x: 52, y: 84 }, pet_hamster: { x: 62, y: 74 }, pet_panda: { x: 26, y: 68 },
  pet_fox: { x: 80, y: 70 }, pet_penguin: { x: 44, y: 78 }, rare_dragon: { x: 60, y: 64 }
}
const FALLBACK_POS = { x: 50, y: 70 }
const SCALE_MIN = 0.6
const SCALE_MAX = 3.5
const clamp100 = n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

// 布置模式状态
const furnishing = ref(false)
const selectedFurn = ref(null)
const selectedSlot = ref('furniture')
let furnDrag = null
let furnSaveTimer = null

// 布置元素归一化：统一成 {id, x, y, scale}
function normArrange(list, defaults) {
  return (Array.isArray(list) ? list : (list ? [list] : [])).map(e => {
    const id = e && typeof e === 'object' ? e.id : e
    const def = defaults[id] || FALLBACK_POS
    const o = e && typeof e === 'object' ? e : {}
    return {
      id,
      x: o.x == null ? def.x : clamp100(o.x),
      y: o.y == null ? def.y : clamp100(o.y),
      scale: Math.max(SCALE_MIN, Math.min(SCALE_MAX, Number(o.scale) || 1))
    }
  })
}

// 装备数据归一化：每个槽位都是数组（兼容旧的单件格式；家具与宠物统一为 {id,x,y,scale}）
const equipped = computed(() => {
  const raw = avatar.value.equipped || {}
  const norm = {}
  for (const k of ['top', 'hat', 'acc', 'pants', 'gloves', 'pet', 'furniture', 'bg']) {
    const v = raw[k]
    norm[k] = Array.isArray(v) ? v : (v ? [v] : [])
  }
  norm.furniture = normArrange(norm.furniture, DEFAULT_FURN_POS)
  norm.pet = normArrange(norm.pet, DEFAULT_PET_POS)
  return norm
})

// 饰品商店过滤：商店商品（有 price）全部显示；稀有/掉落物品（无 price）仅已拥有时显示，便于装备
const filteredShop = computed(() => {
  const list = avatar.value.shop || []
  return list.filter(g => (shopTab.value === 'all' || g.slot === shopTab.value) && (g.price != null || g.owned))
})

// 舞台背景 class（多装备时取最新装备的一个）
const stageBgClass = computed(() => {
  const arr = equipped.value.bg || []
  const bg = arr[arr.length - 1]
  return bg ? `stage-${bg}` : ''
})

// 布置元素内联样式：位置 + 缩放（数据驱动，布置后保存在用户档案里）
function furnStyle(f) {
  const st = { left: f.x + '%', top: f.y + '%' }
  if (f.scale !== 1) st.transform = `scale(${f.scale})`
  return st
}

// 本地更新某件布置元素（直接改原始 equipped，computed 会重新归一化）
function updateItem(slot, id, patch) {
  const raw = avatar.value.equipped || {}
  const arr = raw[slot]
  if (!Array.isArray(arr)) return
  const i = arr.findIndex(e => (e && typeof e === 'object' ? e.id : e) === id)
  if (i < 0) return
  const cur = arr[i] && typeof arr[i] === 'object' ? arr[i] : { id }
  arr[i] = Object.assign({}, cur, patch, { id })
  avatar.value = { ...avatar.value }
}

// 保存布置（拖动停止后防抖调用）
function scheduleItemSave(slot, id) {
  clearTimeout(furnSaveTimer)
  furnSaveTimer = setTimeout(() => saveItem(slot, id), 700)
}
async function saveItem(slot, id) {
  const f = (equipped.value[slot] || []).find(x => x.id === id)
  if (!f) return
  try {
    await callFunction('avatarService', { action: 'furnishItem', slot, itemId: id, x: f.x, y: f.y, scale: f.scale })
  } catch (e) { /* 静默：下次布置会再保存 */ }
}

// 布置模式开关（退出前立刻保存选中元素，避免防抖丢失）
function toggleFurnish() {
  if (furnishing.value && selectedFurn.value) saveItem(selectedSlot.value, selectedFurn.value)
  furnishing.value = !furnishing.value
  selectedFurn.value = null
  furnDrag = null
  clearTimeout(furnSaveTimer)
  if (furnishing.value && !stageRect) getStageRect()
}

// 布置元素触摸：布置模式下点按选中 / 拖动移动；非布置模式转发给舞台走人逻辑
function onItemTouch(item, slot, e) {
  if (!furnishing.value) {
    onStageTouchStart(e)
    return
  }
  selectedFurn.value = item.id
  selectedSlot.value = slot
  const t = e.touches[0]
  furnDrag = { slot, id: item.id, sx: t.clientX, sy: t.clientY, ox: item.x, oy: item.y, moved: false }
}
function onItemTouchMove(item, slot, e) {
  if (!furnishing.value) {
    onStageTouchMove(e)
    return
  }
  if (!stageRect || !furnDrag || furnDrag.id !== item.id || furnDrag.slot !== slot) return
  const t = e.touches[0]
  const dx = t.clientX - furnDrag.sx
  const dy = t.clientY - furnDrag.sy
  if (!furnDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) furnDrag.moved = true
  if (!furnDrag.moved) return
  const x = clamp100(furnDrag.ox + (dx / stageRect.width) * 100)
  const y = clamp100(furnDrag.oy + (dy / stageRect.height) * 100)
  updateItem(slot, item.id, { x, y })
  scheduleItemSave(slot, item.id)
}

// 缩放选中的家具 / 宠物
function furnScale(delta) {
  const slot = selectedSlot.value
  if (!selectedFurn.value) return
  const f = (equipped.value[slot] || []).find(x => x.id === selectedFurn.value)
  if (!f) return
  const scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round((f.scale + delta) * 10) / 10))
  updateItem(slot, selectedFurn.value, { scale })
  saveItem(slot, selectedFurn.value)
}

// 布置模式卸下选中的家具 / 宠物
async function furnRemove() {
  const id = selectedFurn.value
  if (!id) return
  try {
    const res = await callFunction('avatarService', { action: 'equipItem', itemId: id })
    if ((res.result || {}).code === 'OK') {
      selectedFurn.value = null
      load()
    }
  } catch (e) {
    uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
  }
}

// ---- 加载 ----
async function load() {
  try {
    const res = await callFunction('avatarService', { action: 'getAvatar' })
    const ret = res.result || {}
    if (ret.code === 'OK') {
      avatar.value = ret.data
      // 恢复出门倒计时：如果当前正在外出，重新启动本地计时
      const os = avatar.value.outStatus
      if (os && os.endTime > Date.now()) {
        const place = OUT_PLACES.find(p => p.id === os.placeId)
        if (place) startOuting(place, os.endTime)
      } else {
        outing.value = false
        clearInterval(outingTimer)
      }
    }
  } catch (e) {
    reportCloudError('getAvatar', e)
  }
}
onShow(load)

// ---- 触摸移动：点击走一段，按住持续走 ----
const pos = ref({ x: 50, y: 38 })
const facing = ref('front')
const faceLeft = ref(false)
const moving = ref(false)
const room = ref('home') // 'home' 主小屋 / 'bmi' BMI 展示间

// BMI 展示间：同一身高下不同 BMI 的静态模特
const BMI_DEMO = [16, 18.5, 22, 26, 30]
const BMI_LABELS = ['小豆芽', '偏瘦', '标准', '壮实', '圆滚滚']
const bmiModels = computed(() => {
  const h = avatar.value.height || 170
  return BMI_DEMO.map((b, i) => {
    const weight = Math.round(b * Math.pow(h / 100, 2) * 10) / 10
    const fat = Math.max(0.8, Math.min(1.35, 1 + (b - 22) * 0.05))
    return {
      bmi: b,
      label: BMI_LABELS[i],
      weight,
      fat: Math.round(fat * 100) / 100,
      fatHead: (1 + (fat - 1) * 0.4).toFixed(3),
      left: 24 + i * 14
    }
  })
})

let stageRect = null
let moveInterval = null
let stopTimer = null
let lastDir = null

const STEP = 5
// 可活动范围（百分比）：左右几乎贴墙、上下加大，比例更自由
const BOUND = { xMin: 6, xMax: 88, yMin: 8, yMax: 64 }

// 获取舞台在页面中的位置
function getStageRect() {
  return new Promise(resolve => {
    uni.createSelectorQuery().select('.stage').boundingClientRect(rect => resolve(rect)).exec()
  })
}

// 根据触摸点与人物位置计算方向并移动一步（节流：touchmove 触发太频繁会导致 setData 风暴）
let lastMoveAt = 0
function moveByTouch(touch) {
  if (!stageRect) return
  const now = Date.now()
  if (now - lastMoveAt < 60) return
  lastMoveAt = now
  const px = ((touch.clientX - stageRect.left) / stageRect.width) * 100
  const py = ((touch.clientY - stageRect.top) / stageRect.height) * 100
  const dx = px - pos.value.x
  const dy = py - pos.value.y
  let dir
  if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left'
  else dir = dy > 0 ? 'down' : 'up'
  lastDir = dir
  doMove(dir)
}

function doMove(dir) {
  const p = pos.value
  if (dir === 'left') { p.x = Math.max(BOUND.xMin, p.x - STEP); faceLeft.value = true }
  if (dir === 'right') { p.x = Math.min(BOUND.xMax, p.x + STEP); faceLeft.value = false }
  if (dir === 'up') p.y = Math.max(BOUND.yMin, p.y - STEP)
  if (dir === 'down') p.y = Math.min(BOUND.yMax, p.y + STEP)
  facing.value = 'side'
  moving.value = true
  clearTimeout(stopTimer)
  stopTimer = setTimeout(() => { moving.value = false; facing.value = 'front' }, 500)
  // 进门判定：精确到门的 x 范围，且人物头顶进入门的 y 范围（门顶 30% ~ 门底 60%）才触发
  // 门的 x 范围：右侧门 [84%, 97%]（right:3% + 宽12.8%），左侧门 [3%, 16%]（left:3% + 宽12.8%）
  if (room.value === 'home' && p.x >= 85 && p.y >= 25) {
    room.value = 'bmi'
    p.x = 25
    p.y = 45
    facing.value = 'front'
    faceLeft.value = false
  } else if (room.value === 'home' && p.x <= 16 && p.y >= 25) {
    // 走到左侧门口：弹出门菜单，并把人往回推一点避免重复触发
    p.x = 24
    showOut.value = true
  } else if (room.value === 'bmi' && p.x <= 16 && p.y >= 25) {
    room.value = 'home'
    p.x = 82
    p.y = 45
    facing.value = 'front'
    faceLeft.value = false
  }
}

async function onStageTouchStart(e) {
  if (!avatar.value.hasProfile || outing.value || furnishing.value) return
  if (!stageRect) stageRect = await getStageRect()
  const touch = e.touches[0]
  moveByTouch(touch)
  // 按住持续移动
  clearInterval(moveInterval)
  moveInterval = setInterval(() => { if (lastDir) doMove(lastDir) }, 150)
}

function onStageTouchMove(e) {
  if (!avatar.value.hasProfile || !stageRect || furnishing.value) return
  moveByTouch(e.touches[0])
}

function onStageTouchEnd() {
  clearInterval(moveInterval)
  moveInterval = null
  lastDir = null
  clearTimeout(stopTimer)
  stopTimer = setTimeout(() => { moving.value = false; facing.value = 'front' }, 300)
}

onHide(() => {
  clearInterval(moveInterval)
  clearTimeout(stopTimer)
  // 倒计时定时器不在这里清除，切到其他 Tab 时继续保持计时
})

// ---- 属性系统 ----
const ATTR_META = [
  { key: 'power', name: '力量', icon: '💪', desc: '挑战自我的关键属性' },
  { key: 'agility', name: '敏捷', icon: '🏃', desc: '挑战自我的关键属性' },
  { key: 'intelligence', name: '智力', icon: '📚', desc: '挑战自我的关键属性' },
  { key: 'charm', name: '魅力', icon: '✨', desc: '出门时提高物品掉落概率' },
  { key: 'stamina', name: '体力', icon: '❤️', desc: '挑战自我的关键属性' }
]

const attrList = computed(() => {
  const attr = avatar.value.attr || {}
  return ATTR_META.map(m => ({ ...m, value: attr[m.key] || 10 }))
})

const attrTotal = computed(() => attrList.value.reduce((s, a) => s + a.value, 0))

// ---- 出门系统 ----
const OUT_PLACES = [
  { id: 'gym', name: '健身房', icon: '💪', cost: 10, duration: 30, attr: { power: 2, stamina: 1 }, desc: '撸铁流汗，力量大涨' },
  { id: 'library', name: '图书馆', icon: '📚', cost: 8, duration: 20, attr: { intelligence: 2 }, desc: '静心阅读，智力提升' },
  { id: 'park', name: '公园', icon: '🌳', cost: 5, duration: 15, attr: { agility: 1, charm: 1 }, desc: '散步呼吸新鲜空气' },
  { id: 'cafe', name: '咖啡馆', icon: '☕', cost: 6, duration: 10, attr: { charm: 2 }, desc: '悠闲下午茶时光' },
  { id: 'pool', name: '游泳馆', icon: '🏊', cost: 12, duration: 25, attr: { stamina: 2, agility: 1 }, desc: '全身运动，体力充沛' }
]

const outPlaces = computed(() => OUT_PLACES.map(p => ({
  ...p,
  attrText: Object.keys(p.attr).map(k => `${ATTR_META.find(m => m.key === k).name}+${p.attr[k]}`).join(' ')
})))

async function onGoOut(place) {
  if (outing.value) {
    uni.showToast({ title: '正在外出中', icon: 'none' })
    return
  }
  if (avatar.value.totalPoint < place.cost) {
    uni.showToast({ title: '积分不足', icon: 'none' })
    return
  }
  uni.showModal({
    title: `去${place.name}`,
    content: `消耗 ${place.cost} 积分，${place.duration} 分钟后返回，可获得 ${place.attrText}`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const ret = await callFunction('avatarService', { action: 'goOut', placeId: place.id })
        const r = ret.result || {}
        if (r.code === 'OK') {
          showOut.value = false
          startOuting(place, r.data.endTime)
          avatar.value.totalPoint -= place.cost
        } else {
          uni.showToast({ title: r.message || '出门失败', icon: 'none' })
        }
      } catch (e) {
        reportCloudError('goOut', e)
      }
    }
  })
}

function startOuting(place, endTime) {
  clearInterval(outingTimer)
  outing.value = true
  outingPlace.value = place
  const update = () => {
    const remain = Math.max(0, endTime - Date.now())
    const m = Math.floor(remain / 60000)
    const s = Math.floor((remain % 60000) / 1000)
    outingRemain.value = `${m}:${s.toString().padStart(2, '0')}`
    if (remain <= 0) {
      clearInterval(outingTimer)
      finishOuting()
    }
  }
  update()
  outingTimer = setInterval(update, 1000)
}

async function finishOuting() {
  outing.value = false
  try {
    const ret = await callFunction('avatarService', { action: 'checkOut' })
    const r = ret.result || {}
    if (r.code === 'DONE' && r.data.place) {
      const p = r.data.place
      const gains = Object.keys(p.attr).map(k => `${ATTR_META.find(m => m.key === k).name}+${p.attr[k]}`).join(' ')
      let content = `在${p.name}度过了愉快的时光，${gains}`
      if (r.data.drop) content += `\n🎁 意外捡到【${r.data.drop.name}】！`
      uni.showModal({
        title: '回家啦',
        content,
        showCancel: false
      })
      load() // 刷新属性
    }
  } catch (e) {
    console.error('结算失败', e)
  }
}

// 提前退出出门：无属性加成、无掉落，直接回家不弹确认
async function quitOuting() {
  try {
    await callFunction('avatarService', { action: 'quitOut' })
  } catch (e) {
    // 网络异常也按已回家处理，下次 onShow 会自动校正
  }
  clearInterval(outingTimer)
  outing.value = false
  uni.showToast({ title: '提前回家了，本次没有奖励', icon: 'none' })
  load()
}

// ---- Boss 挑战（七大罪，傲慢最强）----
const BOSSES = [
  { id: 'boss_pride', name: '傲慢', icon: '👑', need: { power: 25, agility: 20, intelligence: 20, charm: 22, stamina: 25 }, rewardName: '王者之冠', desc: '七大罪之首，最强Boss' },
  { id: 'boss_wrath', name: '暴怒', icon: '😡', need: { power: 20, agility: 15 }, rewardName: '暴怒拳套', desc: '怒火燃烧一切' },
  { id: 'boss_lust', name: '色欲', icon: '😈', need: { charm: 20, agility: 16 }, rewardName: '魅影玫瑰', desc: '魅惑众生的幻影' },
  { id: 'boss_greed', name: '贪婪', icon: '🤑', need: { intelligence: 18, charm: 15 }, rewardName: '黄金钱袋', desc: '永远填不满的欲望' },
  { id: 'boss_envy', name: '嫉妒', icon: '🐍', need: { intelligence: 16, charm: 16 }, rewardName: '翡翠魔镜', desc: '映出他人拥有的一切' },
  { id: 'boss_gluttony', name: '暴食', icon: '🍔', need: { power: 15, intelligence: 12 }, rewardName: '小青龙', desc: '吞噬无尽的美食' },
  { id: 'boss_sloth', name: '懒惰', icon: '😴', need: { power: 12, stamina: 12 }, rewardName: '勇者之剑', desc: '沉睡千年的懒人' }
]

const bosses = computed(() => {
  const attr = avatar.value.attr || {}
  return BOSSES.map(b => {
    const canChallenge = Object.keys(b.need).every(k => (attr[k] || 0) >= b.need[k])
    const needText = Object.keys(b.need).map(k => `${ATTR_META.find(m => m.key === k).name}${b.need[k]}`).join(' ')
    const needTotal = Object.keys(b.need).reduce((s, k) => s + b.need[k], 0)
    return { ...b, canChallenge, needText, needTotal }
  })
})

async function onChallengeBoss(boss) {
  if (!boss.canChallenge) {
    uni.showToast({ title: '属性不足，先去提升属性吧', icon: 'none' })
    return
  }
  uni.showModal({
    title: `挑战${boss.name}`,
    content: `确定要挑战${boss.name}吗？成功可获得${boss.rewardName}`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        const ret = await callFunction('avatarService', { action: 'challengeBoss', bossId: boss.id })
        const r = ret.result || {}
        if (r.code === 'OK') {
          uni.showModal({
            title: '挑战成功！',
            content: `恭喜你击败了${boss.name}，获得${r.data.rareItem.name}！`,
            showCancel: false
          })
          load() // 刷新装备和属性
        } else if (r.code === 'ALREADY_OWNED') {
          uni.showToast({ title: '已经拥有该奖励啦', icon: 'none' })
        } else {
          uni.showToast({ title: r.message || '挑战失败', icon: 'none' })
        }
      } catch (e) {
        reportCloudError('challengeBoss', e)
      }
    }
  })
}

// ---- 人物样式 ----
const charClass = computed(() => [
  avatar.value.gender === 'female' ? 'girl' : 'boy',
  facing.value,
  { flip: faceLeft.value, moving: moving.value }
])

const charStyle = computed(() => {
  const fat = avatar.value.fat || 1
  return {
    left: pos.value.x + '%',
    top: pos.value.y + '%',
    '--fat': fat,
    '--fat-head': (1 + (fat - 1) * 0.4).toFixed(3)
  }
})

// ---- 商店 / 装备 ----
function openShop() {
  showShop.value = true
}

function goodBtnText(g) {
  if (g.equipped) return '卸下'
  if (g.owned) return '装备'
  return `⭐ ${g.price}`
}

function goodBtnClass(g) {
  return {
    buy: !g.owned,
    poor: !g.owned && avatar.value.totalPoint < g.price,
    eq: g.owned && !g.equipped,
    on: g.equipped
  }
}

async function onGood(g) {
  if (g.owned) {
    // 装备 / 卸下
    try {
      const res = await callFunction('avatarService', { action: 'equipItem', itemId: g.id })
      const ret = res.result || {}
      if (ret.code === 'OK') {
        load()
      } else {
        uni.showToast({ title: ret.message || '操作失败', icon: 'none' })
      }
    } catch (e) {
      uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
    }
    return
  }
  // 兑换
  uni.showModal({
    title: '兑换饰品',
    content: `花费 ${g.price} 积分兑换「${g.name}」？`,
    success: async (r) => {
      if (!r.confirm) return
      try {
        const res = await callFunction('avatarService', { action: 'buyItem', itemId: g.id })
        const ret = res.result || {}
        if (ret.code === 'OK') {
          uni.showToast({ title: '兑换成功，点击「装备」穿上', icon: 'none' })
          load()
        } else {
          uni.showToast({ title: ret.message || '购买失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' })
      }
    }
  })
}

function goMine() {
  uni.redirectTo({ url: '/pages/mine/index' })
}
</script>

<style lang="scss" scoped>
/* 页面固定：不滚动，内容全在一屏内 */
.page {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  overflow: hidden;
  background: var(--ld-bg);
  padding: 20rpx 24rpx calc(124rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.card { padding: 28rpx; margin-bottom: 20rpx; }
/* 顶部信息卡固定高度，防止 mood 文本变长时挤压下方舞台 */
.info-card { flex-shrink: 0; height: 232rpx; box-sizing: border-box; overflow: hidden; }
.stage-card { flex: 1; min-height: 0; display: flex; flex-direction: column; }

/* 信息卡 */
.stat-row {
  display: flex;
  height: 84rpx;
  .stat {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4rpx;
    .sv { font-size: 38rpx; font-weight: 800; color: var(--ld-primary-dark); &.tag { font-size: 28rpx; } }
    .sk { font-size: 20rpx; color: var(--ld-text-3); }
  }
}
.mood {
  display: block; margin-top: 16rpx; padding: 14rpx 16rpx; border-radius: 14rpx;
  background: var(--ld-primary-soft); font-size: 22rpx; color: var(--ld-text-2); text-align: center;
  max-height: 56rpx; line-height: 1.6;
  /* 多行溢出截断，超过 2 行隐藏 */
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.go-profile { margin-top: 14rpx; text-align: center; font-size: 26rpx; font-weight: 700; color: var(--ld-primary-dark); }

/* 小屋头部 */
.hut-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; flex-shrink: 0; }
.pt-pill {
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #fff3bf, #ffe066); color: #e67700; font-size: 22rpx; font-weight: 800;
}
.hut-actions { display: flex; gap: 14rpx; align-items: center; }
.hut-ico { font-size: 26rpx; line-height: 1; margin-right: 8rpx; }
.hut-btn {
  height: 56rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  font-size: 22rpx; font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  &.equip { background: var(--ld-primary-soft); color: var(--ld-primary-dark); }
  &.attr { background: var(--ld-primary-soft); color: var(--ld-primary-dark); }
  &.place { background: var(--ld-primary-soft); color: var(--ld-primary-dark); }
  &.place.on { background: #ffd43b; color: #5c4400; }
  &.shop { background: var(--ld-primary); color: #fff; }
}

/* 舞台 */
.stage {
  position: relative; flex: 1; min-height: 400rpx; border-radius: var(--ld-radius-md); overflow: hidden;
  background: linear-gradient(180deg, #dff3ff 0%, #dff3ff 60%, #ffe9c9 60%, #ffe9c9 100%);
  touch-action: none;

  /* 所有背景地面线统一在 60%（距底 40%），保证门在所有背景下都贴地 */
  &.stage-bg_forest { background: linear-gradient(180deg, #d3f9d8 0%, #d3f9d8 60%, #b2f2bb 60%, #b2f2bb 100%); }
  &.stage-bg_beach { background: linear-gradient(180deg, #a5d8ff 0%, #a5d8ff 60%, #ffe8cc 60%, #ffe8cc 100%); }
  &.stage-bg_starry { background: linear-gradient(180deg, #1a1b4b 0%, #1a1b4b 60%, #2d2b55 60%, #2d2b55 100%); }
  &.stage-bg_sunset { background: linear-gradient(180deg, #ffa94d 0%, #ffa94d 60%, #ffd8a8 60%, #ffd8a8 100%); }
  &.stage-bg_sakura { background: linear-gradient(180deg, #fcc2d7 0%, #fcc2d7 60%, #ffe8cc 60%, #ffe8cc 100%); }
  &.stage-bg_rainy { background: linear-gradient(180deg, #868e96 0%, #868e96 60%, #adb5bd 60%, #adb5bd 100%); }
  &.stage-bg_snow { background: linear-gradient(180deg, #e7f5ff 0%, #e7f5ff 60%, #fff 60%, #fff 100%); }
}
.egg { position: absolute; left: 50%; top: 54%; transform: translate(-50%, -50%); font-size: 100rpx; }
/* 舞台 */

/* 门：两个房间地面线都在 60%（距底 40%），统一贴地 */
.door {
  position: absolute; bottom: 40%; z-index: 1;
  width: 96rpx; height: 180rpx;

  &.door-right { right: 3%; }
  &.door-left { left: 3%; }

  .door-plank {
    position: absolute; inset: 0;
    border-radius: 12rpx 12rpx 4rpx 4rpx;
    background: linear-gradient(180deg, #b08968 0%, #8d6e63 100%);
    box-shadow: inset 0 -10rpx 0 rgba(0,0,0,0.12), 0 4rpx 12rpx rgba(0,0,0,0.1);
  }
  .door-knob {
    position: absolute; top: 88rpx; width: 14rpx; height: 14rpx; border-radius: 50%;
    background: #ffe066; box-shadow: 0 1rpx 3rpx rgba(0,0,0,0.3);
  }
  &.door-right .door-knob { left: 14rpx; }
  &.door-left .door-knob { right: 14rpx; }

  .door-label {
    position: absolute; top: 14rpx; left: 50%; transform: translateX(-50%);
    width: 100%;
    font-size: 18rpx; font-weight: 700; color: #fff;
    text-align: center; line-height: 1.3;
    text-shadow: 0 1rpx 2rpx rgba(0,0,0,0.3);
    /* 多行标签：text 默认 inline 会挤在一行，强制块级换行 */
    text { display: block; }
  }
}

/* BMI 展示间背景（地面线同样在 60%，门沿用统一样式） */
.stage.room-bmi {
  background: linear-gradient(180deg, #e7f5ff 0%, #e7f5ff 60%, #d0ebff 60%, #d0ebff 100%);
}
.bmi-title {
  position: absolute; top: 5%; left: 50%; transform: translateX(-50%);
  font-size: 24rpx; font-weight: 700; color: #4a6fa5;
  z-index: 1; white-space: nowrap;
}

/* 静态模特：缩放、禁动 */
.model-wrap {
  position: absolute; bottom: 36%; z-index: 1;

  .char.model {
    position: absolute; bottom: 0; left: 0;
    margin-left: -110rpx;
    transform: scale(0.52);
    transform-origin: bottom center;
    transition: none;
    animation: none;
    pointer-events: none;
  }

  .model-tag {
    position: absolute; top: 142rpx; left: 0;
    transform: translateX(-50%);
    text-align: center; white-space: nowrap;
    .mt-bmi { display: block; font-size: 18rpx; font-weight: 700; color: #4a6fa5; }
    .mt-w { display: block; font-size: 18rpx; color: var(--ld-text-2); }
    .mt-label { display: block; font-size: 18rpx; color: var(--ld-text-3); }
  }
}

/* 家具：位置与大小由档案数据驱动（left/top/transform 内联），这里只管外观 */
.furniture {
  position: absolute; z-index: 1; font-size: 64rpx;
  &.fur_sofa { font-size: 64rpx; }
  &.fur_bed { font-size: 64rpx; }
  &.fur_lamp { font-size: 64rpx; }
  &.fur_rug {
    width: 200rpx; height: 80rpx; border-radius: 50%; background: rgba(255, 107, 107, 0.25);
  }
  &.fur_plant { font-size: 56rpx; }
  &.fur_table { font-size: 56rpx; }
  &.fur_tv { font-size: 52rpx; }
  &.fur_bookshelf { font-size: 56rpx; }
  &.rare_castle { font-size: 72rpx; }
  &.rare_mirror { font-size: 56rpx; }
  &.drop_scroll { font-size: 52rpx; }
  &.drop_shell { font-size: 52rpx; }
  /* 墙面装饰 */
  &.fur_wallstar { font-size: 76rpx; }
  &.fur_painting { font-size: 60rpx; }
  &.fur_photo { font-size: 56rpx; }
  &.fur_cloud { font-size: 62rpx; }
  &.fur_windbell { font-size: 52rpx; }
  &.fur_tapestry { font-size: 56rpx; }
  &.fur_window {
    width: 80rpx; height: 70rpx; border-radius: 12rpx;
    background: linear-gradient(180deg, #a5d8ff 0%, #e7f5ff 100%);
    border: 6rpx solid #8d6e63; box-shadow: inset 0 0 0 4rpx #fff;
    &::after { content: ''; position: absolute; left: 50%; top: 0; width: 4rpx; height: 100%; background: #8d6e63; }
  }
  &.fur_clock {
    width: 44rpx; height: 44rpx; border-radius: 50%;
    background: #fff; border: 4rpx solid #343a40;
    &::before { content: ''; position: absolute; left: 50%; top: 50%; width: 4rpx; height: 14rpx; background: #343a40; transform: translate(-50%, -100%); }
    &::after { content: ''; position: absolute; left: 50%; top: 50%; width: 10rpx; height: 4rpx; background: #343a40; transform: translate(0, -50%); }
  }

  /* 布置模式：可拖拽高亮 */
  &.placing {
    border: 2rpx dashed rgba(78, 141, 245, 0.55);
    border-radius: 12rpx;
    background: rgba(78, 141, 245, 0.06);
  }
  &.selected {
    border: 3rpx solid #4e8df5;
    border-radius: 12rpx;
    background: rgba(78, 141, 245, 0.12);
  }
}

/* 布置模式工具条 */
.furn-bar {
  position: absolute; left: 50%; bottom: 3%; transform: translateX(-50%);
  z-index: 9; display: flex; align-items: center; gap: 12rpx;
  padding: 10rpx 16rpx; border-radius: 999rpx;
  background: rgba(33, 37, 41, 0.85); box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.18);
  white-space: nowrap;
  .fb-tip { font-size: 20rpx; color: #fff; margin-right: 4rpx; }
  .fb-btn {
    min-width: 52rpx; height: 48rpx; padding: 0 14rpx; border-radius: 999rpx;
    display: grid; place-items: center;
    font-size: 24rpx; color: #212529; background: #fff; font-weight: 700;
    &.warn { color: #fff; background: #ff8787; }
    &.done { color: #fff; background: #4e8df5; }
    &.dis { opacity: 0.4; }
  }
}

/* 宠物：位置与大小由档案数据驱动（left/top/transform 内联），上下浮动动画放在 emoji 上，避免吃掉缩放 */
.pet {
  position: absolute; z-index: 2;
  width: 80rpx; height: 80rpx; display: grid; place-items: center;
  .pet-emoji { font-size: 64rpx; line-height: 1; animation: petBob 0.8s ease-in-out infinite alternate; }
  &.placing { border: 2rpx dashed rgba(78, 141, 245, 0.55); border-radius: 12rpx; background: rgba(78, 141, 245, 0.06); }
  &.selected { border: 3rpx solid #4e8df5; border-radius: 12rpx; background: rgba(78, 141, 245, 0.12); }
}
@keyframes petBob { from { transform: translateY(0); } to { transform: translateY(-8rpx); } }

/* ===== 人物 CSS（与之前一致） ===== */
.char {
  position: absolute; width: 220rpx; height: 250rpx; margin-left: -110rpx;
  transition: left 0.2s ease, top 0.2s ease; z-index: 2;
  &.moving { animation: bob 0.26s ease-in-out infinite alternate; }
  .char-inner { position: relative; width: 100%; height: 100%; transition: transform 0.15s; }
  &.flip .char-inner { transform: scaleX(-1); }
}
@keyframes bob { from { transform: translateY(0); } to { transform: translateY(-10rpx); } }
.shadow { position: absolute; top: 238rpx; left: 50%; margin-left: -56rpx; width: 112rpx; height: 18rpx; border-radius: 50%; background: rgba(0,0,0,0.08); }
.leg {
  position: absolute; top: 202rpx; width: 32rpx; height: 46rpx; border-radius: 14rpx; background: #4c6ef5; z-index: 1;
  &::after { content: ''; position: absolute; bottom: -4rpx; left: -5rpx; width: 42rpx; height: 14rpx; border-radius: 8rpx; background: #343a40; }
  &.l1 { left: 80rpx; } &.l2 { right: 80rpx; }
}
.body {
  position: absolute; top: 122rpx; left: 50%; width: 170rpx; height: 92rpx; margin-left: -85rpx;
  transform: scaleX(var(--fat, 1)); z-index: 2;
}
.torso {
  position: absolute; left: 50%; margin-left: -57rpx; width: 114rpx; height: 92rpx;
  border-radius: 42rpx 42rpx 34rpx 34rpx; background: #f1f3f5; box-shadow: inset 0 -6rpx 0 rgba(0,0,0,0.05);
  &.top_red { background: #ff6b6b; }
  &.top_blue {
    background: #4dabf7;
    &::before, &::after { content: ''; position: absolute; top: 0; width: 16rpx; height: 56rpx; border-radius: 8rpx; background: #1864ab; }
    &::before { left: 16rpx; } &::after { right: 16rpx; }
  }
  &.top_stripe { background: repeating-linear-gradient(180deg, #f8f9fa 0 12rpx, #339af0 12rpx 24rpx); }
  &.top_star {
    background: #845ef7;
    &::after { content: '★'; position: absolute; left: 50%; top: 44%; transform: translate(-50%,-50%); color: #ffd43b; font-size: 36rpx; }
  }
  &.top_green { background: #69db7c; }
  &.top_rainbow {
    background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #845ef7);
  }
  &.top_hoodie {
    background: #868e96;
    &::before { content: ''; position: absolute; left: 50%; margin-left: -30rpx; top: -18rpx; width: 60rpx; height: 30rpx; border-radius: 30rpx 30rpx 0 0; background: #868e96; }
  }
  &.top_suit {
    background: #343a40;
    &::after { content: ''; position: absolute; left: 50%; top: 20rpx; margin-left: -8rpx; width: 16rpx; height: 50rpx; background: #fff; border-radius: 4rpx; }
  }
}

/* 裤子 */
.pants {
  position: absolute; left: 50%; top: 78rpx; transform: translateX(-50%);
  width: 100rpx; height: 50rpx; z-index: 1;
  border-radius: 0 0 20rpx 20rpx;

  &.pants_jeans { background: #4a6fa5; }
  &.pants_shorts { background: #ff8787; height: 30rpx; }
  &.pants_skirt { background: #faa2c1; width: 120rpx; height: 42rpx; border-radius: 0 0 40rpx 40rpx; }
}

/* 手套 */
.glove {
  position: absolute; width: 28rpx; height: 28rpx; border-radius: 50%; z-index: 3;
  top: 48rpx;

  &.g1 { left: -6rpx; }
  &.g2 { right: -6rpx; }

  &.gloves_wool { background: #ff8787; }
  &.gloves_leather { background: #8d6e63; }
  /* 暴怒拳套：火焰红 */
  &.rare_gauntlet { background: #fa5252; box-shadow: 0 0 12rpx #ff922b; width: 34rpx; height: 34rpx; }
}
.arm {
  position: absolute; top: 6rpx; width: 32rpx; height: 60rpx; border-radius: 16rpx; background: #ffd9b3;
  &.a1 { left: 0; } &.a2 { right: 0; }
}
.head {
  position: absolute; top: 0; left: 45rpx; width: 130rpx; height: 130rpx; border-radius: 50%;
  background: #ffe0bd; transform: scaleX(var(--fat-head, 1)); z-index: 3;
}
.hair { position: absolute; top: -4rpx; left: -4rpx; right: -4rpx; height: 52rpx; border-radius: 66rpx 66rpx 20rpx 20rpx; background: #5f4b32; }
.char.girl .head::before, .char.girl .head::after {
  content: ''; position: absolute; top: 32rpx; width: 30rpx; height: 76rpx; border-radius: 16rpx; background: #5f4b32; z-index: -1;
}
.char.girl .head::before { left: -12rpx; } .char.girl .head::after { right: -12rpx; }
.eye {
  position: absolute; top: 72rpx; width: 14rpx; height: 18rpx; border-radius: 50%; background: #3a2e26;
  &.e1 { left: 34rpx; } &.e2 { right: 34rpx; }
}
.blush {
  position: absolute; top: 96rpx; width: 22rpx; height: 14rpx; border-radius: 50%; background: #ffb3a7; opacity: 0.85;
  &.b1 { left: 20rpx; } &.b2 { right: 20rpx; }
}
.mouth {
  position: absolute; top: 96rpx; left: 51rpx; width: 28rpx; height: 16rpx;
  border: 4rpx solid #3a2e26; border-top: none; border-radius: 0 0 28rpx 28rpx;
}
.char.side {
  .eye.e2, .blush.b2 { opacity: 0; }
  .eye.e1 { left: 84rpx; }
  .blush.b1 { left: 64rpx; }
  .mouth { left: 76rpx; width: 20rpx; height: 12rpx; }
  .arm.a2 { opacity: 0; }
}
.hat {
  position: absolute; z-index: 5;
  &.hat_straw {
    top: -2rpx; left: 21rpx; width: 178rpx; height: 30rpx; border-radius: 50%; background: #f6c344;
    &::after {
      content: ''; position: absolute; left: 50%; margin-left: -48rpx; top: -42rpx; width: 96rpx; height: 58rpx;
      border-radius: 48rpx 48rpx 8rpx 8rpx; background: #f6c344; box-shadow: inset 0 -12rpx 0 #e8890c;
    }
  }
  &.hat_band { top: 28rpx; left: 47rpx; width: 126rpx; height: 20rpx; border-radius: 10rpx; background: #ff6b6b; }
  &.hat_cap {
    top: -6rpx; left: 45rpx; width: 130rpx; height: 46rpx;
    border-radius: 65rpx 65rpx 16rpx 16rpx; background: #339af0;
    &::after { content: ''; position: absolute; left: 50%; margin-left: -65rpx; top: 40rpx; width: 130rpx; height: 14rpx; border-radius: 8rpx; background: #1c7ed6; }
  }
  &.hat_crown {
    top: -40rpx; left: 73rpx; width: 74rpx; height: 52rpx; border-radius: 6rpx;
    background: linear-gradient(180deg, #ffe066, #fab005);
    clip-path: polygon(0% 100%, 0% 40%, 18% 68%, 32% 15%, 50% 62%, 68% 15%, 82% 68%, 100% 40%, 100% 100%);
  }
  /* 王者之冠：更大更华丽，紫金色 */
  &.rare_crown {
    top: -46rpx; left: 65rpx; width: 90rpx; height: 60rpx; border-radius: 8rpx;
    background: linear-gradient(180deg, #ffd43b, #e599f7);
    clip-path: polygon(0% 100%, 0% 36%, 16% 66%, 30% 8%, 50% 58%, 70% 8%, 84% 66%, 100% 36%, 100% 100%);
  }
}
.acc {
  position: absolute; z-index: 5;
  &.acc_balloon {
    top: 8rpx; right: -18rpx; width: 54rpx; height: 66rpx;
    border-radius: 50% 50% 46% 54% / 58% 58% 42% 42%;
    background: radial-gradient(circle at 32% 28%, #ffa8a8, #fa5252);
    &::after { content: ''; position: absolute; left: 50%; top: 64rpx; width: 4rpx; height: 70rpx; border-radius: 2rpx; background: #adb5bd; }
  }
  &.acc_flower {
    top: 52rpx; right: 4rpx; width: 30rpx; height: 30rpx;
    border-radius: 50%; background: #ffd43b;
    box-shadow: 0 -18rpx 0 -6rpx #ff8787, 0 18rpx 0 -6rpx #ff8787, -18rpx 0 0 -6rpx #ff8787, 18rpx 0 0 -6rpx #ff8787;
  }
  &.rare_sword {
    top: 40rpx; right: -30rpx; width: 64rpx; height: 64rpx;
    &::before { content: '⚔️'; font-size: 56rpx; line-height: 1; }
  }
  /* emoji 类配饰：统一渲染方式 */
  &.rare_rose, &.rare_goldbag, &.drop_clover, &.drop_feather, &.drop_fang {
    top: 40rpx; right: -26rpx; width: 56rpx; height: 56rpx;
    &::before { font-size: 48rpx; line-height: 1; }
  }
  &.rare_rose::before { content: '🌹'; }
  &.rare_goldbag::before { content: '💰'; }
  &.drop_clover::before { content: '🍀'; }
  &.drop_feather::before { content: '🪶'; }
  &.drop_fang::before { content: '🦷'; }
  /* 小手表：戴在右手腕（身体右下角） */
  &.acc_watch {
    top: 168rpx; right: 14rpx; width: 30rpx; height: 30rpx; border-radius: 50%;
    background: #fff; border: 4rpx solid #343a40;
    box-shadow: 0 -10rpx 0 -4rpx #8d6e63, 0 10rpx 0 -4rpx #8d6e63; /* 表带 */
    &::before { content: ''; position: absolute; left: 50%; top: 50%; width: 2rpx; height: 9rpx; background: #343a40; transform: translate(-50%, -100%); }
    &::after { content: ''; position: absolute; left: 50%; top: 50%; width: 8rpx; height: 2rpx; background: #343a40; transform: translate(0, -50%); }
  }
  /* 圆眼镜：架在眼部（head top 72rpx 处是眼睛） */
  &.acc_glasses {
    top: 66rpx; left: 66rpx; width: 96rpx; height: 26rpx;
    /* 中间横梁 */
    background: linear-gradient(180deg, transparent 10rpx, #343a40 10rpx, #343a40 14rpx, transparent 14rpx);
    &::before, &::after {
      content: ''; position: absolute; top: 0; width: 34rpx; height: 26rpx;
      border-radius: 50%; border: 4rpx solid #343a40; background: rgba(255, 255, 255, 0.3);
      box-sizing: border-box;
    }
    &::before { left: 0; } &::after { right: 0; }
  }
}

/* ===== 商店 / 装备弹窗 ===== */
.shop-panel {
  padding: 32rpx; /* 居中弹窗，整体上移避开底部导航 */
  background: var(--ld-card);
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border-radius: 32rpx;
}
.shop-head {
  display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
  .t { font-size: 32rpx; font-weight: 800; color: var(--ld-text); }
  .p { font-size: 26rpx; font-weight: 700; color: var(--ld-primary-dark); }
}
.shop-tabs {
  display: flex; gap: 12rpx; margin-top: 18rpx; flex-shrink: 0;
  .tab {
    padding: 10rpx 28rpx; border-radius: 999rpx; font-size: 24rpx; background: var(--ld-bg); color: var(--ld-text-2);
    &.on { background: var(--ld-primary); color: #fff; font-weight: 700; }
  }
}
.shop-tip { display: block; margin-top: 10rpx; font-size: 20rpx; color: var(--ld-text-3); flex-shrink: 0; }
.goods-wrap { flex: 1; min-height: 0; margin-top: 16rpx; }
.goods { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; padding-bottom: 20rpx; }
.empty { text-align: center; padding: 60rpx 0; color: var(--ld-text-3); font-size: 26rpx; }
.good {
  display: flex; flex-direction: column; align-items: center; gap: 8rpx; padding: 24rpx; border-radius: 20rpx; background: var(--ld-bg);
  .pv-box { width: 130rpx; height: 104rpx; display: grid; place-items: center; }
  .gn { font-size: 26rpx; font-weight: 700; color: var(--ld-text); }
  .gt { font-size: 20rpx; color: var(--ld-text-3); text-align: center; }
  .gb {
    margin-top: 6rpx; padding: 0 30rpx; height: 56rpx; line-height: 56rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 700;
    &.buy { background: var(--ld-primary); color: #fff; }
    &.buy.poor { opacity: 0.45; }
    &.eq { background: var(--ld-primary-soft); color: var(--ld-primary-dark); }
    &.on { background: var(--ld-line); color: var(--ld-text-3); }
  }
}

/* 预览小图 */
.pv {
  &.top_red, &.top_blue, &.top_stripe, &.top_star {
    width: 72rpx; height: 58rpx; border-radius: 20rpx; position: relative;
  }
  &.top_red { background: #ff6b6b; }
  &.top_blue {
    background: #4dabf7;
    &::before, &::after { content: ''; position: absolute; top: 0; width: 10rpx; height: 36rpx; border-radius: 5rpx; background: #1864ab; }
    &::before { left: 12rpx; } &::after { right: 12rpx; }
  }
  &.top_stripe { background: repeating-linear-gradient(180deg, #f8f9fa 0 10rpx, #339af0 10rpx 20rpx); }
  &.top_star {
    background: #845ef7;
    &::after { content: '★'; position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); color: #ffd43b; font-size: 28rpx; }
  }
  &.hat_band { width: 76rpx; height: 18rpx; border-radius: 9rpx; background: #ff6b6b; }
  &.hat_straw {
    position: relative; width: 92rpx; height: 18rpx; border-radius: 50%; background: #f6c344;
    &::after {
      content: ''; position: absolute; left: 50%; margin-left: -26rpx; top: -24rpx; width: 52rpx; height: 34rpx;
      border-radius: 26rpx 26rpx 6rpx 6rpx; background: #f6c344; box-shadow: inset 0 -8rpx 0 #e8890c;
    }
  }
  &.hat_crown {
    width: 56rpx; height: 42rpx; border-radius: 5rpx;
    background: linear-gradient(180deg, #ffe066, #fab005);
    clip-path: polygon(0% 100%, 0% 40%, 18% 68%, 32% 15%, 50% 62%, 68% 15%, 82% 68%, 100% 40%, 100% 100%);
  }
  &.acc_balloon { width: 46rpx; height: 56rpx; border-radius: 50% 50% 46% 54% / 58% 58% 42% 42%; background: radial-gradient(circle at 32% 28%, #ffa8a8, #fa5252); }

  /* 宠物预览 */
  &.pet_cat, &.pet_dog, &.pet_rabbit, &.pet_chick, &.pet_hamster, &.pet_panda, &.pet_fox, &.pet_penguin, &.rare_dragon {
    width: 80rpx; height: 80rpx; display: grid; place-items: center; font-size: 64rpx; line-height: 1;
  }
  &.pet_cat::before { content: '🐱'; }
  &.pet_dog::before { content: '🐕'; }
  &.pet_rabbit::before { content: '🐇'; }
  &.pet_chick::before { content: '🐤'; }
  &.pet_hamster::before { content: '🐹'; }
  &.pet_panda::before { content: '🐼'; }
  &.pet_fox::before { content: '🦊'; }
  &.pet_penguin::before { content: '🐧'; }
  &.rare_dragon::before { content: '🐉'; }

  /* 家具预览 */
  &.fur_sofa, &.fur_bed, &.fur_lamp, &.fur_plant, &.fur_table, &.fur_tv, &.fur_bookshelf, &.rare_castle {
    width: 80rpx; height: 80rpx; display: grid; place-items: center; font-size: 64rpx; line-height: 1;
  }
  &.fur_sofa::before { content: '🛋️'; }
  &.fur_bed::before { content: '🛏️'; }
  &.fur_lamp::before { content: '💡'; }
  &.fur_plant::before { content: '🪴'; }
  &.fur_table::before { content: '🪑'; }
  &.fur_tv::before { content: '📺'; }
  &.fur_bookshelf::before { content: '📚'; }
  &.rare_castle::before { content: '🏰'; }
  &.fur_rug {
    width: 90rpx; height: 40rpx; border-radius: 50%; background: rgba(255,107,107,0.35);
  }
  &.fur_window {
    width: 60rpx; height: 50rpx; border-radius: 8rpx;
    background: linear-gradient(180deg, #a5d8ff 0%, #e7f5ff 100%);
    border: 4rpx solid #8d6e63; position: relative;
    &::after { content: ''; position: absolute; left: 50%; top: 0; width: 3rpx; height: 100%; background: #8d6e63; }
  }
  &.fur_clock {
    width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; border: 3rpx solid #343a40; position: relative;
    &::before { content: ''; position: absolute; left: 50%; top: 50%; width: 3rpx; height: 10rpx; background: #343a40; transform: translate(-50%, -100%); }
    &::after { content: ''; position: absolute; left: 50%; top: 50%; width: 8rpx; height: 3rpx; background: #343a40; transform: translate(0, -50%); }
  }

  /* 背景预览 */
  &.bg_forest, &.bg_beach, &.bg_starry, &.bg_sunset, &.bg_sakura, &.bg_rainy, &.bg_snow {
    width: 90rpx; height: 60rpx; border-radius: 12rpx;
  }
  &.bg_forest { background: linear-gradient(180deg, #d3f9d8 0%, #d3f9d8 60%, #b2f2bb 60%, #b2f2bb 100%); }
  &.bg_beach { background: linear-gradient(180deg, #a5d8ff 0%, #a5d8ff 55%, #ffe8cc 55%, #ffe8cc 100%); }
  &.bg_starry { background: linear-gradient(180deg, #1a1b4b 0%, #1a1b4b 60%, #2d2b55 60%, #2d2b55 100%); }
  &.bg_sunset { background: linear-gradient(180deg, #ffa94d 0%, #ffa94d 45%, #ffd8a8 45%, #ffd8a8 100%); }
  &.bg_sakura { background: linear-gradient(180deg, #fcc2d7 0%, #fcc2d7 50%, #ffe8cc 50%, #ffe8cc 100%); }
  &.bg_rainy { background: linear-gradient(180deg, #868e96 0%, #868e96 50%, #adb5bd 50%, #adb5bd 100%); }
  &.bg_snow { background: linear-gradient(180deg, #e7f5ff 0%, #e7f5ff 55%, #fff 55%, #fff 100%); }

  /* 上衣预览 */
  &.top_green {
    width: 72rpx; height: 58rpx; border-radius: 20rpx; background: #69db7c;
  }
  &.top_rainbow {
    width: 72rpx; height: 58rpx; border-radius: 20rpx;
    background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #845ef7);
  }
  &.top_hoodie {
    width: 72rpx; height: 58rpx; border-radius: 20rpx; background: #868e96; position: relative;
    &::before { content: ''; position: absolute; left: 50%; margin-left: -20rpx; top: -12rpx; width: 40rpx; height: 20rpx; border-radius: 20rpx 20rpx 0 0; background: #868e96; }
  }
  &.top_suit {
    width: 72rpx; height: 58rpx; border-radius: 20rpx; background: #343a40; position: relative;
    &::after { content: ''; position: absolute; left: 50%; top: 12rpx; margin-left: -5rpx; width: 10rpx; height: 34rpx; background: #fff; border-radius: 3rpx; }
  }

  /* 裤子预览 */
  &.pants_jeans { width: 60rpx; height: 40rpx; border-radius: 0 0 16rpx 16rpx; background: #4a6fa5; }
  &.pants_shorts { width: 60rpx; height: 26rpx; border-radius: 0 0 20rpx 20rpx; background: #ff8787; }
  &.pants_skirt { width: 70rpx; height: 34rpx; border-radius: 0 0 28rpx 28rpx; background: #faa2c1; }

  /* 手套预览 */
  &.gloves_wool { width: 28rpx; height: 28rpx; border-radius: 50%; background: #ff8787; }
  &.gloves_leather { width: 28rpx; height: 28rpx; border-radius: 50%; background: #8d6e63; }

  /* 帽子预览 */
  &.hat_cap {
    position: relative; width: 80rpx; height: 30rpx; border-radius: 15rpx; background: #339af0;
    &::after { content: ''; position: absolute; left: 50%; margin-left: -40rpx; top: -16rpx; width: 80rpx; height: 26rpx; border-radius: 40rpx 40rpx 8rpx 8rpx; background: #339af0; }
  }
  &.hat_beanie {
    width: 76rpx; height: 44rpx; border-radius: 38rpx 38rpx 12rpx 12rpx; background: #ff8787;
    &::before { content: ''; position: absolute; left: 50%; margin-left: -30rpx; top: -12rpx; width: 60rpx; height: 20rpx; border-radius: 30rpx; background: #fff; }
  }
  &.hat_beret {
    width: 70rpx; height: 26rpx; border-radius: 50%; background: #e599f7; transform: rotate(-8deg);
    &::before { content: ''; position: absolute; left: 50%; margin-left: -4rpx; top: -10rpx; width: 8rpx; height: 12rpx; border-radius: 4rpx; background: #e599f7; }
  }

  /* 配饰预览 */
  &.acc_flower {
    width: 34rpx; height: 34rpx; border-radius: 50%; background: #ffd43b;
    box-shadow: 0 -10rpx 0 -4rpx #ff8787, 0 10rpx 0 -4rpx #ff8787, -10rpx 0 0 -4rpx #ff8787, 10rpx 0 0 -4rpx #ff8787;
  }
  &.acc_glasses {
    width: 56rpx; height: 20rpx; border-radius: 10rpx; border: 4rpx solid #343a40; background: transparent;
    &::before, &::after { content: ''; position: absolute; top: -4rpx; width: 16rpx; height: 20rpx; border-radius: 50%; border: 4rpx solid #343a40; background: transparent; }
    &::before { left: -8rpx; } &::after { right: -8rpx; }
  }
  &.acc_watch {
    width: 36rpx; height: 36rpx; border-radius: 50%; background: #fff; border: 4rpx solid #343a40;
    &::before { content: ''; position: absolute; left: 50%; top: 50%; width: 3rpx; height: 10rpx; background: #343a40; transform: translate(-50%, -100%); }
    &::after { content: ''; position: absolute; left: 50%; top: 50%; width: 8rpx; height: 3rpx; background: #343a40; transform: translate(0, -50%); }
  }
  &.rare_sword {
    width: 80rpx; height: 80rpx; display: grid; place-items: center; font-size: 64rpx; line-height: 1;
    &::before { content: '⚔️'; }
  }
  /* 稀有/掉落物品预览（emoji 统一渲染） */
  &.rare_crown, &.rare_gauntlet, &.rare_rose, &.rare_goldbag, &.rare_mirror,
  &.drop_clover, &.drop_feather, &.drop_fang, &.drop_scroll, &.drop_shell {
    width: 80rpx; height: 80rpx; display: grid; place-items: center; font-size: 64rpx; line-height: 1;
  }
  &.rare_crown::before { content: '👑'; }
  &.rare_gauntlet::before { content: '🥊'; }
  &.rare_rose::before { content: '🌹'; }
  &.rare_goldbag::before { content: '💰'; }
  &.rare_mirror::before { content: '🪞'; }
  &.drop_clover::before { content: '🍀'; }
  &.drop_feather::before { content: '🪶'; }
  &.drop_fang::before { content: '🦷'; }
  &.drop_scroll::before { content: '📜'; }
  &.drop_shell::before { content: '🐚'; }
}

/* ===== 属性按钮 ===== */
.hut-btn.attr {
  background: #e5dbff;
  color: #6741d9;
}

/* ===== 属性弹窗 ===== */
.attr-list {
  margin-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.attr-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: var(--ld-bg);
}
.attr-icon {
  font-size: 44rpx;
  line-height: 1;
  width: 64rpx;
  height: 64rpx;
  display: grid;
  place-items: center;
  background: var(--ld-card);
  border-radius: 16rpx;
  flex-shrink: 0;
}
.attr-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.attr-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ld-text);
}
.attr-desc {
  font-size: 20rpx;
  color: var(--ld-text-3);
}
.attr-value {
  font-size: 40rpx;
  font-weight: 800;
  color: #6741d9;
  flex-shrink: 0;
}
.attr-tip {
  display: block;
  margin-top: 20rpx;
  text-align: center;
  font-size: 20rpx;
  color: var(--ld-text-3);
}

/* ===== 出门弹窗 ===== */
.out-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-bottom: 10rpx;
}
.out-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--ld-bg);
}
.out-icon {
  font-size: 48rpx;
  line-height: 1;
  width: 80rpx;
  height: 80rpx;
  display: grid;
  place-items: center;
  background: var(--ld-card);
  border-radius: 20rpx;
  flex-shrink: 0;
}
.out-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.out-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ld-text);
}
.out-desc {
  font-size: 20rpx;
  color: var(--ld-text-3);
}
.out-cost {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
  flex-shrink: 0;
}
.out-attr {
  font-size: 20rpx;
  font-weight: 700;
  color: var(--ld-primary-dark);
}
.out-price {
  font-size: 20rpx;
  color: #e67700;
  font-weight: 700;
}
.out-footer {
  margin-top: 16rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #ffe8cc, #ffd8a8);
  text-align: center;
  flex-shrink: 0;
}
.boss-link {
  font-size: 26rpx;
  font-weight: 800;
  color: #d9480f;
}

/* ===== Boss 弹窗 ===== */
.boss-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-bottom: 10rpx;
}
.boss-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--ld-bg);
}
.boss-icon {
  font-size: 52rpx;
  line-height: 1;
  width: 88rpx;
  height: 88rpx;
  display: grid;
  place-items: center;
  background: var(--ld-card);
  border-radius: 20rpx;
  flex-shrink: 0;
}
.boss-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.boss-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--ld-text);
}
.boss-desc {
  font-size: 20rpx;
  color: var(--ld-text-3);
}
.boss-need {
  font-size: 20rpx;
  color: #6741d9;
  font-weight: 600;
}
.boss-reward {
  font-size: 20rpx;
  color: #e67700;
  font-weight: 700;
}
.boss-btn {
  padding: 0 32rpx;
  height: 60rpx;
  line-height: 60rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #ff8787, #fa5252);
  color: #fff;
  flex-shrink: 0;
  &.dis {
    background: var(--ld-line);
    color: var(--ld-text-3);
  }
}

/* ===== 出门倒计时遮罩：仅覆盖舞台，不挡底部导航 ===== */
.outing-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
}
.outing-card {
  width: 76%;
  max-width: 520rpx;
  padding: 48rpx 36rpx;
  border-radius: 32rpx;
  background: var(--ld-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.outing-icon {
  font-size: 88rpx;
  line-height: 1;
}
.outing-name {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--ld-text);
}
.outing-timer {
  font-size: 72rpx;
  font-weight: 800;
  color: var(--ld-primary-dark);
  font-variant-numeric: tabular-nums;
  letter-spacing: 4rpx;
}
.outing-tip {
  font-size: 22rpx;
  color: var(--ld-text-3);
  text-align: center;
}
.outing-quit {
  margin-top: 8rpx;
  padding: 14rpx 44rpx;
  border-radius: 999rpx;
  background: var(--ld-primary-soft);
  color: var(--ld-primary-dark);
  font-size: 24rpx;
  font-weight: 600;
}
/* 装备面板分类：数量多，允许换行 */
.equip-tabs {
  flex-wrap: wrap;
  .tab {
    font-size: 22rpx;
    padding: 8rpx 20rpx;
  }
}
</style>
