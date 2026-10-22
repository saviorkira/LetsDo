// 文件路径：cloudfunctions/avatarService/index.js
// 云函数：avatarService 健康形象（虚拟人物 + 装扮商店）
// 入参 action：
//   getAvatar  形象数据（性别 / BMI / 体格标签 / 胖瘦系数）+ 商店列表（含已购/已装备）+ 积分
//   buyItem    购买装扮（扣积分，永久有效）   参数：itemId
//   equipItem  装备 / 再点一次卸下装扮       参数：itemId
// 说明：胖瘦仅由「我的」页填写的身体数据（BMI）决定
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 可自由布置（拖动/缩放）的槽位：家具与宠物
const ARRANGE_SLOTS = ['furniture', 'pet']

// 装扮商店清单（静态数据，价格单位：积分）
// 槽位说明：top/hat/acc/pants/gloves 为身体部位（单件），pet/furniture/bg 可多件
const SHOP_ITEMS = [
  // 上衣
  { id: 'top_red', slot: 'top', name: '活力红T恤', price: 5, tip: '热情洋溢，元气满满' },
  { id: 'top_blue', slot: 'top', name: '清爽蓝背带', price: 8, tip: '减龄神器，清爽一夏' },
  { id: 'top_stripe', slot: 'top', name: '海魂条纹衫', price: 10, tip: '经典蓝白条纹' },
  { id: 'top_star', slot: 'top', name: '星星卫衣', price: 12, tip: '胸前有颗小星星' },
  { id: 'top_green', slot: 'top', name: '抹茶绿T恤', price: 6, tip: '清新自然，温柔治愈' },
  { id: 'top_rainbow', slot: 'top', name: '彩虹卫衣', price: 18, tip: '把彩虹穿在身上' },
  { id: 'top_hoodie', slot: 'top', name: '连帽卫衣', price: 14, tip: '慵懒又保暖' },
  { id: 'top_suit', slot: 'top', name: '小西装', price: 20, tip: '今天也是精致的打工人' },
  // 帽子
  { id: 'hat_band', slot: 'hat', name: '运动发带', price: 4, tip: '运动少年感满满' },
  { id: 'hat_straw', slot: 'hat', name: '小草帽', price: 6, tip: '遮阳又可爱' },
  { id: 'hat_crown', slot: 'hat', name: '小皇冠', price: 15, tip: '今天的你最闪耀' },
  { id: 'hat_cap', slot: 'hat', name: '鸭舌帽', price: 5, tip: '街头酷盖风' },
  { id: 'hat_beanie', slot: 'hat', name: '毛线帽', price: 6, tip: '软乎乎的温暖' },
  { id: 'hat_beret', slot: 'hat', name: '贝雷帽', price: 8, tip: '文艺小清新' },
  // 裤子（新槽位）
  { id: 'pants_jeans', slot: 'pants', name: '牛仔裤', price: 10, tip: '百搭经典款' },
  { id: 'pants_shorts', slot: 'pants', name: '小短裤', price: 8, tip: '清凉一夏' },
  { id: 'pants_skirt', slot: 'pants', name: '小裙子', price: 12, tip: '转个圈圈真好看' },
  // 手套（新槽位）
  { id: 'gloves_wool', slot: 'gloves', name: '毛线手套', price: 5, tip: '冬天不再冻手' },
  { id: 'gloves_leather', slot: 'gloves', name: '皮手套', price: 8, tip: '帅气又防风' },
  // 配饰
  { id: 'acc_balloon', slot: 'acc', name: '红气球', price: 7, tip: '拿着它心情会变好' },
  { id: 'acc_flower', slot: 'acc', name: '小黄花', price: 6, tip: '别在耳边，元气满满' },
  { id: 'acc_glasses', slot: 'acc', name: '圆眼镜', price: 9, tip: '书卷气十足' },
  { id: 'acc_watch', slot: 'acc', name: '小手表', price: 11, tip: '时间管理大师' },
  // 宠物（比人物小很多）
  { id: 'pet_cat', slot: 'pet', name: '小橘猫', price: 20, tip: '软萌可爱，陪伴你每一天' },
  { id: 'pet_dog', slot: 'pet', name: '小柴犬', price: 25, tip: '忠诚活泼，摇尾巴迎接你' },
  { id: 'pet_rabbit', slot: 'pet', name: '小白兔', price: 18, tip: '蹦蹦跳跳，温柔治愈' },
  { id: 'pet_chick', slot: 'pet', name: '小黄鸡', price: 15, tip: '叽叽喳喳，充满活力' },
  { id: 'pet_hamster', slot: 'pet', name: '小仓鼠', price: 22, tip: '鼓鼓的腮帮子' },
  { id: 'pet_panda', slot: 'pet', name: '小熊猫', price: 35, tip: '国宝级的陪伴' },
  { id: 'pet_fox', slot: 'pet', name: '小狐狸', price: 30, tip: '机灵又狡黠' },
  { id: 'pet_penguin', slot: 'pet', name: '小企鹅', price: 28, tip: '摇摇摆摆真可爱' },
  // 家具
  { id: 'fur_sofa', slot: 'furniture', name: '小沙发', price: 12, tip: '窝在沙发里真舒服' },
  { id: 'fur_bed', slot: 'furniture', name: '小木床', price: 16, tip: '做个好梦' },
  { id: 'fur_lamp', slot: 'furniture', name: '落地灯', price: 10, tip: '温暖的光' },
  { id: 'fur_rug', slot: 'furniture', name: '小地毯', price: 8, tip: '软绵绵的脚感' },
  { id: 'fur_plant', slot: 'furniture', name: '绿植盆栽', price: 6, tip: '给房间添点生机' },
  { id: 'fur_table', slot: 'furniture', name: '小木桌', price: 9, tip: '可以放一杯热茶' },
  { id: 'fur_tv', slot: 'furniture', name: '小电视', price: 14, tip: '追剧时光最惬意' },
  { id: 'fur_window', slot: 'furniture', name: '小窗户', price: 15, tip: '看看外面的风景' },
  { id: 'fur_clock', slot: 'furniture', name: '挂钟', price: 8, tip: '滴答滴答，时光流转' },
  { id: 'fur_bookshelf', slot: 'furniture', name: '书架', price: 18, tip: '书中自有黄金屋' },
  // 墙面装饰（同样归入家具槽位，可自由拖动摆放）
  { id: 'fur_wallstar', slot: 'furniture', name: '星空顶', price: 36, tip: '躺着看星星入睡' },
  { id: 'fur_painting', slot: 'furniture', name: '风景挂画', price: 16, tip: '给白墙添点颜色' },
  { id: 'fur_photo', slot: 'furniture', name: '照片墙', price: 14, tip: '记录每天的小确幸' },
  { id: 'fur_cloud', slot: 'furniture', name: '云朵灯', price: 24, tip: '一朵会发光的云' },
  { id: 'fur_windbell', slot: 'furniture', name: '小风铃', price: 12, tip: '风一吹就叮当作响' },
  { id: 'fur_tapestry', slot: 'furniture', name: '编织挂毯', price: 20, tip: '手作的温柔质感' },
  // 背景
  { id: 'bg_forest', slot: 'bg', name: '森林小屋', price: 10, tip: '被大自然包围' },
  { id: 'bg_beach', slot: 'bg', name: '海边小屋', price: 12, tip: '听海浪的声音' },
  { id: 'bg_starry', slot: 'bg', name: '星空小屋', price: 15, tip: '数星星入睡' },
  { id: 'bg_sunset', slot: 'bg', name: '黄昏小屋', price: 14, tip: '落日余晖最温柔' },
  { id: 'bg_sakura', slot: 'bg', name: '樱花小屋', price: 16, tip: '樱花飘落的季节' },
  { id: 'bg_rainy', slot: 'bg', name: '雨天小屋', price: 12, tip: '听雨声入眠' },
  { id: 'bg_snow', slot: 'bg', name: '雪景小屋', price: 14, tip: '银装素裹的世界' }
]

// 东八区当日日期 YYYY-MM-DD
function todayStr() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

// 查询或创建用户档案
async function ensureProfile(openid) {
  const res = await db.collection('user_profile').where({ openid }).limit(1).get()
  if (res.data.length) return res.data[0]
  const addRes = await db.collection('user_profile').add({
    data: { openid, nickName: '', avatarUrl: '', totalPoint: 0, rankHidden: false, healthLog: [], ownedItems: [], avatarEquip: {} }
  })
  return { _id: addRes._id, openid, totalPoint: 0, healthLog: [], ownedItems: [], avatarEquip: {} }
}

// 基础代谢 BMR（Mifflin-St Jeor 公式）
function calcBMR({ weight, height, age, gender }) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

// 形象胖瘦计算：仅由 BMI 分档决定
function calcFigure(profile) {
  const h = Number(profile.height) || 0
  const w = Number(profile.weight) || 0
  const age = Number(profile.age) || 0
  const gender = profile.gender === 'female' ? 'female' : 'male'
  const hasProfile = h > 0 && w > 0 && age > 0 && !!profile.gender
  const bmi = hasProfile ? Math.round((w / Math.pow(h / 100, 2)) * 10) / 10 : 0

  // 基础分：按 BMI 分档
  let base = 0
  if (hasProfile) {
    if (bmi < 18.5) base = -1
    else if (bmi < 24) base = 0
    else if (bmi < 28) base = 1
    else base = 2
  }

  const bmr = hasProfile ? calcBMR({ weight: w, height: h, age, gender }) : 0
  const score = Math.max(-2, Math.min(3, base))
  // 胖瘦系数：0.8 ~ 1.35，用于人物横向缩放
  const fat = Math.round(Math.max(0.8, Math.min(1.35, 1 + score * 0.12)) * 100) / 100
  return { hasProfile, gender, bmi, bmr, score: Math.round(score * 100) / 100, fat, height: h, weight: w }
}

// 体格标签（可爱中性，避免身材焦虑用词）
function figureLabel(gender, score) {
  const male = gender !== 'female'
  if (score <= -1.2) return '小豆芽'
  if (score < -0.3) return male ? '薄肌少年' : '纤细少女'
  if (score < 0.6) return male ? '标准靓仔' : '元气少女'
  if (score < 1.5) return male ? '壮实型男' : '微胖小可爱'
  return '圆滚滚'
}

// 心情提示语：按今日热量收支，每类多条随机，提升对话新鲜感
function moodText(profile, bmr, hasProfile) {
  if (!hasProfile) return pick([
    '先去「我的」录入身体数据，我才能长出来哦',
    '给我一组身高体重，我就能从蛋里孵出来啦',
    '数据还没填，暂时只能以蛋的形态和你见面 >_<'
  ])
  const date = todayStr()
  const logs = Array.isArray(profile.healthLog) ? profile.healthLog : []
  const log = logs.find(l => l && l.date === date)

  // 今日完全没记录热量
  if (!log || !(Number(log.intake) > 0)) {
    return pick([
      '今天还没记录热量哦，记得去「我的」填一下呀',
      '打卡记录一下今天吃了什么，我会更了解你的',
      '早餐吃了吗？去「我的」录入下热量吧～',
      '今天也要好好吃饭呀，别忘了记录热量哦',
      '我还不知道你今天吃了啥，来「我的」告诉我吧'
    ])
  }

  const bal = Number(log.intake) - bmr - (Number(log.expenditure) || 0)
  // 吃得偏多 → 建议运动
  if (bal > 300) return pick([
    '今天吃得有点多，带我去动一动吧',
    '热量盈余啦，跑两步或者做点轻运动？',
    '吃多了也没事，接下来的运动帮你抵掉',
    '肚子饱饱的，身体却有点重，带我出门逛逛',
    '摄入超了一点点，适合做 20 分钟轻运动'
  ])
  // 消耗偏大 → 提醒补充
  if (bal < -300) return pick([
    '今天消耗不少，记得补充能量呀',
    '赤字有点大，要不要吃点好的犒劳自己',
    '消耗超多！快吃点东西把能量补回来',
    '今天运动量够了，现在轮到你被食物治愈',
    '热量缺口有点大，别让自己饿坏啦'
  ])
  // 收支平衡
  return pick([
    '今天收支平衡，棒棒哒',
    '吃得刚刚好，身体状态很稳',
    '热量收支健康，继续保持呀',
    '这餐吃得很克制，为你点赞',
    '今天表现满分，明天继续加油'
  ])
}

// 随机取数组中一条，避免每次打开形象页都看到同一句话
function pick(arr) {
  if (!Array.isArray(arr) || !arr.length) return ''
  return arr[Math.floor(Math.random() * arr.length)]
}

// 计算人物属性（5 维）
function calcAttr(profile) {
  const h = Number(profile.height) || 0
  const w = Number(profile.weight) || 0
  const age = Number(profile.age) || 0
  const gender = profile.gender === 'female' ? 'female' : 'male'
  const hasProfile = h > 0 && w > 0 && age > 0 && !!profile.gender

  // 基础值 10，按 BMI 修正
  let power = 10, agility = 10, intelligence = 10, charm = 10, stamina = 10
  if (hasProfile) {
    const bmi = w / Math.pow(h / 100, 2)
    if (bmi < 18.5) { power -= 2; stamina -= 1; agility += 1 }
    else if (bmi < 24) { /* 标准 */ }
    else if (bmi < 28) { power += 1; stamina += 2; agility -= 1 }
    else { power += 2; stamina += 3; agility -= 2 }
  }

  // 装备加成（稀有装备加属性）
  const equipped = profile.avatarEquip || {}
  const allEquipped = []
  for (const k of ['top', 'hat', 'acc', 'pants', 'gloves']) {
    const v = equipped[k]
    if (Array.isArray(v)) allEquipped.push(...v)
    else if (v) allEquipped.push(v)
  }
  for (const id of allEquipped) {
    const item = ALL_ITEMS.find(s => s.id === id)
    if (item && item.attr) {
      if (item.attr.power) power += item.attr.power
      if (item.attr.agility) agility += item.attr.agility
      if (item.attr.intelligence) intelligence += item.attr.intelligence
      if (item.attr.charm) charm += item.attr.charm
      if (item.attr.stamina) stamina += item.attr.stamina
    }
  }

  // 出门活动加成（存储在 profile.attrBonus 中）
  const bonus = profile.attrBonus || {}
  power += bonus.power || 0
  agility += bonus.agility || 0
  intelligence += bonus.intelligence || 0
  charm += bonus.charm || 0
  stamina += bonus.stamina || 0

  return { power, agility, intelligence, charm, stamina }
}

// 出门地点配置
const OUT_PLACES = [
  { id: 'gym', name: '健身房', icon: '💪', cost: 10, duration: 30, attr: { power: 2, stamina: 1 }, desc: '撸铁流汗，力量大涨' },
  { id: 'library', name: '图书馆', icon: '📚', cost: 8, duration: 20, attr: { intelligence: 2 }, desc: '静心阅读，智力提升' },
  { id: 'park', name: '公园', icon: '🌳', cost: 5, duration: 15, attr: { agility: 1, charm: 1 }, desc: '散步呼吸新鲜空气' },
  { id: 'cafe', name: '咖啡馆', icon: '☕', cost: 6, duration: 10, attr: { charm: 2 }, desc: '悠闲下午茶时光' },
  { id: 'pool', name: '游泳馆', icon: '🏊', cost: 12, duration: 25, attr: { stamina: 2, agility: 1 }, desc: '全身运动，体力充沛' }
]

// Boss 配置：七大罪，傲慢最强（需要总评最高）
const BOSSES = [
  { id: 'boss_pride', name: '傲慢', icon: '👑', need: { power: 25, agility: 20, intelligence: 20, charm: 22, stamina: 25 }, reward: { type: 'hat', id: 'rare_crown' }, desc: '七大罪之首，最强Boss' },
  { id: 'boss_wrath', name: '暴怒', icon: '😡', need: { power: 20, agility: 15 }, reward: { type: 'gloves', id: 'rare_gauntlet' }, desc: '怒火燃烧一切' },
  { id: 'boss_lust', name: '色欲', icon: '😈', need: { charm: 20, agility: 16 }, reward: { type: 'acc', id: 'rare_rose' }, desc: '魅惑众生的幻影' },
  { id: 'boss_greed', name: '贪婪', icon: '🤑', need: { intelligence: 18, charm: 15 }, reward: { type: 'acc', id: 'rare_goldbag' }, desc: '永远填不满的欲望' },
  { id: 'boss_envy', name: '嫉妒', icon: '🐍', need: { intelligence: 16, charm: 16 }, reward: { type: 'furniture', id: 'rare_mirror' }, desc: '映出他人拥有的一切' },
  { id: 'boss_gluttony', name: '暴食', icon: '🍔', need: { power: 15, intelligence: 12 }, reward: { type: 'pet', id: 'rare_dragon' }, desc: '吞噬无尽的美食' },
  { id: 'boss_sloth', name: '懒惰', icon: '😴', need: { power: 12, stamina: 12 }, reward: { type: 'acc', id: 'rare_sword' }, desc: '沉睡千年的懒人' }
]

// Boss 专属稀有物品（挑战成功必掉，商店买不到）
const RARE_ITEMS = [
  { id: 'rare_crown', slot: 'hat', name: '王者之冠', price: 0, tip: '傲慢魔王的王冠，全属性提升', attr: { power: 3, agility: 3, intelligence: 3, charm: 3, stamina: 3 }, rare: true },
  { id: 'rare_gauntlet', slot: 'gloves', name: '暴怒拳套', price: 0, tip: '燃烧着怒火的拳套', attr: { power: 4 }, rare: true },
  { id: 'rare_rose', slot: 'acc', name: '魅影玫瑰', price: 0, tip: '永不凋谢的魅惑之花', attr: { charm: 5 }, rare: true },
  { id: 'rare_goldbag', slot: 'acc', name: '黄金钱袋', price: 0, tip: '贪婪魔王的珍藏', attr: { charm: 4 }, rare: true },
  { id: 'rare_mirror', slot: 'furniture', name: '翡翠魔镜', price: 0, tip: '嫉妒魔王的魔镜', attr: { charm: 3, intelligence: 2 }, rare: true },
  { id: 'rare_dragon', slot: 'pet', name: '小青龙', price: 0, tip: '传说中的神兽', attr: { power: 2, agility: 2 }, rare: true },
  { id: 'rare_sword', slot: 'acc', name: '勇者之剑', price: 0, tip: '击败懒惰魔王的证明', attr: { power: 3 }, rare: true }
]

// 出门随机掉落物品（魅力越高掉率越大，商店买不到）
const DROP_ITEMS = [
  { id: 'rare_castle', slot: 'furniture', name: '迷你城堡', price: 0, tip: '传说中的微型城堡', attr: { stamina: 3 }, rare: true },
  { id: 'drop_clover', slot: 'acc', name: '四叶草', price: 0, tip: '幸运的象征', attr: { charm: 2 }, rare: true },
  { id: 'drop_feather', slot: 'acc', name: '轻羽', price: 0, tip: '风留下的礼物', attr: { agility: 2 }, rare: true },
  { id: 'drop_fang', slot: 'acc', name: '狼牙', price: 0, tip: '野性的力量', attr: { power: 2 }, rare: true },
  { id: 'drop_scroll', slot: 'furniture', name: '智者卷轴', price: 0, tip: '写满智慧的古卷', attr: { intelligence: 2 }, rare: true },
  { id: 'drop_shell', slot: 'furniture', name: '海之声', price: 0, tip: '能听到大海的声音', attr: { stamina: 2 }, rare: true }
]

// 全部可装备物品（商店 + Boss 稀有 + 出门掉落）
const ALL_ITEMS = SHOP_ITEMS.concat(RARE_ITEMS, DROP_ITEMS)

// 判断某槽位是否装备了某件物品（兼容单件 string、多件 array，以及家具的 {id,...} 对象格式）
function isEquippedSlot(equipped, slot, id) {
  const v = equipped[slot]
  if (Array.isArray(v)) return v.some(e => (e && typeof e === 'object' ? e.id : e) === id)
  return v === id
}

// 商店列表：标注已购 / 已装备；稀有与掉落物品并入（仅用于装备面板展示，商店会过滤）
function shapeShop(profile) {
  const owned = Array.isArray(profile.ownedItems) ? profile.ownedItems : []
  const equipped = profile.avatarEquip || {}
  return ALL_ITEMS.map(s => ({ ...s, owned: owned.includes(s.id), equipped: isEquippedSlot(equipped, s.slot, s.id) }))
}

async function handle(event) {
  const { OPENID } = cloud.getWXContext()
  const { action } = event || {}

  if (!OPENID) return { code: 'INVALID_PARAM', message: '无法获取用户身份' }

  const profile = await ensureProfile(OPENID)

  // ---- 形象页初始化 ----
  if (action === 'getAvatar') {
    const fig = calcFigure(profile)
    const attr = calcAttr(profile)
    return {
      code: 'OK',
      data: {
        ...fig,
        attr,
        label: figureLabel(fig.gender, fig.score),
        mood: moodText(profile, fig.bmr, fig.hasProfile),
        totalPoint: profile.totalPoint || 0,
        equipped: profile.avatarEquip || {},
        shop: shapeShop(profile),
        outStatus: profile.outStatus || null, // 出门状态 { placeId, endTime }
        rareItems: RARE_ITEMS
      }
    }
  }

  // ---- 获取属性详情 ----
  if (action === 'getAttr') {
    const attr = calcAttr(profile)
    return { code: 'OK', data: { attr } }
  }

  // ---- 出门 ----
  if (action === 'goOut') {
    const place = OUT_PLACES.find(p => p.id === event.placeId)
    if (!place) return { code: 'INVALID_PARAM', message: '地点不存在' }
    const point = profile.totalPoint || 0
    if (point < place.cost) return { code: 'NO_POINT', message: `积分不足，需要 ${place.cost} 积分` }

    // 检查是否已在出门中
    if (profile.outStatus && profile.outStatus.endTime > Date.now()) {
      return { code: 'ALREADY_OUT', message: '正在外出中，请等待返回' }
    }

    const endTime = Date.now() + place.duration * 60 * 1000
    await db.collection('user_profile').doc(profile._id).update({
      data: {
        totalPoint: _.inc(-place.cost),
        outStatus: { placeId: place.id, endTime }
      }
    })
    return { code: 'OK', data: { place, endTime } }
  }

  // ---- 检查出门是否结束（结算属性收益 + 按魅力概率掉落物品） ----
  if (action === 'checkOut') {
    const outStatus = profile.outStatus
    if (!outStatus || outStatus.endTime > Date.now()) {
      return { code: 'OUTING', data: { outStatus } }
    }

    const place = OUT_PLACES.find(p => p.id === outStatus.placeId)
    if (!place) {
      // 注意：清空必须用 _.remove() 删字段，写 null 会让后续 goOut 的点路径展开在 null 上报 -502001
      await db.collection('user_profile').doc(profile._id).update({ data: { outStatus: _.remove() } })
      return { code: 'DONE', data: { place: null } }
    }

    // 属性收益
    const bonus = profile.attrBonus || {}
    for (const k in place.attr) {
      bonus[k] = (bonus[k] || 0) + place.attr[k]
    }

    // 掉落判定：基础 15% + 魅力 * 1%，上限 50%
    const newAttr = calcAttr({ ...profile, attrBonus: bonus })
    const owned = Array.isArray(profile.ownedItems) ? profile.ownedItems.slice() : []
    const chance = Math.min(0.5, 0.15 + (newAttr.charm || 0) * 0.01)
    let drop = null
    const pool = DROP_ITEMS.filter(d => !owned.includes(d.id))
    if (pool.length && Math.random() < chance) {
      drop = pool[Math.floor(Math.random() * pool.length)]
      owned.push(drop.id)
    }

    await db.collection('user_profile').doc(profile._id).update({
      data: { attrBonus: bonus, outStatus: _.remove(), ownedItems: owned }
    })
    return { code: 'DONE', data: { place, drop, attr: newAttr } }
  }

  // ---- 提前退出出门（放弃本次属性加成与掉落） ----
  if (action === 'quitOut') {
    if (!profile.outStatus) return { code: 'OK' }
    await db.collection('user_profile').doc(profile._id).update({ data: { outStatus: _.remove() } })
    return { code: 'OK' }
  }

  // ---- 挑战 Boss ----
  if (action === 'challengeBoss') {
    const boss = BOSSES.find(b => b.id === event.bossId)
    if (!boss) return { code: 'INVALID_PARAM', message: 'Boss 不存在' }

    const attr = calcAttr(profile)
    for (const k in boss.need) {
      if ((attr[k] || 0) < boss.need[k]) {
        return { code: 'ATTR_NOT_ENOUGH', message: `属性不足，需要${boss.desc}`, data: { boss, attr } }
      }
    }

    // 挑战成功，发放稀有物品
    const rareItem = RARE_ITEMS.find(r => r.id === boss.reward.id)
    if (!rareItem) return { code: 'INVALID_PARAM', message: '奖励不存在' }

    const owned = Array.isArray(profile.ownedItems) ? profile.ownedItems.slice() : []
    if (owned.includes(rareItem.id)) {
      return { code: 'ALREADY_OWNED', message: '已经拥有该稀有物品啦' }
    }
    owned.push(rareItem.id)

    await db.collection('user_profile').doc(profile._id).update({
      data: { ownedItems: owned }
    })
    return { code: 'OK', data: { boss, rareItem, attr } }
  }

  // ---- 购买装扮 ----
  if (action === 'buyItem') {
    const item = SHOP_ITEMS.find(s => s.id === event.itemId)
    if (!item) return { code: 'INVALID_PARAM', message: '商品不存在（稀有物品只能挑战 Boss 获得）' }
    const owned = Array.isArray(profile.ownedItems) ? profile.ownedItems.slice() : []
    if (owned.includes(item.id)) return { code: 'ALREADY', message: '已经拥有这件装扮啦' }
    const point = profile.totalPoint || 0
    if (point < item.price) return { code: 'NO_POINT', message: '积分不足，去打卡或记录热量赚积分吧' }
    owned.push(item.id)
    await db.collection('user_profile').doc(profile._id).update({
      data: { totalPoint: _.inc(-item.price), ownedItems: owned }
    })
    return { code: 'OK', data: { totalPoint: point - item.price, itemId: item.id } }
  }

  // ---- 装备 / 卸下装扮 ----
  // 身体部位（top/hat/acc）：同部位只能装备 1 件，再点已装备的卸下
  // 宠物/家具/背景：可同时装备多件
  if (action === 'equipItem') {
    const item = ALL_ITEMS.find(s => s.id === event.itemId)
    if (!item) return { code: 'INVALID_PARAM', message: '商品不存在' }
    const owned = Array.isArray(profile.ownedItems) ? profile.ownedItems : []
    if (!owned.includes(item.id)) return { code: 'NOT_OWNED', message: '还未拥有这件装扮' }
    const equipped = Object.assign({}, profile.avatarEquip || {})

    if (['top', 'hat', 'acc', 'pants', 'gloves'].includes(item.slot)) {
      // 身体部位：单件，替换或卸下（兼容旧版数组格式数据）
      const cur = equipped[item.slot]
      const isOn = Array.isArray(cur) ? cur.includes(item.id) : cur === item.id
      if (isOn) {
        delete equipped[item.slot]
      } else {
        equipped[item.slot] = item.id
      }
    } else {
      // 宠物/家具/背景：多件数组（家具与宠物元素为 {id,x,y,scale} 布置对象，其余为 id 字符串）
      const cur = equipped[item.slot]
      const arr = Array.isArray(cur) ? cur.slice() : (cur ? [cur] : [])
      const idx = arr.findIndex(e => (e && typeof e === 'object' ? e.id : e) === item.id)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(ARRANGE_SLOTS.includes(item.slot) ? { id: item.id } : item.id)
      equipped[item.slot] = arr
    }

    await db.collection('user_profile').doc(profile._id).update({ data: { avatarEquip: equipped } })
    return { code: 'OK', data: { equipped } }
  }

  // ---- 布置：保存某件已装备的家具/宠物的位置与大小（百分比坐标，scale 0.6~3.5）----
  if (action === 'furnishItem') {
    const { itemId, x, y, scale } = event
    const slot = ARRANGE_SLOTS.includes(event.slot) ? event.slot : 'furniture'
    const equipped = Object.assign({}, profile.avatarEquip || {})
    const arr = Array.isArray(equipped[slot]) ? equipped[slot].slice() : []
    const idx = arr.findIndex(e => (e && typeof e === 'object' ? e.id : e) === itemId)
    if (idx < 0) return { code: 'NOT_EQUIPPED', message: '该物品还未装备' }
    const cl = n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))
    const cs = n => Math.max(0.6, Math.min(3.5, Math.round((Number(n) || 1) * 10) / 10))
    arr[idx] = { id: itemId, x: cl(x), y: cl(y), scale: cs(scale) }
    equipped[slot] = arr
    await db.collection('user_profile').doc(profile._id).update({ data: { avatarEquip: equipped } })
    return { code: 'OK', data: { [slot]: arr } }
  }

  return { code: 'INVALID_PARAM', message: 'action 仅支持 getAvatar / getAttr / goOut / checkOut / quitOut / challengeBoss / buyItem / equipItem / furnishItem' }
}

// 顶层兜底：任何未捕获异常都转成可读的返回值，避免前端只收到「网络错误」
exports.main = async (event) => {
  try {
    return await handle(event)
  } catch (e) {
    return {
      code: 'SYS_ERROR',
      message: String((e && e.message) || e),
      stack: String((e && e.stack) || '').slice(0, 500)
    }
  }
}
