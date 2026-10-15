// 文件路径：cloudfunctions/generateMenu/index.js
// 云函数：generateMenu 随机菜单生成
// 入参：mode（heatLimit 热量限定 / fullRandom 完全随机）
//       heatLimit 模式附带 minCal、maxCal、excludeIngredientIdList（忌口食材 _id 数组）
// 说明：菜谱营养 / 价格全部基于 ingredient 食材库（每 100g 数据）按配比实时计算
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 单次试算最大次数，防止极端条件下死循环
const MAX_TRY = 200

// 读取集合全部数据（小程序云函数单次 limit 100，做分批兜底）
async function getAll(collection) {
  const MAX = 100
  const countRes = await db.collection(collection).count()
  const total = countRes.total
  const tasks = []
  for (let i = 0; i < total; i += MAX) {
    tasks.push(db.collection(collection).skip(i).limit(MAX).get())
  }
  const results = await Promise.all(tasks)
  return results.reduce((acc, cur) => acc.concat(cur.data), [])
}

// 基于食材库计算单份菜谱的营养 / 价格汇总
function calcRecipe(recipe, ingredientMap) {
  const detail = []
  let totalCalories = 0
  let totalPrice = 0
  let totalProtein = 0
  let totalFat = 0
  let totalCarbohydrate = 0
  let stapleWeight = 0 // 主食类食材总重量（完全随机模式校验用）

  for (const item of recipe.ingredientList || []) {
    const ing = ingredientMap[item.ingredientId]
    if (!ing) continue // 食材已被删除时跳过
    const ratio = item.weight / 100 // 统一基准：每 100g
    totalCalories += ing.calories * ratio
    totalPrice += ing.price * ratio
    totalProtein += ing.protein * ratio
    totalFat += ing.fat * ratio
    totalCarbohydrate += ing.carbohydrate * ratio
    if (ing.isStaple) stapleWeight += item.weight
    detail.push({
      ingredientId: ing._id,
      name: ing.name,
      weight: item.weight,
      caloriesPer100g: ing.calories,
      calories: ing.calories * ratio,
      nutritionDesc: ing.nutritionDesc || '',
      isStaple: !!ing.isStaple,
      isVegetable: !!ing.isVegetable
    })
  }

  return {
    _id: recipe._id,
    name: recipe.name,
    imageUrl: recipe.imageUrl || '',
    desc: recipe.desc || '',
    videoChannelId: recipe.videoChannelId || '',
    ingredientList: detail,
    ingredientSummary: detail.map(d => d.name).join(' · '),
    isStaple: detail.some(d => d.isStaple),
    stapleWeight,
    totalCalories,
    totalPrice,
    totalProtein,
    totalFat,
    totalCarbohydrate
  }
}

// 随机打乱数组
function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { mode, minCal, maxCal, excludeIngredientIdList } = event || {}

  // ---- 入参校验，拦截非法查询 ----
  if (mode !== 'heatLimit' && mode !== 'fullRandom') {
    return { code: 'INVALID_PARAM', message: 'mode 仅支持 heatLimit / fullRandom' }
  }
  if (mode === 'heatLimit') {
    const min = Number(minCal)
    const max = Number(maxCal)
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 5000 || min > max) {
      return { code: 'INVALID_PARAM', message: '热量区间非法' }
    }
    if (excludeIngredientIdList !== undefined && !Array.isArray(excludeIngredientIdList)) {
      return { code: 'INVALID_PARAM', message: 'excludeIngredientIdList 必须为数组' }
    }
  }

  // ---- 读取食材库 + 菜谱库 ----
  const [ingredients, recipes] = await Promise.all([getAll('ingredient'), getAll('recipe')])
  if (!recipes.length) {
    return { code: 'NO_MATCH', message: '菜谱库为空，请先在云开发控制台录入菜谱' }
  }
  const ingredientMap = {}
  for (const ing of ingredients) ingredientMap[ing._id] = ing

  // ---- 预计算每道菜谱的营养汇总 ----
  let pool = recipes.map(r => calcRecipe(r, ingredientMap))

  // ---- 热量限定模式：前置过滤包含忌口食材的菜谱 ----
  if (mode === 'heatLimit' && Array.isArray(excludeIngredientIdList) && excludeIngredientIdList.length) {
    const banSet = new Set(excludeIngredientIdList)
    pool = pool.filter(r => !r.ingredientList.some(d => banSet.has(d.ingredientId)))
  }
  if (pool.length < 2) {
    return { code: 'NO_MATCH', message: '暂无符合条件菜谱，请放宽筛选条件' }
  }

  // ---- 循环试算，随机组合 2~4 道菜谱 ----
  const min = Number(minCal)
  const max = Number(maxCal)
  let picked = null

  for (let i = 0; i < MAX_TRY; i++) {
    const k = 2 + Math.floor(Math.random() * 3) // 2~4 道
    if (pool.length < k) continue
    const combo = shuffle(pool).slice(0, k)
    const sumCalories = combo.reduce((s, r) => s + r.totalCalories, 0)

    if (mode === 'heatLimit') {
      // 整套总热量需落在用户设定区间
      if (sumCalories >= min && sumCalories <= max) {
        picked = combo
        break
      }
    } else {
      // 完全随机模式：组合内主食食材总重量 >= 50g
      const staple = combo.reduce((s, r) => s + r.stapleWeight, 0)
      if (staple >= 50) {
        picked = combo
        break
      }
    }
  }

  if (!picked) {
    return { code: 'NO_MATCH', message: '暂无符合条件菜谱，请放宽筛选条件（取消部分忌口或扩大热量区间）' }
  }

  // ---- 汇总整套菜单 ----
  const summary = {
    totalCalories: picked.reduce((s, r) => s + r.totalCalories, 0),
    totalPrice: picked.reduce((s, r) => s + r.totalPrice, 0),
    totalProtein: picked.reduce((s, r) => s + r.totalProtein, 0),
    totalFat: picked.reduce((s, r) => s + r.totalFat, 0),
    totalCarbohydrate: picked.reduce((s, r) => s + r.totalCarbohydrate, 0)
  }

  // ---- 保存菜单历史记录，绑定当前用户 openid ----
  await db.collection('menu_record').add({
    data: {
      openid: OPENID,
      createTime: db.serverDate(),
      recipeIdList: picked.map(r => r._id),
      totalCalories: summary.totalCalories,
      totalPrice: summary.totalPrice,
      totalProtein: summary.totalProtein,
      totalFat: summary.totalFat,
      totalCarbohydrate: summary.totalCarbohydrate
    }
  })

  return { code: 'OK', data: { recipes: picked, summary } }
}
