// 查询 recipe 集合中 imageUrl 为空的菜品 - 使用 tcb-admin-node
const tcb = require('tcb-admin-node');
const fs = require('fs');
const os = require('os');
const path = require('path');

const envId = 'letsdoenv-d1gndgyhv2f9d22fb';

// 从 ~/.config/.cloudbase/auth.json 读取凭据
const authPath = path.join(os.homedir(), '.config', '.cloudbase', 'auth.json');
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
const cred = auth.credential;

console.log('使用凭据 tmpSecretId:', cred.tmpSecretId ? cred.tmpSecretId.slice(0, 15) + '...' : '无');
console.log('tmpExpired:', new Date(cred.tmpExpired).toISOString());

// 使用 tcb-admin-node 初始化
tcb.init({
  env: envId,
  secretId: cred.tmpSecretId,
  secretKey: cred.tmpSecretKey,
  sessionToken: cred.tmpToken  // tcb-admin-node 用 sessionToken
});

const db = tcb.database();

async function main() {
  const countRes = await db.collection('recipe').count();
  console.log('菜谱总数:', countRes.total);
  
  const MAX = 100;
  const tasks = [];
  for (let i = 0; i < countRes.total; i += MAX) {
    tasks.push(db.collection('recipe').skip(i).limit(MAX).get());
  }
  const results = await Promise.all(tasks);
  const allRecipes = results.reduce((acc, cur) => acc.concat(cur.data), []);
  
  const missing = allRecipes.filter(r => !r.imageUrl || String(r.imageUrl).trim() === '');
  console.log('imageUrl 为空的数量:', missing.length);
  
  console.log('\n--- 前30条缺失列表 ---');
  missing.slice(0, 30).forEach((r, i) => {
    console.log(`${i+1}. _id=${r._id}  name=${r.name}  cuisine=${r.cuisine || '-'}  desc=${(r.desc || '').slice(0,50)}`);
  });
  
  fs.writeFileSync('scripts/missing_recipes.json', JSON.stringify(missing, null, 2));
  console.log(`\n已写入 scripts/missing_recipes.json (共 ${missing.length} 条)`);
}

main().catch(e => {
  console.error('ERROR:', e.message);
  console.error(e.stack);
  process.exit(1);
});
