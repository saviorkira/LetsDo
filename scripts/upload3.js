// 临时上传脚本：用 https.Agent 但禁用 keepAlive 解决 ECONNRESET
const https = require('https')

// 创建一个不 keepAlive 的 agent
const noKeepAgent = new https.Agent({ keepAlive: false, maxSockets: 100 })

const origHttpsRequest = https.request
https.request = function (options, callback) {
  if (typeof options === 'string') options = new URL(options)
  const host = options.hostname || options.host || ''
  if (host.includes('servicewechat')) {
    // 禁用 keepAlive 但保持连接池（避免 ECONNRESET + 避免 timeout）
    options.agent = noKeepAgent
    if (!options.timeout) options.timeout = 30000
  }
  return origHttpsRequest.call(this, options, callback)
}

const ci = require('miniprogram-ci')
const path = require('path')

const project = new ci.Project({
  appid: 'wx47509108d337878e',
  type: 'miniProgram',
  projectPath: path.resolve(__dirname, '..', 'dist', 'build', 'mp-weixin'),
  privateKeyPath: path.resolve(__dirname, '..', 'private.wx47509108d337878e.key'),
})

async function main() {
  console.log('📦 上传 LetsDo v1.3.0...')
  try {
    await ci.upload({
      project,
      version: '1.3.0',
      desc: '禁用暗色模式默认和自动切换;启用微信右上角转发/分享',
      setting: { es6: true, minify: true, postcss: true },
    })
    console.log('✅ 上传成功！')
  } catch (e) {
    console.error('❌ 失败:', e.message, '| type:', typeof e)
    console.error('   stack:', e.stack)
    process.exit(1)
  }
}
main()
