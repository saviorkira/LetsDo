// 文件路径：src/utils/cloud.js
// 统一云函数调用入口：前端不直接读写云数据库，所有数据请求都走云函数
// 修复时序：uni.cloud 可能在 App.vue onLaunch 之前 import，wx.cloud.init 尚未执行

function ensureCloud() {
  // uni-app 编译后 uni.cloud 会被挂载为 wx.cloud；保险起见每次都检查
  if (typeof uni !== 'undefined' && !uni.cloud && typeof wx !== 'undefined' && wx.cloud) {
    uni.cloud = wx.cloud
  }
  if (!uni.cloud) {
    throw new Error('云开发未初始化，请检查 env.js 环境 ID 或是否开通云开发')
  }
}

export function callFunction(name, data) {
  ensureCloud()
  return uni.cloud.callFunction({ name, data })
}

// 云函数调用失败的统一处理：把错误详情复制到剪贴板并弹窗提示，方便用户粘贴反馈
export function reportCloudError(tag, e) {
  console.error('[' + tag + '] 调用失败', e)
  const detail = (e && (e.errMsg || e.message)) ? String(e.errMsg || e.message) : String(e)
  uni.setClipboardData({
    data: tag + ' | ' + detail,
    success: () => {
      uni.showModal({
        title: '出错了',
        content: '错误信息已复制到剪贴板，请粘贴发给开发者。\n\n' + detail.slice(0, 200),
        showCancel: false
      })
    },
    fail: () => {
      uni.showModal({ title: '出错了', content: detail.slice(0, 300), showCancel: false })
    }
  })
}
