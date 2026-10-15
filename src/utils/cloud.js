// 小程序端将 wx.cloud 挂载为 uni.cloud，统一使用 uni.cloud.callFunction 调用云函数
if (!uni.cloud && typeof wx !== 'undefined' && wx.cloud) {
  uni.cloud = wx.cloud
}

// 统一云函数调用入口：前端不直接读写云数据库，所有数据请求都走云函数
export function callFunction(name, data) {
  return uni.cloud.callFunction({ name, data })
}
