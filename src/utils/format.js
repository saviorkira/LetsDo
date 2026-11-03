// 文件路径：src/utils/format.js
// 通用格式化工具：重量 / 价格 / 单位等

// 判断食材是否应为液体计量单位（ml）：酒 / 饮料 / 辅料（可乐、苏打水、糖浆等）
// 规则：isAlcohol || isDrink → ml；否则 → g
// 注意：食材库里辅料（可乐、冰块、柠檬汁等）通常没标 isDrink，随机调酒也会用，
//      所以额外靠 name 黑名单兜底覆盖
const LIQUID_NAME_HINTS = new Set([
  '可乐', '汤力水', '苏打水', '干姜水', '菠萝汁', '橙汁', '柠檬汁', '青柠汁',
  '椰浆', '糖浆', '牛奶', '豆浆', '蜂蜜', '苦精', '冰块', '鸡尾酒'
])

/**
 * @param {object} ing - 食材对象（来自 ingredientList / calcItem 等）
 * @returns {string} "ml" 或 "g"
 */
export function weightUnit(ing) {
  if (!ing) return 'g'
  if (ing.isAlcohol || ing.isDrink) return 'ml'
  if (ing.name && LIQUID_NAME_HINTS.has(ing.name)) return 'ml'
  return 'g'
}

/**
 * 格式化为 "80g" / "30ml" 字符串
 */
export function formatWeight(ing) {
  if (!ing) return ''
  return `${ing.weight}${weightUnit(ing)}`
}

/**
 * 营养基准单位（kcal/100g vs kcal/100ml），用于计算过程公式展示
 */
export function calorieUnit(ing) {
  return weightUnit(ing) === 'ml' ? 'kcal/100ml' : 'kcal/100g'
}
