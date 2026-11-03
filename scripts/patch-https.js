// Node.js 全局预加载脚本
// 目标：让 miniprogram-ci 在 Node.js v24 下正常上传（解决 ECONNRESET + timeout）

// === 1. patch request 库（让它不使用 keepAlive agent） ===
try {
  const request = require('request')
  const origRequest = request.Request.prototype.request
  request.Request.prototype.request = function () {
    this.forever = false
    this.agent = false
    this.agentOptions = undefined
    return origRequest.apply(this, arguments)
  }
  console.log('[patch] request.Request patched (forever=false, agent=false)')
} catch (e) {
  console.log('[patch] request not found, skip:', e.message)
}

// === 2. patch https.request（双重保险） ===
const https = require('https')
const origHttpsRequest = https.request
https.request = function (options, callback) {
  if (typeof options === 'string') options = new URL(options)
  const host = (options.hostname || options.host || '').toString()
  if (host.includes('servicewechat')) {
    options.agent = false
    options.keepAlive = false
    delete options.agentOptions
    if (!options.timeout) options.timeout = 60000
  }
  return origHttpsRequest.call(this, options, callback)
}

console.log('[patch] https.request active, PID:', process.pid)
