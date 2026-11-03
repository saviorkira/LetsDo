// 诊断：确认 servicewechat CI 接口当前状态
const https = require('https')
const crypto = require('crypto')
const fs = require('fs')

const KEY = fs.readFileSync('e:/project/LetsDo/private.wx47509108d337878e.key', 'utf8')
const APPID = 'wx47509108d337878e'

function post(path, bodyStr) {
  return new Promise((res) => {
    const req = https.request({
      hostname: 'servicewechat.com', port: 443, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
      timeout: 15000
    }, (r) => {
      let d = ''
      r.on('data', c => d += c)
      r.on('end', () => {
        const m = d.match(/errMsg":\s*"([^"]{0,80})/)
        res('HTTP ' + r.statusCode + ' | ' + (m ? m[1] : d.substring(0, 80)))
      })
    })
    req.on('error', e => res('ERR ' + e.message))
    req.on('timeout', () => { req.destroy(); res('TIMEOUT') })
    req.write(bodyStr)
    req.end()
  })
}

async function main() {
  const b1 = JSON.stringify({ appid: APPID, clientRand: Math.floor(Math.random() * 1e8) })
  const raw = await post('/wxa/ci/getrandstr?_r=' + Math.random(), b1)
  console.log('1) getrandstr :', raw)
  const m = raw.match(/randomString":"([^"]+)/)
  if (!m) { console.log('getrandstr 未拿到 randstr，网络层已异常'); return }

  const randStr = m[1]
  const sig = crypto.privateEncrypt(
    { key: KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(JSON.stringify({ appid: APPID, rand_str: randStr }))
  ).toString('base64')
  const b2 = JSON.stringify({ appid: APPID, signature: sig, source: 'ci', mode: 'upload' })

  for (let i = 1; i <= 3; i++) {
    console.log('2.' + i + ') getattr(real) :', await post('/wxa/ci/getattr?_r=' + Math.random(), b2))
  }

  const b3 = JSON.stringify({ appid: APPID, signature: 'x', source: 'ci', mode: 'upload' })
  console.log('3) getattr(bad)  :', await post('/wxa/ci/getattr?_r=' + Math.random(), b3))
}

main()
