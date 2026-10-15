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
    const [ingredients, recipes] = await Promise.all([getAll('ingredient'), getAll('recipe')])
    const ingredientMap = {}
    for (const ing of ingredients) ingredientMap[ing._id] = ing

    const list = recipes.map(r => {
      const calc = calcRecipe(r, ingredientMap)
      return {
        _id: r._id,
        name: r.name,
        imageUrl: r.imageUrl || '',
        desc: r.desc || '',
        totalCalories: calc.totalCalories,
        ingredientCount: calc.detail.length,
        isStaple: calc.detail.some(d => d.isStaple)
      }
    })
    return { code: 'OK', data: list }
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

  return { code: 'INVALID_PARAM', message: 'action 仅支持 list / detail / filterOptions' }
}
