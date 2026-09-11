/**
 * [INPUT]: 依赖已加载的 iPhone Duo glTF 根节点，以及官网场景交付的 Finish/Optics 两张 PMREM 环境贴图。
 * [OUTPUT]: 提供官网 LSD 材质层、透明度覆盖与局部环境旋转的 Three.js 近似还原接口。
 * [POS]: app 的材质兼容层；弥合裸 glTF 与 Apple Lotus 场景运行时之间的差异，不让 main.js 硬编码材质细节。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const MATERIAL_OVERRIDES = Object.freeze({
  // Logo 高光层：glTF 的基础 Alpha 为 0，Lotus 场景将它恢复为不透明。
  iVzCHFKAaRqjQhl: { opacity: 1, transparent: false, depthWrite: true },
  // Lotus 的动态环境/遮蔽让内屏承载框保持近黑；裸 glTF 的 0.1 线性色在补光下会错误地抬成中灰。
  FoAbzXGuCEeVRQW: { color: [.008, .008, .008], roughness: .5 },
  // Lotus 将材质基础 Alpha 与 Transparency chunk 分开计算；Three.js 只有一层 opacity，保留半透明玻璃才能让内部镜组在透明导出中仍然可见。
  FVyIOhmektXDyZR: { opacity: .28, transparent: true, depthWrite: false, environment: 'optics' },
  hkSmvYqlDNAQojv: { opacity: .453, transparent: true, depthWrite: false, environment: 'finish' },
  xCmJdqeHryYgJtk: { opacity: .341, transparent: true, depthWrite: false, environment: 'finish' },
  uykWUEajxHqfrmh: { opacity: .461, transparent: true, depthWrite: false },
  OwqobJiNTlvAFyj: { opacity: .4, transparent: true, depthWrite: false },
});

const FINISH_ENVIRONMENT_MATERIALS = new Set([
  'QTguOGnxQOXIuCV',
  'jqsnBZpRGBJNKPm',
  'npGznGDsLOmhtPH',
  'xCmJdqeHryYgJtk',
  'hkSmvYqlDNAQojv',
  'qJbGiREHXwRMmQc',
  'dLDrceZOOgIrzrK',
  'pkUBCyCvYJYVzTr',
  'screenTextureOuterDisplay_usd_shd_lts',
]);

const FINISH_ENVIRONMENT_ROTATION = Object.freeze([0, 2.09, 0]);
const OPTICS_ENVIRONMENT_ROTATION = Object.freeze([1, .6, 0]);

function applyEnvironment(material, texture, rotation) {
  if (!texture || !material.isMeshStandardMaterial) return;
  material.envMap = texture;
  material.envMapIntensity = 1;
  material.envMapRotation?.set(...rotation);
}

export function applySourceMaterialFidelity(root, environments = {}) {
  const visited = new Set();
  root.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      if (visited.has(material)) return;
      visited.add(material);

      const override = MATERIAL_OVERRIDES[material.name];
      if (override) {
        if (override.opacity !== undefined) material.opacity = override.opacity;
        if (override.transparent !== undefined) material.transparent = override.transparent;
        if (override.depthWrite !== undefined) material.depthWrite = override.depthWrite;
        if (override.color) material.color.setRGB(...override.color);
        if (override.roughness !== undefined) material.roughness = override.roughness;
      }

      const environment = override?.environment || (FINISH_ENVIRONMENT_MATERIALS.has(material.name) ? 'finish' : null);
      if (environment === 'optics') applyEnvironment(material, environments.optics, OPTICS_ENVIRONMENT_ROTATION);
      if (environment === 'finish') applyEnvironment(material, environments.finish, FINISH_ENVIRONMENT_ROTATION);
      material.needsUpdate = true;
    });
  });
}
