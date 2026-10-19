// 文件路径：cloudfunctions/exerciseService/index.js
// 云函数：exerciseService 运动库服务
// 入参 action：
//   list    运动库列表（按用户体重换算每分钟消耗）
//   detail  单个运动详情，需 exerciseId
//   random  随机返回一项运动 + 建议时长与消耗
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 用户未录入体重时的默认参考体重（kg）
const DEFAULT_WEIGHT = 60
// 默认建议运动时长（分钟）
const DEFAULT_MINUTES = 30

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
    met,
    benefits: ex.benefits || '',
    desc: ex.desc || '',
    tip: ex.tip || '',
    weight,
    kcalPerMin: kpm,
    kcalPer30min: kpm * DEFAULT_MINUTES
  }
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
    const ex = exercises[Math.floor(Math.random() * exercises.length)]
    const data = shape(ex, weight)
    data.suggestMinutes = DEFAULT_MINUTES
    data.suggestBurn = data.kcalPerMin * DEFAULT_MINUTES
    return { code: 'OK', data }
  }

  return { code: 'INVALID_PARAM', message: 'action 仅支持 list / detail / random' }
}
