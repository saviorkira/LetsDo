// 文件路径：cloudfunctions/recipeService/index.js
// 云函数：recipeService 菜谱查询服务
// 入参 action：
//   list          菜谱库列表（含实时计算的单份热量）
//   detail        菜谱配方详情（展开食材明细 + 整套营养汇总），需 recipeId
//   filterOptions 忌口筛选用食材列表（_id + name）
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
    const ratio = item.weight / 100 // 统一基准：每 100g
    totalCalories += ing.calories * ratio
    totalPrice += ing.price * ratio
    totalProtein += ing.protein * ratio
    totalFat += ing.fat * ratio
    totalCarbohydrate += ing.carbohydrate * ratio
    detail.push({
      ingredientId: ing._id,
      name: ing.name,
      weight: item.weight,
      caloriesPer100g: ing.calories,
      calories: ing.calories * ratio,
      pricePer100g: ing.price,
      price: ing.price * ratio,
      proteinPer100g: ing.protein,
      protein: ing.protein * ratio,
      fatPer100g: ing.fat,
      fat: ing.fat * ratio,
      carbohydratePer100g: ing.carbohydrate,
      carbohydrate: ing.carbohydrate * ratio,
      nutritionDesc: ing.nutritionDesc || '',
      imageUrl: ing.imageUrl || '',
      isStaple: !!ing.isStaple,
      isVegetable: !!ing.isVegetable
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

  // ---- 随机食材：随机抽 2~4 种食材（不含佐料），按做法词组合出菜名 ----
  if (action === 'randomDish') {
    const ingredients = await getAll('ingredient')
    const pool = ingredients.filter(i => !i.isCondiment && i.name)
    if (pool.length < 2) return { code: 'NO_DATA', message: '食材库数据不足' }

    // 洗牌后抽 2~4 种
    const shuffled = pool.slice().sort(() => Math.random() - 0.5)
    const count = Math.min(2 + Math.floor(Math.random() * 3), pool.length)
    const picked = shuffled.slice(0, count)

    const list = picked.map(i => {
      const weight = (8 + Math.floor(Math.random() * 8)) * 10 // 80~150g，10 的倍数
      const ratio = weight / 100
      return { ingredientId: i._id, name: i.name, weight, calories: (Number(i.calories) || 0) * ratio }
    })
    const totalCalories = list.reduce((s, x) => s + x.calories, 0)

    // 菜名：做法词 + 主食材 + （炒/配 + 次食材）
    const METHODS = ['蒜蓉', '清炒', '香煎', '红烧', '凉拌', '白灼', '酱爆', '上汤', '葱爆', '干煸']
    const method = METHODS[Math.floor(Math.random() * METHODS.length)]
    const main = list[0]
    const second = list[1]
    const joiner = Math.random() < 0.5 ? '炒' : '配'
    const dishName = second ? `${method}${main.name}${joiner}${second.name}` : `${method}${main.name}`

    return { code: 'OK', data: { dishName, ingredientList: list, totalCalories } }
  }

  return { code: 'INVALID_PARAM', message: 'action 仅支持 list / detail / filterOptions / randomDish' }
}
