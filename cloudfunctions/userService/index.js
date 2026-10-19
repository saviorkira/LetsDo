// 文件路径：cloudfunctions/userService/index.js
// 云函数：userService 用户中心服务
// 入参 action：
//   getMine           我的页面初始化（档案 + 今日打卡状态 + 当月打卡日期 + 连续打卡天数）
//   updateRankHidden  排行榜展示开关，需 hidden: boolean
//   updateProfile     更新昵称头像，需 nickName、avatarUrl
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 东八区当日日期 YYYY-MM-DD
function todayStr() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

// 查询或创建用户档案
async function ensureProfile(openid) {
  const res = await db.collection('user_profile').where({ openid }).limit(1).get()
  if (res.data.length) return res.data[0]
  const addRes = await db.collection('user_profile').add({
    data: { openid, nickName: '', avatarUrl: '', totalPoint: 0, rankHidden: false }
  })
  return { _id: addRes._id, openid, nickName: '', avatarUrl: '', totalPoint: 0, rankHidden: false }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: 'INVALID_PARAM', message: '无法获取用户身份' }
  const { action } = event || {}

  const profile = await ensureProfile(OPENID)

  // ---- 我的页面初始化数据 ----
  if (action === 'getMine') {
    const today = todayStr()
    const monthPrefix = today.slice(0, 7) // YYYY-MM

    // 当月打卡记录（日历渲染用）
    const monthRes = await db.collection('user_checkin')
      .where({ openid: OPENID, checkinDate: db.command.gte(monthPrefix + '-01') })
      .field({ checkinDate: true })
      .limit(31)
      .get()
    const monthDates = monthRes.data.map(d => d.checkinDate)

    // 全部打卡记录（计算连续天数与总天数；个人用户量级小，limit 100 够用）
    const allRes = await db.collection('user_checkin')
      .where({ openid: OPENID })
      .field({ checkinDate: true })
      .orderBy('checkinDate', 'desc')
      .limit(100)
      .get()
    const allDates = new Set(allRes.data.map(d => d.checkinDate))

    // 从今日往前推算连续打卡天数
    let streak = 0
    const cursor = new Date(Date.now() + 8 * 3600 * 1000)
    // 若今日未打卡，从昨日开始算连续
    if (!allDates.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1)
    while (allDates.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setUTCDate(cursor.getUTCDate() - 1)
    }

    return {
      code: 'OK',
      data: {
        profile: {
          nickName: profile.nickName || '',
          avatarUrl: profile.avatarUrl || '',
          totalPoint: profile.totalPoint || 0,
          rankHidden: !!profile.rankHidden
        },
        checkedToday: allDates.has(today),
        monthDates,
        allDates: Array.from(allDates),
        streak,
        totalCheckinDays: allDates.size
      }
    }
  }

  // ---- 排行榜展示开关 ----
  if (action === 'updateRankHidden') {
    const hidden = event.hidden
    if (typeof hidden !== 'boolean') {
      return { code: 'INVALID_PARAM', message: 'hidden 必须为布尔值' }
    }
    await db.collection('user_profile').doc(profile._id).update({ data: { rankHidden: hidden } })
    return { code: 'OK', data: { rankHidden: hidden } }
  }

  // ---- 更新昵称头像 ----
  if (action === 'updateProfile') {
    const { nickName, avatarUrl } = event
    const data = {}
    if (typeof nickName === 'string' && nickName.trim()) data.nickName = nickName.trim().slice(0, 24)
    if (typeof avatarUrl === 'string' && avatarUrl) data.avatarUrl = avatarUrl
    if (!Object.keys(data).length) {
      return { code: 'INVALID_PARAM', message: '昵称或头像至少传一项' }
    }
    await db.collection('user_profile').doc(profile._id).update({ data })
    return { code: 'OK', data }
  }

  return { code: 'INVALID_PARAM', message: 'action 仅支持 getMine / updateRankHidden / updateProfile' }
}
