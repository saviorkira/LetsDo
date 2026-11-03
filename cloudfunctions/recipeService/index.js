// 文件路径：cloudfunctions/recipeService/index.js
// 云函数：recipeService 菜谱查询服务
// 入参 action：
//   list             菜谱库列表（含实时计算的单份热量）
//   detail           菜谱配方详情（展开食材明细 + 整套营养汇总），需 recipeId
//   filterOptions    忌口筛选用食材列表（_id + name）
//   listIngredients  食材库列表（菜品库食材 Tab 用）
//   ingredientDetail 食材详情（营养/价格 + 用到它的菜品列表），需 ingredientId
//   randomDish       随机食材组合
//   randomCocktail   随机调酒（按基酒 + 辅料组合一杯）
//
// 【价格口径】ingredient.price 为「元/斤（500g）」；
// 计算食材成本时统一按 weight/500 换算（此前误按 weight/100，导致菜品价格放大 5 倍）
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 读取集合全部数据（分批兜底）
async function getAll(collection) {
  const MAX = 100
  const countRes = await db.collection(collection).count()
  const tasks = []
  for (let i = 0; i < countRes.total; i += MAX) {
    tasks.push(db.collection(collection).skip(i).limit(MAX).get())
  }
  const results = await Promise.all(tasks)
  return results.reduce((acc, cur) => acc.concat(cur.data), [])
}

// 基于食材库计算单份菜谱营养 / 价格（与 generateMenu 口径一致）
function calcRecipe(recipe, ingredientMap) {
  const detail = []
  let totalCalories = 0
  let totalPrice = 0
  let totalProtein = 0
  let totalFat = 0
  let totalCarbohydrate = 0

  for (const item of recipe.ingredientList || []) {
    const ing = ingredientMap[item.ingredientId]
    if (!ing) continue
    const ratio = item.weight / 100 // 营养基准：每 100g
    const priceRatio = item.weight / 500 // 价格基准：元/斤（500g）
    totalCalories += ing.calories * ratio
    totalPrice += ing.price * priceRatio
    totalProtein += ing.protein * ratio
    totalFat += ing.fat * ratio
    totalCarbohydrate += ing.carbohydrate * ratio
    detail.push({
      ingredientId: ing._id,
      name: ing.name,
      weight: item.weight,
      caloriesPer100g: ing.calories,
      calories: ing.calories * ratio,
      pricePer100g: (Number(ing.price) || 0) / 5,
      price: ing.price * priceRatio,
      proteinPer100g: ing.protein,
      protein: ing.protein * ratio,
      fatPer100g: ing.fat,
      fat: ing.fat * ratio,
      carbohydratePer100g: ing.carbohydrate,
      carbohydrate: ing.carbohydrate * ratio,
      nutritionDesc: ing.nutritionDesc || '',
      imageUrl: ing.imageUrl || '',
      isStaple: !!ing.isStaple,
      isVegetable: !!ing.isVegetable,
      isAlcohol: !!ing.isAlcohol,
      isDrink: !!ing.isDrink
    })
  }

  return { detail, totalCalories, totalPrice, totalProtein, totalFat, totalCarbohydrate }
}

exports.main = async (event) => {
  const { action, recipeId } = event || {}

  if (action === 'filterOptions') {
    // 忌口筛选面板：返回全部食材的 _id 和名称
    const ingredients = await getAll('ingredient')
    return {
      code: 'OK',
      data: ingredients.map(i => ({ _id: i._id, name: i.name }))
    }
  }

  if (action === 'list') {
    const { cuisine, includeIngredientIdList, excludeIngredientIdList, keyword, page = 1, pageSize = 10 } = event || {}
    const [ingredients, recipes] = await Promise.all([getAll('ingredient'), getAll('recipe')])
    const ingredientMap = {}
    for (const ing of ingredients) ingredientMap[ing._id] = ing

    let list = recipes
    // 菜系筛选
    if (cuisine && typeof cuisine === 'string') {
      list = list.filter(r => r.cuisine === cuisine)
    }
    // 排除含某些食材
    if (Array.isArray(excludeIngredientIdList) && excludeIngredientIdList.length) {
      const ban = new Set(excludeIngredientIdList)
      list = list.filter(r => !(r.ingredientList || []).some(i => ban.has(i.ingredientId)))
    }
    // 必须包含某些食材
    if (Array.isArray(includeIngredientIdList) && includeIngredientIdList.length) {
      const must = new Set(includeIngredientIdList)
      list = list.filter(r => (r.ingredientList || []).some(i => must.has(i.ingredientId)))
    }
    // 菜名搜索
    const kw = String(keyword || '').trim().toLowerCase()
    if (kw) list = list.filter(r => (r.name || '').toLowerCase().includes(kw))

    // 分页
    const total = list.length
    const p = Math.max(1, Number(page) || 1)
    const ps = Math.max(1, Math.min(50, Number(pageSize) || 10))
    const start = (p - 1) * ps
    list = list.slice(start, start + ps)

    list = list.map(r => {
      const calc = calcRecipe(r, ingredientMap)
      return {
        _id: r._id,
        name: r.name,
        imageUrl: r.imageUrl || '',
        desc: r.desc || '',
        cuisine: r.cuisine || '中式',
        totalCalories: calc.totalCalories,
        ingredientCount: calc.detail.length,
        isStaple: calc.detail.some(d => d.isStaple)
      }
    })
    return { code: 'OK', data: { list, total, hasMore: start + ps < total, page: p } }
  }

  if (action === 'detail') {
    // 入参校验，防止恶意查询
    if (!recipeId || typeof recipeId !== 'string' || recipeId.length > 64) {
      return { code: 'INVALID_PARAM', message: 'recipeId 非法' }
    }
    const recipeRes = await db.collection('recipe').doc(recipeId).get().catch(() => null)
    if (!recipeRes || !recipeRes.data) {
      return { code: 'NOT_FOUND', message: '菜谱不存在' }
    }
    const ingredients = await getAll('ingredient')
    const ingredientMap = {}
    for (const ing of ingredients) ingredientMap[ing._id] = ing

    const r = recipeRes.data
    const calc = calcRecipe(r, ingredientMap)
    return {
      code: 'OK',
      data: {
        _id: r._id,
        name: r.name,
        imageUrl: r.imageUrl || '',
        desc: r.desc || '',
        videoChannelId: r.videoChannelId || '',
        ingredientList: calc.detail,
        summary: {
          totalCalories: calc.totalCalories,
          totalPrice: calc.totalPrice,
          totalProtein: calc.totalProtein,
          totalFat: calc.totalFat,
          totalCarbohydrate: calc.totalCarbohydrate,
          ingredientCount: calc.detail.length
        }
      }
    }
  }

  // ---- 一次性迁移：imageUrl 的 https CDN 地址 → cloud:// fileID（小程序免域名白名单，绕开存储桶公有读限制） ----
  if (action === 'migrateImageUrl') {
    const _ = db.command
    const res = await db.collection('ingredient').where({ imageUrl: _.neq('') }).limit(100).get()
    let n = 0
    await Promise.all(res.data.map(async d => {
      const m = String(d.imageUrl).match(/\.tcb\.qcloud\.la\/(.+)$/)
      if (!m) return
      await db.collection('ingredient').doc(d._id).update({
        data: { imageUrl: 'cloud://letsdoenv-d1gndgyhv2f9d22fb.6c65-letsdoenv-d1gndgyhv2f9d22fb-1507384605/' + m[1] }
      })
      n++
    }))
    return { code: 'OK', migrated: n }
  }

  // ---- 随机食材：主食基底 + 配菜（不含佐料），组合出菜名；dishType 可选 noodle/rice/sandwich/stirfry ----
  if (action === 'randomDish') {
    const { dishType } = event || {}
    const ingredients = await getAll('ingredient')
    // 真主食基底（排除面粉/淀粉这类原材料）
    const NOT_STAPLE_BASE = ['面粉', '淀粉']
    let staplePool = ingredients.filter(i => i.isStaple && i.name && !NOT_STAPLE_BASE.includes(i.name))
    // 配菜池：排除佐料/主食，炒菜模式额外排除饮品/汤品/甜品
    const DRINK_OR_SOUP = ['豆浆', '牛奶', '酸奶', '果汁', '汤', '冰淇淋', '蜂蜜', '糖浆']
    const sidePool = ingredients.filter(i => !i.isCondiment && !i.isStaple && !i.isAlcohol && !i.isDrink && i.name && !DRINK_OR_SOUP.some(d => i.name.includes(d)))

    const NOODLE_STAPLES = ['面条', '手擀面', '乌冬面', '荞麦面', '意大利面', '粉丝']
    const BREAD_STAPLES = ['吐司面包', '全麦面包']
    if (dishType === 'noodle') staplePool = staplePool.filter(i => NOODLE_STAPLES.includes(i.name))
    else if (dishType === 'rice') staplePool = staplePool.filter(i => i.name === '米饭')
    else if (dishType === 'sandwich') staplePool = staplePool.filter(i => BREAD_STAPLES.includes(i.name))

    const isStirfry = dishType === 'stirfry' // 炒菜：无主食，纯配菜组合
    if (!sidePool.length || (!isStirfry && !staplePool.length)) return { code: 'NO_DATA', message: '食材库数据不足' }

    const pick = arr => arr[Math.floor(Math.random() * arr.length)]

    // 主食基底 1 种（炒菜模式除外）
    const staple = isStirfry ? null : pick(staplePool)

    // 配菜洗牌后抽取（炒菜 2~4 种，其余 1~4 种）
    const shuffled = sidePool.slice().sort(() => Math.random() - 0.5)
    const sideCount = isStirfry ? 2 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 4)
    const sides = shuffled.slice(0, Math.min(sideCount, shuffled.length))

    const mk = (i, w) => {
      const r = w / 100
      return {
        ingredientId: i._id,
        name: i.name,
        weight: w,
        calories: (Number(i.calories) || 0) * r,
        protein: (Number(i.protein) || 0) * r,
        fat: (Number(i.fat) || 0) * r,
        carbohydrate: (Number(i.carbohydrate) || 0) * r,
        price: (Number(i.price) || 0) * (w / 500), // 价格基准：元/斤
        imageUrl: i.imageUrl || '',
        isAlcohol: !!i.isAlcohol,
        isDrink: !!i.isDrink
      }
    }
    const list = sides.map(i => mk(i, (8 + Math.floor(Math.random() * 8)) * 10)) // 配菜 80~150g
    if (staple) list.push(mk(staple, (15 + Math.floor(Math.random() * 16)) * 10)) // 主食 150~300g
    const totalCalories = list.reduce((s, x) => s + x.calories, 0)
    const totalProtein = list.reduce((s, x) => s + x.protein, 0)
    const totalFat = list.reduce((s, x) => s + x.fat, 0)
    const totalCarbohydrate = list.reduce((s, x) => s + x.carbohydrate, 0)
    const totalPrice = list.reduce((s, x) => s + x.price, 0)

    // 菜名：按主食类型分做法词，避免「上汤…馒头」这类不通顺的组合
    const MIX_STAPLES = ['米饭', '面条', '手擀面', '乌冬面', '荞麦面', '意大利面', '粉丝']
    const MIX_METHODS = ['蒜蓉', '清炒', '香煎', '红烧', '凉拌', '酱爆', '葱爆', '干煸']
    const SIDE_METHODS = ['椒盐', '蜜汁', '香煎', '蒜香', '奶香', '葱香', '焦香']
    const STAPLE_WORD = { '米饭': '盖饭', '面条': '拌面', '手擀面': '拌面', '乌冬面': '拌面', '荞麦面': '拌面', '意大利面': '意面', '粉丝': '粉丝煲', '馒头': '馒头片', '吐司面包': '吐司', '全麦面包': '全麦吐司' }
    const CN_NUM = ['二', '三', '四']
    let dishName
    if (isStirfry) {
      const method = pick(MIX_METHODS)
      dishName = sides.length === 1 ? `${method}${sides[0].name}` : `${method}${sides[0].name}炒${sides[1].name}`
    } else if (dishType === 'sandwich') {
      const inner = sides.slice(0, 2).map(s => s.name).join('')
      dishName = `${inner}${STAPLE_WORD[staple.name] ? STAPLE_WORD[staple.name].replace('吐司', '') : ''}三明治`
    } else if (MIX_STAPLES.includes(staple.name)) {
      const stapleWord = STAPLE_WORD[staple.name] || staple.name
      const method = pick(MIX_METHODS)
      if (sides.length === 1) dishName = `${method}${sides[0].name}${stapleWord}`
      else if (sides.length === 2) dishName = `${method}${sides[0].name}${Math.random() < 0.5 ? '炒' : '配'}${sides[1].name}${stapleWord}`
      else dishName = `${method}${sides[0].name}等${CN_NUM[sides.length - 2]}拼${stapleWord}`
    } else {
      const stapleWord = STAPLE_WORD[staple.name] || staple.name
      const method = pick(SIDE_METHODS)
      const rest = sides.slice(1)
      const extra = rest.length ? '、' + rest.slice(0, 2).map(s => s.name).join('、') + (rest.length > 2 ? '等' : '') : ''
      dishName = `${method}${stapleWord}配${sides[0].name}${extra}`
    }

    return {
      code: 'OK',
      data: {
        dishName,
        ingredientList: list.map(x => ({ ...x, calories: Math.round(x.calories), protein: +x.protein.toFixed(1), fat: +x.fat.toFixed(1), carbohydrate: +x.carbohydrate.toFixed(1), price: +x.price.toFixed(1) })),
        summary: {
          totalCalories: Math.round(totalCalories),
          totalProtein: +totalProtein.toFixed(1),
          totalFat: +totalFat.toFixed(1),
          totalCarbohydrate: +totalCarbohydrate.toFixed(1),
          totalPrice: +totalPrice.toFixed(1),
          ingredientCount: list.length,
          totalWeight: list.reduce((s, x) => s + x.weight, 0)
        }
      }
    }
  }

  // ---- 随机调酒：3~4 种基酒混合（每种 ≤30ml）+ 辅料组合一杯；baseLiquor 可选指定主基酒名（如「伏特加」），空则全池随机 ----
  if (action === 'randomCocktail') {
    const { baseLiquor } = event || {}
    const ingredients = await getAll('ingredient')

    // 基酒池：真基酒 / 力娇酒（可乐、汤力水、冰块这类调酒辅料虽标了 isAlcohol，但不作基酒）
    const BASE_NAMES = ['伏特加', '金酒', '朗姆酒', '椰子朗姆酒', '龙舌兰', '威士忌', '白兰地', '白酒', '二锅头', '清酒', '梅酒', '绍兴黄酒', '橙味利口酒', '蓝橙力娇酒', '咖啡利口酒', '奶油利口酒', '杏仁利口酒', '蜜桃利口酒', '蜜瓜利口酒', '干味美思', '甜味美思', '金巴利']
    const basePool = ingredients.filter(i => BASE_NAMES.includes(i.name))
    if (baseLiquor && !basePool.some(i => i.name === baseLiquor)) return { code: 'NO_DATA', message: '暂无该基酒，换个试试' }
    if (basePool.length < 3) return { code: 'NO_DATA', message: '基酒数据不足' }

    // 辅料池：按名字白名单匹配（饮料类 + 常见调酒配料）
    const MIXER_NAMES = ['可乐', '汤力水', '苏打水', '糖浆', '菠萝汁', '椰浆', '薄荷', '冰块', '苦精', '柠檬', '柠檬汁', '青柠', '青柠汁', '橙子', '橙汁', '牛奶', '蜂蜜', '干姜水', '抹茶粉']
    const mixerPool = ingredients.filter(i => MIXER_NAMES.includes(i.name))
    if (!mixerPool.length) return { code: 'NO_DATA', message: '辅料数据不足' }

    // 基酒 3~4 种混合（参考长岛冰茶）；指定主基酒时必含且排首位
    const shuffledBases = basePool.slice().sort(() => Math.random() - 0.5)
    const baseCount = Math.min(3 + Math.floor(Math.random() * 2), shuffledBases.length)
    let bases = shuffledBases.slice(0, baseCount)
    if (baseLiquor) {
      const specified = basePool.find(i => i.name === baseLiquor)
      bases = [specified].concat(shuffledBases.filter(i => i.name !== baseLiquor)).slice(0, baseCount)
    }
    const mainBase = bases[0]

    // 辅料洗牌后抽 1~3 种
    const shuffledMixers = mixerPool.slice().sort(() => Math.random() - 0.5)
    const mixerCount = 1 + Math.floor(Math.random() * 3)
    const mixers = shuffledMixers.slice(0, Math.min(mixerCount, shuffledMixers.length))

    // 各辅料用量（g/ml）：液体 90~150，果汁 45~90，糖浆 10~20，椰浆 30~60，薄荷 5~10，苦精 2~3，柠檬 10~30，冰块 50~100
    const mixerWeight = name => {
      if (['可乐', '汤力水', '苏打水', '干姜水'].includes(name)) return 90 + Math.floor(Math.random() * 61)
      if (['菠萝汁', '橙汁', '牛奶'].includes(name)) return 45 + Math.floor(Math.random() * 46)
      if (name === '糖浆') return 10 + Math.floor(Math.random() * 11)
      if (name === '椰浆') return 30 + Math.floor(Math.random() * 31)
      if (name === '薄荷') return 5 + Math.floor(Math.random() * 6)
      if (name === '苦精') return 2 + Math.floor(Math.random() * 2)
      if (['柠檬', '青柠', '橙子'].includes(name)) return 10 + Math.floor(Math.random() * 21)
      if (name === '冰块') return 50 + Math.floor(Math.random() * 51)
      return 30 + Math.floor(Math.random() * 31)
    }

    const mk = (i, w) => {
      const r = w / 100
      return {
        ingredientId: i._id,
        name: i.name,
        weight: w,
        calories: (Number(i.calories) || 0) * r,
        protein: (Number(i.protein) || 0) * r,
        fat: (Number(i.fat) || 0) * r,
        carbohydrate: (Number(i.carbohydrate) || 0) * r,
        price: (Number(i.price) || 0) * (w / 500), // 价格基准：元/斤
        imageUrl: i.imageUrl || '',
        isAlcohol: !!i.isAlcohol,
        isDrink: !!i.isDrink
      }
    }

    // 每种基酒 10~30ml（均不超过 30ml）
    const list = bases.map(b => mk(b, 10 + Math.floor(Math.random() * 21)))
    for (const m of mixers) list.push(mk(m, mixerWeight(m.name)))

    const totalCalories = list.reduce((s, x) => s + x.calories, 0)
    const totalProtein = list.reduce((s, x) => s + x.protein, 0)
    const totalFat = list.reduce((s, x) => s + x.fat, 0)
    const totalCarbohydrate = list.reduce((s, x) => s + x.carbohydrate, 0)
    const totalPrice = list.reduce((s, x) => s + x.price, 0)

    // 酒名：按主基酒 + 辅料组合起名，朗朗上口优先
    const has = n => mixers.some(m => m.name.includes(n))
    let cocktailName
    if (has('可乐')) cocktailName = `${mainBase.name}可乐`
    else if (has('汤力水')) cocktailName = `${mainBase.name}汤力`
    else if (has('苏打水') || has('干姜水')) cocktailName = `${mainBase.name}海波`
    else if (has('菠萝汁') && has('椰浆')) cocktailName = `${mainBase.name}椰林`
    else if (has('椰浆')) cocktailName = `${mainBase.name}椰香特调`
    else if ((has('柠檬') || has('青柠')) && has('糖浆')) cocktailName = `${mainBase.name}酸酒`
    else if (has('薄荷')) cocktailName = `${mainBase.name}莫吉多`
    else if (has('苦精')) cocktailName = `${mainBase.name}古典`
    else if (has('冰块') && mixers.length === 1) cocktailName = `${mainBase.name}加冰`
    else cocktailName = `${mainBase.name}${mixers[0].name.replace(/汁$/, '')}特调`

    return {
      code: 'OK',
      data: {
        dishName: cocktailName,
        ingredientList: list.map(x => ({ ...x, calories: Math.round(x.calories), protein: +x.protein.toFixed(1), fat: +x.fat.toFixed(1), carbohydrate: +x.carbohydrate.toFixed(1), price: +x.price.toFixed(1) })),
        summary: {
          totalCalories: Math.round(totalCalories),
          totalProtein: +totalProtein.toFixed(1),
          totalFat: +totalFat.toFixed(1),
          totalCarbohydrate: +totalCarbohydrate.toFixed(1),
          totalPrice: +totalPrice.toFixed(1),
          ingredientCount: list.length,
          totalWeight: list.reduce((s, x) => s + x.weight, 0)
        }
      }
    }
  }

  // ---- 食材库列表（菜品库 Tab 用）----
  if (action === 'listIngredients') {
    const { keyword, category } = event || {}
    let all = await getAll('ingredient')
    // 分类筛选：meat 肉类 / veg 蔬菜 / staple 主食 / condiment 调料 / drink 饮品 / seafood 海鲜 / alcohol 酒类 / other 其他
    const groups = {
      meat: i => !i.isStaple && !i.isCondiment && ['猪肉','牛肉','羊肉','鸭肉','鸡肉','火腿','香肠','培根','五花肉','里脊','鸡腿','鸡翅','鸡肉','火腿','香肠','培根'].some(k => i.name.includes(k)) || ['meat','chicken','beef','pork','lamb','duck','bacon','ham','sausage'].some(k => String(i.imageUrl || '').toLowerCase().includes(k)),
      seafood: i => ['鱼','虾','蟹','贝','鱿','蚌','扇贝','生蚝','三文鱼','带鱼','鳕鱼','草鱼','鲈鱼','基围虾','虾仁','鱿鱼'].some(k => i.name.includes(k)) || ['fish','shrimp','cod','salmon','carp','squid'].some(k => String(i.imageUrl || '').toLowerCase().includes(k)),
      veg: i => !i.isStaple && !i.isCondiment && !i.isDrink,
      staple: i => !!i.isStaple,
      condiment: i => !!i.isCondiment,
      drink: i => !!i.isDrink,
      alcohol: i => !!i.isAlcohol
    }
    if (category && groups[category]) {
      all = all.filter(groups[category])
    } else if (!category) {
      // 食材 Tab 默认排除酒类（酒有独立 Tab）
      all = all.filter(i => !i.isAlcohol)
    }
    const kw = String(keyword || '').trim().toLowerCase()
    if (kw) all = all.filter(i => (i.name || '').toLowerCase().includes(kw))
    return {
      code: 'OK',
      data: all.map(i => ({
        _id: i._id,
        name: i.name,
        imageUrl: i.imageUrl || '',
        calories: Number(i.calories) || 0,
        protein: Number(i.protein) || 0,
        fat: Number(i.fat) || 0,
        carbohydrate: Number(i.carbohydrate) || 0,
        price: Number(i.price) || 0,
        isCondiment: !!i.isCondiment,
        isStaple: !!i.isStaple,
        isAlcohol: !!i.isAlcohol
      }))
    }
  }

  // ---- 食材详情：营养/价格 + 用到它的菜品列表（食材详情页用）----
  if (action === 'ingredientDetail') {
    const { ingredientId } = event || {}
    if (!ingredientId || typeof ingredientId !== 'string' || ingredientId.length > 64) {
      return { code: 'INVALID_PARAM', message: 'ingredientId 非法' }
    }
    const ingRes = await db.collection('ingredient').doc(ingredientId).get().catch(() => null)
    if (!ingRes || !ingRes.data) {
      return { code: 'NOT_FOUND', message: '食材不存在' }
    }
    const [ingredients, recipes] = await Promise.all([getAll('ingredient'), getAll('recipe')])
    const ingredientMap = {}
    for (const x of ingredients) ingredientMap[x._id] = x

    const i = ingRes.data
    const recipeList = recipes
      .filter(r => (r.ingredientList || []).some(it => it.ingredientId === ingredientId))
      .map(r => {
        const calc = calcRecipe(r, ingredientMap)
        const usage = (r.ingredientList || []).find(it => it.ingredientId === ingredientId)
        return {
          _id: r._id,
          name: r.name,
          imageUrl: r.imageUrl || '',
          desc: r.desc || '',
          totalCalories: Math.round(calc.totalCalories),
          ingredientWeight: usage ? usage.weight : 0
        }
      })

    return {
      code: 'OK',
      data: {
        _id: i._id,
        name: i.name,
        imageUrl: i.imageUrl || '',
        calories: Number(i.calories) || 0,
        protein: Number(i.protein) || 0,
        fat: Number(i.fat) || 0,
        carbohydrate: Number(i.carbohydrate) || 0,
        price: Number(i.price) || 0,               // 元/斤（500g）
        pricePer100g: (Number(i.price) || 0) / 5,
        nutritionDesc: i.nutritionDesc || '',
        isCondiment: !!i.isCondiment,
        isStaple: !!i.isStaple,
        isDrink: !!i.isDrink,
        isVegetable: !!i.isVegetable,
        recipeList
      }
    }
  }

  return { code: 'INVALID_PARAM', message: 'action 仅支持 list / detail / listIngredients / ingredientDetail / filterOptions / randomDish / randomCocktail' }
}
