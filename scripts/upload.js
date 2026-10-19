// 文件路径：scripts/upload.js
// 微信小程序 CI 上传脚本
// 使用前：先到 mp.weixin.qq.com → 开发管理 → 开发设置 → 小程序代码上传 → 下载代码上传密钥（pem 文件）
// 然后把 pem 文件放到项目根目录，或者改下面 privateKeyPath 的路径

const ci = require('miniprogram-ci')
const path = require('path')

const APPID = 'wx47509108d337878e'
const PROJECT_PATH = path.resolve(__dirname, '..', 'dist', 'build', 'mp-weixin')
const PRIVATE_KEY_PATH = path.resolve(__dirname, '..', 'private.wx47509108d337878e.key')

const version = process.env.VERSION || '0.0.1'
const desc = process.env.DESC || 'LetsDo 随机菜单小程序'

const project = new ci.Project({
  appid: APPID,
  type: 'miniProgram',
  projectPath: PROJECT_PATH,
  privateKeyPath: PRIVATE_KEY_PATH,
  ignores: ['node_modules/**/*', '.git/**/*'],
})

async function upload() {
  console.log('📦 上传 LetsDo 小程序...')
  console.log('   项目路径:', PROJECT_PATH)
  console.log('   版本:', version)
  console.log('   描述:', desc)

  try {
    await ci.upload({
      project,
      version,
      desc,
      setting: {
        es6: true,
        minify: true,
        postcss: true,
      },
    })
    console.log('✅ 上传成功！去 mp.weixin.qq.com → 版本管理 查看')
  } catch (e) {
    console.error('❌ 上传失败:', e.message)
    if (e.message.includes('private key')) {
      console.error('👉 请先下载代码上传密钥：')
      console.error('   mp.weixin.qq.com → 开发管理 → 开发设置 → 小程序代码上传')
      console.error('   下载后改名为 private.wx47509108d337878e.key 放到项目根目录')
    }
    process.exit(1)
  }
}

// 如果带 --preview 参数则生成预览二维码
if (process.argv.includes('--preview')) {
  async function preview() {
    console.log('📸 生成预览二维码...')
    try {
      await ci.preview({
        project,
        desc,
        setting: { es6: true, minify: true, postcss: true },
        qrcodeFormat: 'image',
        qrcodeOutputDest: path.resolve(__dirname, '..', 'preview.png'),
      })
      console.log('✅ 预览二维码已生成:', path.resolve(__dirname, '..', 'preview.png'))
    } catch (e) {
      console.error('❌ 预览失败:', e.message)
      process.exit(1)
    }
  }
  preview()
} else {
  upload()
}
