// 文件路径：src/utils/heroStretch.js
// 朋友圈式下拉放大：页面滚动到顶后继续下拉，hero 图从基准高度拉长至图片真实高度，松手弹回
// 仅在下拉时介入；上滑完全交给原生滚动，不做任何拦截
import { ref, computed } from 'vue'
import { onPageScroll } from '@dcloudio/uni-app'

const BASE_H = 440 // rpx，hero 基准高度（与各详情页 CSS 一致）
const MAX_H = 1000 // rpx，放大上限兜底
const DAMP = 0.6 // 下拉阻尼系数

// enabled：可选函数，返回 false 时禁用（如无配图页面）
export function useHeroStretch(enabled) {
  const extra = ref(0) // 下拉产生的额外高度（rpx）
  const dragging = ref(false)
  const naturalH = ref(750) // 图片按 750rpx 宽换算的真实高度，默认方形
  let scrollTop = 0
  let startY = 0
  let rpxPerPx = 2

  const maxH = computed(() => Math.min(Math.max(naturalH.value, BASE_H), MAX_H))
  const heroStyle = computed(() => ({
    height: BASE_H + extra.value + 'rpx',
    transition: dragging.value ? 'none' : 'height 0.3s ease'
  }))

  onPageScroll(e => { scrollTop = (e && e.scrollTop) || 0 })

  function onTouchStart(e) {
    if (enabled && !enabled()) return
    if (scrollTop > 0) return
    const sys = uni.getWindowInfo ? uni.getWindowInfo() : { windowWidth: 375 }
    rpxPerPx = 750 / (sys.windowWidth || 375)
    startY = e.touches[0].clientY
    dragging.value = true
  }

  function onTouchMove(e) {
    if (!dragging.value) return
    const dy = (e.touches[0].clientY - startY) * rpxPerPx * DAMP
    extra.value = dy > 0 && scrollTop <= 0 ? Math.min(dy, maxH.value - BASE_H) : 0
  }

  function onTouchEnd() {
    dragging.value = false
    extra.value = 0
  }

  // 图片加载后按真实宽高比换算放大上限
  function onHeroImgLoad(e) {
    const d = (e && e.detail) || {}
    if (d.width && d.height) naturalH.value = Math.round((750 * d.height) / d.width)
  }

  return { heroStyle, onTouchStart, onTouchMove, onTouchEnd, onHeroImgLoad }
}
