// scripts/add-cuisine.js — 给所有 recipe 批量添加 cuisine 字段
// 运行前先 npm i @cloudbase/node-sdk
const tcb = require('@cloudbase/node-sdk')

const app = tcb.init({ env: 'letsdoenv-d1gndgyhv2f9d22fb' })
const db = app.database()

function guessCuisine(name) {
  if (name.includes('意面') || name.includes('牛排') || name.includes('黑椒牛肉意面')) return '西式'
  if (name.includes('沙拉') || name.includes('披萨')) return '西式'
  if (name.includes('三文鱼') && name.includes('煎')) return '西式'
  return '中式'
}

async function run() {
  const res = await db.collection('recipe').limit(100).get()
  console.log(`找到 ${res.data.length} 条 recipe`)

  let updated = 0
  for (const r of res.data) {
    const cuisine = guessCuisine(r.name)
    if (r.cuisine !== cuisine) {
      await db.collection('recipe').doc(r._id).update({ data: { cuisine } })
      console.log(`  ✅ ${r.name} → ${cuisine}`)
      updated++
    }
  }
  console.log(`\n完成！更新了 ${updated} 条`)
}

run().catch(console.error)
