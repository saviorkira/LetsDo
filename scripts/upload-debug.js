// 直接测试 miniprogram-ci 的完整上传流程，打印每一步
const ci = require('miniprogram-ci')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

const APPID = 'wx47509108d337878e'
const PRIVATE_KEY = fs.readFileSync(path.resolve(__dirname, '..', 'private.wx47509108d337878e.key'), 'utf8')

async function test() {
  console.log('=== Step 1: 创建 Project ===')
  const project = new ci.Project({
    appid: APPID,
    type: 'miniProgram',
    projectPath: path.resolve(__dirname, '..', 'dist', 'build', 'mp-weixin'),
    privateKeyPath: path.resolve(__dirname, '..', 'private.wx47509108d337878e.key'),
  })
  console.log('OK')

  console.log('=== Step 2: 获取项目属性（getattr） ===')
  try {
    const attr = await project.attr()
    console.log('getattr OK:', JSON.stringify(attr).substring(0, 300))
  } catch (e) {
    console.log('getattr FAIL:', e, typeof e)
    if (e.stack) console.log('stack:', e.stack)
  }

  console.log('=== Step 3: 上传 ===')
  try {
    const result = await ci.upload({
      project,
      version: '1.3.0',
      desc: '禁用暗色模式;启用转发',
      setting: { es6: true, minify: true, postcss: true },
    })
    console.log('✅ 上传成功:', JSON.stringify(result).substring(0, 500))
  } catch (e) {
    console.log('❌ 上传失败:')
    console.log('  message:', e.message)
    console.log('  code:', e.code)
    console.log('  name:', e.name)
    console.log('  keys:', Object.getOwnPropertyNames(e))
    console.log('  full:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2))
    if (e.stack) console.log('  stack:', e.stack.substring(0, 500))
  }
}
test()
