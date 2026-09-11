/**
 * [INPUT]: 依赖视口 CSS 尺寸与设备像素比，不依赖 DOM 或 Three.js。
 * [OUTPUT]: 提供受总像素预算约束的画布像素比计算。
 * [POS]: app 的纯渲染质量策略；供 WebGL runtime 消费，并允许在无浏览器环境独立验证。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const MIN_SUPERSAMPLE = 1.5;
const MAX_PIXEL_RATIO = 2.5;
const DEVICE_RATIO_SCALE = 1.25;
const MAX_RENDER_PIXELS = 8_500_000;

export function resolvePixelRatio(width, height, nativeRatio = globalThis.devicePixelRatio || 1) {
  const area = Math.max(1, width * height);
  const budgetRatio = Math.sqrt(MAX_RENDER_PIXELS / area);
  // 原生 DPR 只保证一屏一采样；金属轮廓额外取 25% 超采样后再由浏览器缩回 CSS 像素。
  const preferred = Math.max(MIN_SUPERSAMPLE, nativeRatio * DEVICE_RATIO_SCALE);
  return Math.max(1, Math.min(MAX_PIXEL_RATIO, preferred, budgetRatio));
}
