// 测试：patch https.request 强制 agent=false
const https = require('https')
const origReq = https.request
https.request = function (options, cb) {
  if (typeof options === 'string') options = new URL(options)
  options.agent = false
  return origReq.call(this, options, cb)
}

const ci = require('miniprogram-ci')
const path = require('path')
const project = new ci.Project({
  appid: 'wx47509108d337878e',
  type: 'miniProgram',
  projectPath: path.resolve(__dirname, '..', 'dist', 'build', 'mp-weixin'),
  privateKeyPath: path.resolve(__dirname, '..', 'private.wx47509108d337878e.key'),
})
ci.upload({ project, version: '1.2.0', desc: 'test', setting: { es6: true, minify: true, postcss: true } })
  .then(() => console.log('UPLOAD OK'))
  .catch(e => console.log('UPLOAD FAIL:', e.message))
