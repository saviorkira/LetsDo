// 文件路径：cloudfunctions/getPointRank/index.js
// 云函数：getPointRank 积分排行榜
// 入参：page（默认 1）、pageSize（默认 20，上限 50，控制单次返回条数）
// 规则：过滤 rankHidden=true 的用户；按 totalPoint 降序；附带当前用户排名信息
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()

  // 入参校验与边界收敛
  let page = Number(event && event.page) || 1
  let pageSize = Number(event && event.pageSize) || 20
  if (page < 1) page = 1
  if (pageSize < 1 || pageSize > 50) pageSize = 20

  // 仅查询未隐藏的用户，过滤字段避免返回多余数据
  const where = { rankHidden: db.command.neq(true) }
  const listRes = await db.collection('user_profile')
    .where(where)
    .field({ openid: true, nickName: true, avatarUrl: true, totalPoint: true })
    .orderBy('totalPoint', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  // 总数用于判断是否还有更多
  const countRes = await db.collection('user_profile').where(where).count()

  // 当前用户排名（未隐藏时才计算）
  let myRank = null
  let myInfo = null
  const mine = await db.collection('user_profile').where({ openid: OPENID }).limit(1).get()
  if (mine.data.length) {
    const p = mine.data[0]
    myInfo = { nickName: p.nickName, avatarUrl: p.avatarUrl, totalPoint: p.totalPoint, rankHidden: !!p.rankHidden }
    if (!p.rankHidden) {
      const higher = await db.collection('user_profile')
        .where({ rankHidden: db.command.neq(true), totalPoint: db.command.gt(p.totalPoint || 0) })
        .count()
      myRank = higher.total + 1
    }
  }

  return {
    code: 'OK',
    data: {
      list: listRes.data.map(u => ({
        nickName: u.nickName || '匿名小厨',
        avatarUrl: u.avatarUrl || '',
        totalPoint: u.totalPoint || 0,
        isMe: u.openid === OPENID
      })),
      hasMore: page * pageSize < countRes.total,
      myRank,
      myInfo
    }
  }
}
