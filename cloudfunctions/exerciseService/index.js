// 文件路径：cloudfunctions/exerciseService/index.js
// 云函数：exerciseService 运动库服务
// 入参 action：
//   list    运动库列表（按用户体重换算每分钟消耗）
//   detail  单个运动详情，需 exerciseId
//   random  随机返回 2~3 项运动 + 每项建议时长与消耗 + 合计消耗
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 用户未录入体重时的默认参考体重（kg）
const DEFAULT_WEIGHT = 60

// 读取集合全部数据（分批兜底）
async function getAll(collection) {
  const MAX = 100
  const countRes = await db.collection(collection).count()
  const tasks = []
  for (let i = 0; i < countRes.total; i += MAX) {
    tasks.push(db.collection(collection).skip(i).limit(MAX).get())
  }
  const results = await Promise.all(tasks)
  return results.reduce((acc, cur) => acc.concat(cur.data), [])
}

// 读取当前用户体重，未录入则用默认参考体重
async function getUserWeight(openid) {
  if (!openid) return DEFAULT_WEIGHT
  try {
    const res = await db.collection('user_profile').where({ openid }).limit(1).get()
    const w = res.data[0] && Number(res.data[0].weight)
    return w > 0 ? w : DEFAULT_WEIGHT
  } catch (e) {
    return DEFAULT_WEIGHT
  }
}

// MET 换算每分钟消耗热量：MET × 3.5 × 体重(kg) ÷ 200
function kcalPerMinute(met, weight) {
  const m = Number(met) || 0
  return m * 3.5 * weight / 200
}

// 统一输出结构
function shape(ex, weight) {
  const met = Number(ex.met) || 0
  const kpm = kcalPerMinute(met, weight)
  return {
    _id: ex._id,
    name: ex.name,
    category: ex.category || '有氧',
    icon: ex.icon || '🏃',
    imageUrl: ex.imageUrl || '',
    met,
    benefits: ex.benefits || '',
    desc: ex.desc || '',
    tip: ex.tip || '',
    weight,
    kcalPerMin: kpm,
    kcalPer30min: kpm * 30
  }
}

// 按 MET 强度给一项运动挑选合适的建议时长：强度越高时长越短
// 强度分档（按 MET）：低 <4.5；中 4.5~7.5；高 >7.5
function metBand(met) {
  const m = Number(met) || 0
  if (m < 4.5) return 'low'
  if (m <= 7.5) return 'mid'
  return 'high'
}

// 分钟取 5 的倍数，且不少于 5
function round5(n) {
  return Math.max(5, Math.round((Number(n) || 0) / 5) * 5)
}

// 按时长模式：把 targetMinutes 按 1/MET 权重分给各项（强度越高时间越短），
// 差额以 5 分钟为步长在各项间微调，保证总和恰好等于目标
function allocateMinutes(items, targetMinutes) {
  const weights = items.map(x => 1 / Math.max(x.met, 1))
  const wSum = weights.reduce((a, b) => a + b, 0)
  const mins = items.map((x, i) => Math.min(round5(targetMinutes * weights[i] / wSum), 120))
  let diff = targetMinutes - mins.reduce((a, b) => a + b, 0)
  let guard = 0
  while (diff !== 0 && guard++ < 72) {
    for (let i = 0; i < mins.length && diff !== 0; i++) {
      if (diff > 0 && mins[i] < 120) { mins[i] += 5; diff -= 5 }
      else if (diff < 0 && mins[i] > 5) { mins[i] -= 5; diff += 5 }
    }
  }
  return mins
}

// 按热量模式：初始按 1/MET 权重给各项分配「热量份额」换算时长，再整体缩放迭代逼近目标消耗
function allocateBurnMinutes(items, targetBurn) {
  const weights = items.map(x => 1 / Math.max(x.met, 1))
  const wSum = weights.reduce((a, b) => a + b, 0)
  let mins = items.map((x, i) =>
    Math.min(round5((targetBurn * weights[i] / wSum) / Math.max(x.kcalPerMin, 0.1)), 120)
  )
  for (let it = 0; it < 4; it++) {
    const total = items.reduce((s, x, i) => s + x.kcalPerMin * mins[i], 0)
    if (total <= 0) break
    const scale = targetBurn / total
    if (Math.abs(scale - 1) < 0.05) break
    mins = items.map((x, i) => Math.min(round5(mins[i] * scale), 120))
  }
  return mins
}

exports.main = async (event) => {
  const { action, exerciseId } = event || {}
  const { OPENID } = cloud.getWXContext()

  if (action === 'list') {
    const { category, page = 1, pageSize = 10 } = event || {}
    const weight = await getUserWeight(OPENID)
    let exercises = await getAll('exercise')
    if (category && category !== '全部') exercises = exercises.filter(e => e.category === category)
    const total = exercises.length
    const p = Math.max(1, Number(page) || 1)
    const ps = Math.max(1, Math.min(50, Number(pageSize) || 10))
    const start = (p - 1) * ps
    const pageList = exercises.slice(start, start + ps).map(ex => shape(ex, weight))
    return { code: 'OK', data: { list: pageList, total, hasMore: start + ps < total, weight } }
  }

  if (action === 'detail') {
    if (!exerciseId || typeof exerciseId !== 'string' || exerciseId.length > 64) {
      return { code: 'INVALID_PARAM', message: 'exerciseId 非法' }
    }
    const res = await db.collection('exercise').doc(exerciseId).get().catch(() => null)
    if (!res || !res.data) return { code: 'NOT_FOUND', message: '运动不存在' }
    const weight = await getUserWeight(OPENID)
    return { code: 'OK', data: shape(res.data, weight) }
  }

  if (action === 'random') {
    const weight = await getUserWeight(OPENID)
    const exercises = await getAll('exercise')
    if (!exercises.length) return { code: 'NO_DATA', message: '运动库暂无数据' }

    // 计划模式：duration=按时长 / calorie=按热量；intensity=强度过滤（any/low/mid/high）
    const {
      planMode = 'duration',
      targetMinutes = 30,
      minBurn = 150,
      maxBurn = 300,
      intensity = 'any'
    } = event || {}

    // 强度过滤：命中分档的池子不足 2 项时放宽为全部
    let pool = exercises
    if (intensity && intensity !== 'any') {
      const filtered = exercises.filter(e => metBand(Number(e.met) || 0) === intensity)
      if (filtered.length >= 2) pool = filtered
    }

    // 随机 2~3 项不重复运动
    const count = Math.min(pool.length, 2 + Math.floor(Math.random() * 2))
    const shuffled = pool.slice().sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, count).map(ex => shape(ex, weight))

    // 按模式分配每项建议时长
    let minutes
    if (planMode === 'calorie') {
      const lo = Math.max(50, Number(minBurn) || 150)
      const hi = Math.max(lo, Number(maxBurn) || lo)
      minutes = allocateBurnMinutes(picked, (lo + hi) / 2)
    } else {
      const t = Math.min(Math.max(Number(targetMinutes) || 30, 10), 120)
      minutes = allocateMinutes(picked, t)
    }

    const list = picked.map((x, i) => ({ ...x, suggestMinutes: minutes[i], suggestBurn: x.kcalPerMin * minutes[i] }))
    const totalBurn = list.reduce((s, x) => s + x.suggestBurn, 0)
    const totalMinutes = list.reduce((s, x) => s + x.suggestMinutes, 0)
    return { code: 'OK', data: { list, totalBurn, totalMinutes, weight } }
  }

  return { code: 'INVALID_PARAM', message: 'action 仅支持 list / detail / random' }
}
