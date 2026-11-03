// 带重试的云函数部署，对抗联通 NAT IP 漂移
const ci = require('miniprogram-ci')
const path = require('path')

const APPID = 'wx47509108d337878e'
const ENV = 'letsdoenv-d1gndgyhv2f9d22fb'
const PRIVATE_KEY_PATH = path.resolve(__dirname, '..', 'private.wx47509108d337878e.key')
const MAX_RETRY = 8

const project = new ci.Project({
  appid: APPID,
  type: 'miniProgram',
  projectPath: path.resolve(__dirname, '..', 'dist', 'build', 'mp-weixin'),
  privateKeyPath: PRIVATE_KEY_PATH,
})

const functions = [
  { name: 'generateMenu', path: path.resolve(__dirname, '..', 'cloudfunctions', 'generateMenu') },
  { name: 'recipeService', path: path.resolve(__dirname, '..', 'cloudfunctions', 'recipeService') },
]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function deployOne(f, attempt) {
  console.log(`  [${f.name}] 尝试 ${attempt}/${MAX_RETRY} ...`)
  try {
    await ci.cloud.uploadFunction({
      project, env: ENV, name: f.name, path: f.path, remoteNpmInstall: true
    })
    console.log(`  ✅ ${f.name} 部署成功`)
    return true
  } catch (e) {
    console.log(`  ❌ ${f.name} 失败: ${e.message || e}`)
    if (attempt < MAX_RETRY) {
      const wait = Math.min(3000 * attempt, 10000)
      console.log(`     ${wait/1000}s 后重试...`)
      await sleep(wait)
    }
    return false
  }
}

async function main() {
  for (const f of functions) {
    let ok = false
    for (let i = 1; i <= MAX_RETRY; i++) {
      ok = await deployOne(f, i)
      if (ok) break
    }
    if (!ok) {
      console.log(`\n❌ ${f.name} 超过最大重试，请检查网络或换热点`)
      process.exit(1)
    }
  }
  console.log('\n🎉 全部云函数部署完成')
}

main().catch(e => {
  console.log('主进程异常:', e.message || e)
  process.exit(1)
})
