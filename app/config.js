/**
 * [INPUT]: 仅依赖 JavaScript 数学常量。
 * [OUTPUT]: 提供折叠动画时长、壁纸层数、六种产品姿态和八个 WebGL 教学阶段。
 * [POS]: app 的不可变配置层；为 motion controller 与主编排提供同一份产品状态定义。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const CLIP_SECONDS = 2;
export const PASSES_LAYER_COUNT = 5;

export const PRODUCT_STATES = [
  { id: 'closed', label: 'Closed', fold: 0, primary: { position: [4, 0, 0] } },
  { id: 'foldable', label: 'Foldable', fold: .3333, interactive: true, primary: { position: [2.668, 0, 0] } },
  { id: 'landscape', label: 'Landscape', fold: 1 },
  { id: 'portrait', label: 'Portrait', fold: 1, pose: { rotation: [0, Math.PI / 2, 0] } },
  { id: 'seated', label: 'Seated', fold: .5111, orbit: [31, 1.38, -Math.PI / 2], primary: { position: [0, -4, 0] }, pose: { rotation: [0, Math.PI / 2, -Math.PI / 2] } },
  { id: 'standing', label: 'Standing', fold: .25, orbit: [29, 1.45, Math.PI * .8], primary: { position: [0, 4, .2562] }, accent: { rotation: [0, -Math.PI / 2, -Math.PI / 8] } },
];

export const PIPELINE_STAGES = [
  { id: 'sky', label: '01 Sky', layers: 1, texture: 'wallpaper', description: 'Base sky gradient and source texture.' },
  { id: 'stars', label: '02 Stars', layers: 2, texture: 'wallpaper', description: 'Additive star field composited over the sky.' },
  { id: 'hills', label: '03 Hills', layers: 3, texture: 'wallpaper', description: 'Depth-tested procedural hills, LUTs and noise.' },
  { id: 'dunes', label: '04 Dunes', layers: 5, texture: 'wallpaper', description: 'Near and far dune layers driven by fold progress.' },
  { id: 'ui', label: '05 UI', layers: 5, texture: 'ui', description: 'Lock-screen plate composited with the animated wallpaper.' },
  { id: 'frame', label: '06 Frame', layers: 5, texture: 'frame', description: '0.9 inset, rounded display boundary and black surround.' },
  { id: 'blur', label: '07 Blur', layers: 5, texture: 'blur', description: 'Two bicubic mip passes controlled by hinge position.' },
  { id: 'wipe', label: '08 Wipe', layers: 5, texture: 'blur', device: true, description: 'The result is projected through the folding screen in local 3D space.' },
];
