// 查询 ingredient 集合获取名称映射
const tcb = require('tcb-admin-node');
const fs = require('fs');
const os = require('os');
const path = require('path');

const envId = 'letsdoenv-d1gndgyhv2f9d22fb';
const authPath = path.join(os.homedir(), '.config', '.cloudbase', 'auth.json');
const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));

tcb.init({
  env: envId,
  secretId: auth.credential.tmpSecretId,
  secretKey: auth.credential.tmpSecretKey,
  sessionToken: auth.credential.tmpToken
});

const db = tcb.database();

async function main() {
  // 查 ingredient 集合
  const MAX = 100;
  const count = await db.collection('ingredient').count();
  const tasks = [];
  for (let i = 0; i < count.total; i += MAX) {
    tasks.push(db.collection('ingredient').skip(i).limit(MAX).get());
  }
  const results = await Promise.all(tasks);
  const ingredients = results.reduce((a, b) => a.concat(b.data), []);
  
  // 映射 id -> name
  const map = {};
  ingredients.forEach(i => { map[i._id] = i.name; });
  
  console.log('食材总数:', ingredients.length);
  
  // 读取前20道缺失菜
  const missing = JSON.parse(fs.readFileSync('scripts/missing_recipes.json', 'utf8'));
  const top20 = missing.slice(0, 20);
  
  // 为每道菜构建英文名称和prompt
  const recipesWithInfo = top20.map(r => {
    const ings = (r.ingredientList || []).map(i => map[i.ingredientId] || 'unknown');
    
    // 容器判断
    let container = 'round ceramic plate';
    if (r.name.includes('汤') || r.name.includes('羹') || r.name.includes('粥')) container = 'deep ceramic bowl';
    else if (r.name.includes('面') || r.name.includes('意面') || r.name.includes('拌面')) container = 'deep ceramic bowl';
    else if (r.name.includes('鱼')) container = 'oval fish plate';
    else if (r.name.includes('盖饭')) container = 'shallow rice bowl';
    
    // 英文名称 (snake_case)
    let enName = '';
    switch(r.name) {
      case '鱼香肉丝': enName = 'fish_flavored_shredded_pork'; break;
      case '酸辣土豆丝': enName = 'spicy_sour_potato_strips'; break;
      case '水煮白菜': enName = 'boiled_cabbage'; break;
      case '红烧豆腐': enName = 'braised_tofu'; break;
      case '蒜蓉西兰花': enName = 'garlic_broccoli'; break;
      case '黄瓜拌木耳': enName = 'cucumber_wood_ear_salad'; break;
      case '牛肉炒胡萝卜': enName = 'beef_carrot_stirfry'; break;
      case '家常豆腐': enName = 'home_style_tofu'; break;
      case '青椒肉丝盖饭': enName = 'green_pepper_pork_rice'; break;
      case '鱼香肉丝盖饭': enName = 'fish_flavored_pork_rice'; break;
      case '番茄炒蛋盖饭': enName = 'tomato_egg_rice'; break;
      case '红烧牛肉盖饭': enName = 'braised_beef_rice'; break;
      case '土豆牛腩盖饭': enName = 'potato_beef_rice'; break;
      case '蘑菇炖鸡': enName = 'mushroom_chicken_braise'; break;
      case '清蒸鲈鱼': enName = 'steamed_sea_bass'; break;
      case '南瓜粥配馒头': enName = 'pumpkin_porridge_bun'; break;
      case '红薯配豆浆': enName = 'sweet_potato_soy_milk'; break;
      case '红烧肉': enName = 'red_braised_pork'; break;
      case '宫保鸡丁': enName = 'kung_pao_chicken'; break;
      case '黑椒牛肉意面': enName = 'black_pepper_beef_pasta'; break;
      default: enName = r.name.replace(/[^\w]/g, '_').toLowerCase();
    }
    
    return {
      _id: r._id,
      cnName: r.name,
      enName: enName,
      cuisine: r.cuisine,
      desc: r.desc,
      ingredients: ings,
      container: container
    };
  });
  
  // 输出 prompt 模板
  recipesWithInfo.forEach(r => {
    const ingsDesc = r.ingredients.join(', ');
    const prompt = `Food photography, top-down flat lay shot of ${r.cnName} (${r.enName.replace(/_/g, ' ')}) with ${ingsDesc}, served on a handmade rustic ${r.container} with matte off-white color and subtle speckled texture, warm natural light from upper left, soft directional shadows, light wood table surface as background, small linen cloth napkin corner placement, 2-3 matching ingredient items scattered as garnish, warm neutral low saturation film-like color grading, premium look, 80%+ frame filled with food + plate, square composition`;
    console.log(`--- ${r.cnName} / ${r.enName} ---`);
    console.log(`_id: ${r._id}`);
    console.log(`container: ${r.container}`);
    console.log(`ingredients: ${ingsDesc}`);
    console.log(`prompt: ${prompt}`);
    console.log('');
  });
  
  fs.writeFileSync('scripts/top20_info.json', JSON.stringify(recipesWithInfo, null, 2));
  console.log('\n已写入 scripts/top20_info.json');
}

main().catch(e => { console.error(e); process.exit(1); });
