// 文件路径：cloudfunctions/generateMenu/index.js
// 云函数：generateMenu 随机菜单生成
// 入参：mode（heatLimit 热量限定 / fullRandom 完全随机）
//       heatLimit 模式附带 minCal、maxCal、excludeIngredientIdList（忌口食材 _id 数组）
// 说明：菜谱营养 / 价格全部基于 ingredient 食材库（每 100g 数据）按配比实时计算
// 优化：双层 try/catch 兜底防无响应；暴力随机改为「前置筛选 + 贪心随机」
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 单次试算最大次数（优化后每次命中概率高，保留安全上限）
const MAX_TRY = 60

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

// 进程内缓存：云函数实例复用期间（同一热实例）直接命中，避免每次重复拉全表
// 食材/菜谱属于低频变更数据，60s TTL 足够；这是「点第二次几乎秒回」的关键
const CACHE_TTL = 60000
let dataCache = { at: 0, ingredients: null, recipes: null }

async function loadDietData() {
  const now = Date.now()
  if (dataCache.at && now - dataCache.at < CACHE_TTL && dataCache.ingredients && dataCache.recipes) {
    return dataCache
  }
  const [ingredients, recipes] = await Promise.all([getAll('ingredient'), getAll('recipe')])
  dataCache = { at: now, ingredients, recipes }
  return dataCache
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
    const ratio = item.weight / 100 // 营养基准：每 100g
    totalCalories += ing.calories * ratio
    totalPrice += ing.price * (item.weight / 500) // 价格基准：ingredient.price 为元/斤（500g）
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
      isVegetable: !!ing.isVegetable,
      // 液体类（酒 / 饮料）前端按 ml 显示，固体按 g
      isAlcohol: !!ing.isAlcohol,
      isDrink: !!ing.isDrink
    })
  }

  return {
    _id: recipe._id,
    name: recipe.name,
    imageUrl: recipe.imageUrl || '',
    desc: recipe.desc || '',
    videoChannelId: recipe.videoChannelId || '',
    isAlcohol: !!recipe.isAlcohol,
    isDrink: !!recipe.isDrink,
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

// 从数组中随机取 k 个不重复元素（部分 Fisher-Yates，比全量 shuffle 省一半）
function sampleK(arr, k) {
  if (k >= arr.length) return arr.slice()
  const a = arr.slice()
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (a.length - i))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, k)
}

// 贪心随机：pool 按热量升序排列后，选取 k 个使总和落在 [min, max]
// 策略：随机取一个起点 dish，然后对剩余 k-1 个 dish 从 pool 中在「热量窗口」内随机挑选
function greedyRandomCombo(poolAsc, k, min, max) {
  const n = poolAsc.length
  if (n < k) return null

  // 先排除「单道菜就超 max」的 dish
  const feasiblePool = poolAsc.filter(r => r.totalCalories <= max)
  if (feasiblePool.length < k) return null

  // 第 1 道：热量较高的起点（给后面留空间的同时保证方差足够）
  const minStartCal = min - (k - 1) * feasiblePool[0].totalCalories // 后续 k-1 道至少都 >= 最低热量
  // 对「起点热量 <= max - (k-1)*最低热量」的 dish 随机选
  const maxStartCal = max - (k - 1) * feasiblePool[0].totalCalories

  // 收集可以作为起点的 dish 范围
  let startIdxLow = 0, startIdxHigh = feasiblePool.length - 1
  for (let i = 0; i < feasiblePool.length; i++) {
    if (feasiblePool[i].totalCalories >= minStartCal && feasiblePool[i].totalCalories <= maxStartCal) {
      startIdxLow = i
      break
    }
  }
  for (let i = feasiblePool.length - 1; i >= 0; i--) {
    if (feasiblePool[i].totalCalories <= maxStartCal) {
      startIdxHigh = i
      break
    }
  }
  if (startIdxLow > startIdxHigh) return null

  const startIdx = startIdxLow + Math.floor(Math.random() * (startIdxHigh - startIdxLow + 1))
  const picked = [feasiblePool[startIdx]]
  let sum = picked[0].totalCalories
  let remaining = feasiblePool.filter((_, i) => i !== startIdx)

  // 对剩余 k-1 道，用贪心 + 随机策略
  for (let slot = 1; slot < k; slot++) {
    if (!remaining.length) return null
    const need = k - slot                 // 还需要的 dish 数（含当前）
    const budgetMax = max - sum           // 当前剩余预算
    const budgetMin = min - sum           // 当前剩余下限

    // 最后一道：必须让 sum + cal 在 [min, max]
    // 倒数第二道起：要保证剩下的 need-1 个 dish 能填进 [min-sum-cal, max-sum-cal]
    let candidateLow = 0
    let candidateHigh = remaining.length - 1

    // 找出热量在合理范围的 dish
    // 当前 dish 的最低热量：至少让 (need-1) 个最低热量 dish 能填满 budget
    const floor = need - 1
    const budgetMinForRest = remaining[0].totalCalories * floor
    const calMinForCurrent = Math.max(remaining[0].totalCalories, budgetMin - budgetMinForRest)

    // 当前 dish 的最高热量：不能让后续 need-1 个最高热量 dish 超预算
    // 简化：calMaxForCurrent <= budgetMax - (need-1)*最低热量（确保后续至少有空间）
    const calMaxForCurrent = budgetMax - (need - 1) * remaining[0].totalCalories

    // 在 remaining（已升序）中二分查找 calMinForCurrent 和 calMaxForCurrent 的边界
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].totalCalories >= calMinForCurrent) { candidateLow = i; break }
      candidateLow = i + 1
    }
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (remaining[i].totalCalories <= calMaxForCurrent) { candidateHigh = i; break }
      candidateHigh = i - 1
    }

    if (candidateLow > candidateHigh) return null

    const pickIdx = candidateLow + Math.floor(Math.random() * (candidateHigh - candidateLow + 1))
    picked.push(remaining[pickIdx])
    sum += remaining[pickIdx].totalCalories
    remaining.splice(pickIdx, 1)
  }

  // 最终校验（因边界四舍五入可能有 1-2 kcal 误差）
  if (sum >= min && sum <= max) return picked
  return null
}

exports.main = async (event) => {
  try {
    return await doMain(event)
  } catch (e) {
    console.error('[generateMenu] 顶层异常:', e && e.stack || e)
    return { code: 'INTERNAL_ERROR', message: '服务器开小差了，请稍后再试', error: e && e.message }
  }
}

async function doMain(event) {
  const { OPENID } = cloud.getWXContext()
  const { mode, minCal, maxCal, excludeIngredientIdList, includeAlcohol, includeDrink, calLimit } = event || {}

  // ---- 入参校验，拦截非法查询 ----
  if (mode !== 'heatLimit' && mode !== 'fullRandom') {
    return { code: 'INVALID_PARAM', message: 'mode 仅支持 heatLimit / fullRandom' }
  }
  // calLimit 默认 true；显式传 false 时 heatLimit 模式跳过热量区间校验，随机 2~4 道
  const limitCal = calLimit !== false
  if (mode === 'heatLimit' && limitCal) {
    const min = Number(minCal)
    const max = Number(maxCal)
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 5000 || min > max) {
      return { code: 'INVALID_PARAM', message: '热量区间非法' }
    }
    if (excludeIngredientIdList !== undefined && !Array.isArray(excludeIngredientIdList)) {
      return { code: 'INVALID_PARAM', message: 'excludeIngredientIdList 必须为数组' }
    }
  }

  // ---- 读取食材库 + 菜谱库（进程内 60s 缓存，热实例秒回）----
  const { ingredients, recipes } = await loadDietData()
  if (!recipes.length) {
    return { code: 'NO_MATCH', message: '菜谱库为空，请先在云开发控制台录入菜谱' }
  }
  const ingredientMap = {}
  for (const ing of ingredients) ingredientMap[ing._id] = ing

  // ---- 预计算每道菜谱的营养汇总；菜谱池拆「菜品」和「饮品」两类，饮品（酒 / 饮料）只在勾选搭配时才额外搭配 ----
  const allCalc = recipes.map(r => calcRecipe(r, ingredientMap))
  let pool = allCalc.filter(r => !r.isAlcohol && !r.isDrink)
  const alcoholPool = allCalc.filter(r => r.isAlcohol)
  const drinkPool = allCalc.filter(r => r.isDrink)
  // 旧版客户端只传 includeAlcohol（含义是「搭配 1 杯饮品」，不分酒/饮料），保留原行为
  const legacyDrinkMode = includeDrink === undefined

  // ---- 热量限定模式：前置过滤包含忌口食材的菜谱 ----
  if (mode === 'heatLimit' && Array.isArray(excludeIngredientIdList) && excludeIngredientIdList.length) {
    const banSet = new Set(excludeIngredientIdList)
    pool = pool.filter(r => !r.ingredientList.some(d => banSet.has(d.ingredientId)))
  }
  if (pool.length < 2) {
    return { code: 'NO_MATCH', message: '暂无符合条件菜谱，请放宽筛选条件' }
  }

  // ---- 升序排列，后续贪心随机依赖有序池 ----
  pool.sort((a, b) => a.totalCalories - b.totalCalories)

  const min = Number(minCal)
  const max = Number(maxCal)
  let picked = null

  if (mode === 'heatLimit' && limitCal) {
    // 前置排除：单道菜就超过 max 的 dish 不可能出现在任何组合里
    const feasible = pool.filter(r => r.totalCalories <= max)
    if (feasible.length < 2) {
      return { code: 'NO_MATCH', message: '热量上限过低，单道菜就已超出，请提高热量上限' }
    }
    pool = feasible

    // 贪心随机：MAX_TRY 里每个 k 试几次，找到即停
    for (let k = 2; k <= 4 && !picked; k++) {
      const triesPerK = Math.ceil(MAX_TRY / 3)
      for (let t = 0; t < triesPerK; t++) {
        picked = greedyRandomCombo(pool, k, min, max)
        if (picked) break
      }
    }
  } else if (mode === 'heatLimit' && !limitCal) {
    // 不限热量：随机 2~4 道即可（含主食兜底，保证是一顿饭）
    for (let t = 0; t < MAX_TRY && !picked; t++) {
      const k = 2 + Math.floor(Math.random() * 3)
      if (pool.length < k) continue
      const combo = sampleK(pool, k)
      const staple = combo.reduce((s, r) => s + r.stapleWeight, 0)
      if (staple >= 50) picked = combo
    }
    // 极端兜底：全池主食不足 50g 也直接拿
    if (!picked) picked = sampleK(pool, Math.min(3, pool.length))
  } else {
    // 完全随机模式：贪心随机 + 兜底 fallback
    for (let t = 0; t < MAX_TRY && !picked; t++) {
      const k = 2 + Math.floor(Math.random() * 3)
      if (pool.length < k) continue
      const combo = sampleK(pool, k)
      const staple = combo.reduce((s, r) => s + r.stapleWeight, 0)
      if (staple >= 50) picked = combo
    }
  }

  // ---- Fallback：贪心没找到时，退回 sampleK 暴力兜底（heatLimit 模式）----
  if (!picked && mode === 'heatLimit' && limitCal) {
    for (let k = 2; k <= 4 && !picked; k++) {
      for (let t = 0; t < 30; t++) {
        const combo = sampleK(pool, k)
        const sumCalories = combo.reduce((s, r) => s + r.totalCalories, 0)
        if (sumCalories >= min && sumCalories <= max) {
          picked = combo
          break
        }
      }
    }
  }

  if (!picked) {
    return { code: 'NO_MATCH', message: '暂无符合条件菜谱，请放宽筛选条件（取消部分忌口或扩大热量区间）' }
  }

  // ---- 搭配饮品：酒 / 饮料 分别随机 1 个（都勾选则各随机一个，互不重复） ----
  let alcoholPick = null
  let drinkPick = null
  if (legacyDrinkMode) {
    // 旧客户端：按原逻辑从「酒 + 饮料」混合池随机 1 个
    const mixed = alcoholPool.concat(drinkPool)
    if (includeAlcohol && mixed.length) alcoholPick = mixed[Math.floor(Math.random() * mixed.length)]
  } else {
    if (includeAlcohol && alcoholPool.length) alcoholPick = alcoholPool[Math.floor(Math.random() * alcoholPool.length)]
    if (includeDrink && drinkPool.length) drinkPick = drinkPool[Math.floor(Math.random() * drinkPool.length)]
  }
  const extras = [alcoholPick, drinkPick].filter(Boolean)

  // ---- 汇总整套菜单 ----
  const summary = {
    totalCalories: picked.reduce((s, r) => s + r.totalCalories, 0),
    totalPrice: picked.reduce((s, r) => s + r.totalPrice, 0),
    totalProtein: picked.reduce((s, r) => s + r.totalProtein, 0),
    totalFat: picked.reduce((s, r) => s + r.totalFat, 0),
    totalCarbohydrate: picked.reduce((s, r) => s + r.totalCarbohydrate, 0)
  }
  for (const extra of extras) {
    summary.totalCalories += extra.totalCalories
    summary.totalPrice += extra.totalPrice
    summary.totalProtein += extra.totalProtein
    summary.totalFat += extra.totalFat
    summary.totalCarbohydrate += extra.totalCarbohydrate
  }

  // ---- 保存菜单历史记录，绑定当前用户 openid（fire-and-forget，不阻塞 return，避免集合写入拖超时）----
  try {
    Promise.race([
      db.collection('menu_record').add({
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
      }),
      new Promise(resolve => setTimeout(resolve, 800))
    ]).catch(e => console.warn('menu_record 写入失败或超时，跳过保存历史：', e.message))
  } catch (e) {
    console.warn('menu_record 写入异常，跳过保存历史：', e.message)
  }

  return { code: 'OK', data: { recipes: picked, summary, alcohol: alcoholPick, drink: drinkPick } }
}
