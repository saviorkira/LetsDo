// 文件路径：cloudfunctions/healthService/index.js
// 云函数：healthService 热量管理与运动推荐
// 入参 action：
//   getHealth         身体数据 + 基础代谢 + 今日摄入/消耗 + 差额 + 运动推荐
//   saveProfile       保存身高 / 体重 / 年龄 / 性别
//   recordIntake      记录今日摄入热量（当天首次 +1 积分）
//   recordExpenditure 记录今日消耗热量（当天首次 +1 积分）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 东八区当日日期 YYYY-MM-DD
function todayStr() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

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

// 查询或创建用户档案
async function ensureProfile(openid) {
  const res = await db.collection('user_profile').where({ openid }).limit(1).get()
  if (res.data.length) return res.data[0]
  const addRes = await db.collection('user_profile').add({
    data: { openid, nickName: '', avatarUrl: '', totalPoint: 0, rankHidden: false, healthLog: [] }
  })
  return { _id: addRes._id, openid, nickName: '', avatarUrl: '', totalPoint: 0, rankHidden: false, healthLog: [] }
}

// 基础代谢 BMR（Mifflin-St Jeor 公式）
// 男：10×体重 + 6.25×身高 − 5×年龄 + 5
// 女：10×体重 + 6.25×身高 − 5×年龄 − 161
function calcBMR({ weight, height, age, gender }) {
  const base = 10 * weight + 6.25 * height - 5 * age
  return Math.round(gender === 'female' ? base - 161 : base + 5)
}

// MET 换算每分钟消耗热量：MET × 3.5 × 体重(kg) ÷ 200
function kcalPerMinute(met, weight) {
  return (Number(met) || 0) * 3.5 * weight / 200
}

// 取出某天的热量记录
function findLog(profile, date) {
  const logs = Array.isArray(profile.healthLog) ? profile.healthLog : []
  return logs.find(l => l && l.date === date) || null
}

// 写回某天的热量记录（保留最近 90 天）
async function writeLog(profile, date, patch) {
  const logs = Array.isArray(profile.healthLog) ? profile.healthLog.slice() : []
  const idx = logs.findIndex(l => l && l.date === date)
  const next = Object.assign({ date, intake: 0, expenditure: 0, intakeCounted: false, expenditureCounted: false }, idx >= 0 ? logs[idx] : {}, patch)
  if (idx >= 0) logs[idx] = next
  else logs.push(next)
  logs.sort((a, b) => (a.date < b.date ? 1 : -1))
  await db.collection('user_profile').doc(profile._id).update({ data: { healthLog: logs.slice(0, 90) } })
  return next
}

// 运动推荐：按剩余需消耗热量挑选「所需时长最接近 30 分钟」的运动
function buildRecommend({ remaining, intake, weight, exercises }) {
  const list = exercises
    .map(ex => ({ ex, kpm: kcalPerMinute(ex.met, weight) }))
    .filter(x => x.kpm > 0)
  if (!list.length) return null

  // 今日无热量盈余（甚至缺口）：推荐最低强度运动放松
  if (remaining <= 0) {
    const light = list.slice().sort((a, b) => a.kpm - b.kpm)[0]
    const minutes = 15
    return {
      exerciseId: light.ex._id,
      name: light.ex.name,
      icon: light.ex.icon || '🏃',
      category: light.ex.category || '',
      met: Number(light.ex.met) || 0,
      benefits: light.ex.benefits || '',
      kcalPerMin: light.kpm,
      minutes,
      totalBurn: light.kpm * minutes,
      surplus: false
    }
  }

  // 有盈余：所需时长控制在 5~180 分钟，取最接近 30 分钟的一项
  let best = null
  for (const item of list) {
    const minutes = Math.min(180, Math.max(5, Math.ceil(remaining / item.kpm)))
    const score = Math.abs(minutes - 30)
    if (!best || score < best.score) best = { ex: item.ex, kpm: item.kpm, minutes, score }
  }
  return {
    exerciseId: best.ex._id,
    name: best.ex.name,
    icon: best.ex.icon || '🏃',
    category: best.ex.category || '',
    met: Number(best.ex.met) || 0,
    benefits: best.ex.benefits || '',
    kcalPerMin: best.kpm,
    minutes: best.minutes,
    totalBurn: best.kpm * best.minutes,
    surplus: true
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: 'INVALID_PARAM', message: '无法获取用户身份' }
  const { action } = event || {}

  const profile = await ensureProfile(OPENID)
  const date = todayStr()

  // ---- 页面初始化：身体数据 + 基础代谢 + 今日热量 + 推荐 ----
  if (action === 'getHealth') {
    const p = {
      height: Number(profile.height) || 0,
      weight: Number(profile.weight) || 0,
      age: Number(profile.age) || 0,
      gender: profile.gender || ''
    }
    const hasProfile = p.height > 0 && p.weight > 0 && p.age > 0 && !!p.gender
    const bmr = hasProfile ? calcBMR(p) : 0
    // 身体数据每月仅可修改一次
    const monthStr = date.slice(0, 7)
    const profileEditable = !hasProfile || profile.profileEditMonth !== monthStr

    const log = findLog(profile, date) || {}
    const intake = Number(log.intake) || 0
    const expenditure = Number(log.expenditure) || 0
    // 热量盈余 = 摄入 − 今日消耗 − 基础代谢
    const diff = hasProfile ? intake - bmr - expenditure : 0
    const remaining = Math.max(0, diff)

    let recommend = null
    if (hasProfile && intake > 0) {
      const exercises = await getAll('exercise')
      recommend = buildRecommend({ remaining, intake, weight: p.weight, exercises })
    }

    // 累计摄入 / 消耗（所有有记录的天数累加）
    const logs = Array.isArray(profile.healthLog) ? profile.healthLog : []
    let totalIntake = 0
    let totalExpenditure = 0
    for (const l of logs) {
      if (!l) continue
      totalIntake += Number(l.intake) || 0
      totalExpenditure += Number(l.expenditure) || 0
    }

    return {
      code: 'OK',
      data: {
        profile: p,
        hasProfile,
        bmr,
        profileEditable,
        totalPoint: profile.totalPoint || 0,
        totalIntake,
        totalExpenditure,
        today: {
          date,
          intake,
          expenditure,
          intakeRecorded: !!log.intakeCounted,
          expenditureRecorded: !!log.expenditureCounted
        },
        diff,
        remaining,
        recommend
      }
    }
  }

  // ---- 保存身体数据 ----
  if (action === 'saveProfile') {
    const height = Number(event.height)
    const weight = Number(event.weight)
    const age = Number(event.age)
    const gender = event.gender === 'female' ? 'female' : 'male'
    if (!(height >= 90 && height <= 250)) return { code: 'INVALID_PARAM', message: '身高需在 90~250cm 之间' }
    if (!(weight >= 20 && weight <= 300)) return { code: 'INVALID_PARAM', message: '体重需在 20~300kg 之间' }
    if (!(age >= 5 && age <= 120)) return { code: 'INVALID_PARAM', message: '年龄需在 5~120 岁之间' }
    // 已录入过身体数据的用户，每月仅可修改一次
    const hasExisting = Number(profile.height) > 0 && Number(profile.weight) > 0 && Number(profile.age) > 0 && !!profile.gender
    const monthStr = date.slice(0, 7)
    if (hasExisting && profile.profileEditMonth === monthStr) {
      return { code: 'LIMIT', message: '身体数据每月只能修改一次，下月再来吧' }
    }
    await db.collection('user_profile').doc(profile._id).update({
      data: { height: Math.round(height), weight: Math.round(weight * 10) / 10, age: Math.round(age), gender, profileEditMonth: monthStr }
    })
    const p = { height: Math.round(height), weight: Math.round(weight * 10) / 10, age: Math.round(age), gender }
    return { code: 'OK', data: { profile: p, bmr: calcBMR(p) } }
  }

  // ---- 记录今日摄入热量 ----
  if (action === 'recordIntake') {
    const calories = Number(event.calories)
    if (!Number.isFinite(calories) || calories < 0 || calories > 10000) {
      return { code: 'INVALID_PARAM', message: '请填写 0~10000 之间的摄入热量' }
    }
    const prev = findLog(profile, date) || {}
    const pointAdded = prev.intakeCounted ? 0 : 1
    await writeLog(profile, date, { intake: Math.round(calories), intakeCounted: true })
    if (pointAdded) await db.collection('user_profile').doc(profile._id).update({ data: { totalPoint: _.inc(1) } })
    return {
      code: 'OK',
      data: { intake: Math.round(calories), pointAdded, totalPoint: (profile.totalPoint || 0) + pointAdded }
    }
  }

  // ---- 记录今日消耗热量（不含新陈代谢）----
  if (action === 'recordExpenditure') {
    const calories = Number(event.calories)
    if (!Number.isFinite(calories) || calories < 0 || calories > 10000) {
      return { code: 'INVALID_PARAM', message: '请填写 0~10000 之间的消耗热量' }
    }
    const prev = findLog(profile, date) || {}
    const pointAdded = prev.expenditureCounted ? 0 : 1
    await writeLog(profile, date, { expenditure: Math.round(calories), expenditureCounted: true })
    if (pointAdded) await db.collection('user_profile').doc(profile._id).update({ data: { totalPoint: _.inc(1) } })
    return {
      code: 'OK',
      data: { expenditure: Math.round(calories), pointAdded, totalPoint: (profile.totalPoint || 0) + pointAdded }
    }
  }

  return { code: 'INVALID_PARAM', message: 'action 仅支持 getHealth / saveProfile / recordIntake / recordExpenditure' }
}
