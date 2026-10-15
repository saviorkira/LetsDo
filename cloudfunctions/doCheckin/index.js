// 文件路径：cloudfunctions/doCheckin/index.js
// 云函数：doCheckin 每日打卡
// 规则：每日仅可打卡一次；打卡成功 user_profile.totalPoint +1
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 获取东八区当日日期 YYYY-MM-DD（云函数默认 UTC 时区）
function todayStr() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

// 查询或创建用户档案
async function ensureProfile(openid) {
  const res = await db.collection('user_profile').where({ openid }).limit(1).get()
  if (res.data.length) return res.data[0]
  const addRes = await db.collection('user_profile').add({
    data: {
      openid,
      nickName: '',
      avatarUrl: '',
      totalPoint: 0,
      rankHidden: false // 默认展示在排行榜
    }
  })
  return { _id: addRes._id, openid, totalPoint: 0 }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { code: 'INVALID_PARAM', message: '无法获取用户身份' }

  const today = todayStr()

  // 查询当日是否已打卡
  const exist = await db.collection('user_checkin')
    .where({ openid: OPENID, checkinDate: today })
    .limit(1)
    .get()
  if (exist.data.length) {
    return { code: 'ALREADY', message: '今日已打卡' }
  }

  // 新增打卡记录
  await db.collection('user_checkin').add({
    data: {
      openid: OPENID,
      checkinDate: today,
      createTime: db.serverDate()
    }
  })

  // 积分 +1
  const profile = await ensureProfile(OPENID)
  await db.collection('user_profile').doc(profile._id).update({
    data: { totalPoint: _.inc(1) }
  })

  return { code: 'OK', data: { checkinDate: today, totalPoint: (profile.totalPoint || 0) + 1 } }
}
