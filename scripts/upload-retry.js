// 带重试的 CI 上传，对抗联通 NAT IP 漂移
const ci = require('miniprogram-ci')
const path = require('path')

const MAX_RETRY = 8

const VERSION = process.env.VERSION
const DESC = process.env.DESC || 'LetsDo 更新'

if (!VERSION) {
  console.error('❌ 缺少 VERSION 环境变量，例：$env:VERSION=\'1.3.1\'; node scripts/upload-retry.js')
  process.exit(1)
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function tryUpload(attempt) {
  console.log(`\n[尝试 ${attempt}/${MAX_RETRY}] 版本=${VERSION} 描述=${DESC}`)
  try {
    const project = new ci.Project({
      appid: 'wx47509108d337878e',
      type: 'miniProgram',
      projectPath: path.resolve(__dirname, '..', 'dist', 'build', 'mp-weixin'),
      privateKeyPath: path.resolve(__dirname, '..', 'private.wx47509108d337878e.key'),
    })

    const result = await ci.upload({
      project,
      version: VERSION,
      desc: DESC,
      setting: { es6: true, minify: true, postcss: true },
    })
    console.log('✅ 上传成功! 版本=' + VERSION)
    return true
  } catch (e) {
    console.log('❌ 失败:', e.message || e)
    if (attempt < MAX_RETRY) {
      const wait = Math.min(3000 * attempt, 10000)
      console.log(`   ${wait/1000}s 后重试...`)
      await sleep(wait)
    }
    return false
  }
}

async function main() {
  for (let i = 1; i <= MAX_RETRY; i++) {
    if (await tryUpload(i)) return
  }
  console.log('\n❌ 超过最大重试，建议换手机热点')
  process.exit(1)
}

main().catch(e => {
  console.log('主进程异常:', e.message || e)
  process.exit(1)
})
