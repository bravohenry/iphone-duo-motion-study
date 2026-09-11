/**
 * [INPUT]: 依赖设备 glTF 的内外屏节点命名与 wallpaper renderer 的屏幕纹理/投影接口。
 * [OUTPUT]: 提供 installDynamicScreens，将离屏结果注入模型的物理屏幕材质。
 * [POS]: app 的模型适配层；把资源内部命名隔离在单点，避免主编排感知屏幕 mesh 细节。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const SCREEN_MODES = new Map([
  ['skeleton_0_3_screenTexture_geo', 'inner'],
  ['skeleton_0_7_outerDisplayScreenTexture_geo', 'outer'],
]);

export function installDynamicScreens(root, dynamicWallpaper) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    const mode = SCREEN_MODES.get(node.name);
    if (!mode) return;
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (!material) return;
    // 屏幕只接受离屏渲染结果；加载期间保持未点亮，避免闪现资源里的旧截图。
    material.map = null;
    material.emissiveMap = dynamicWallpaper?.getTexture(mode) ?? null;
    material.color.set(0x000000);
    material.emissive.set(0xffffff);
    material.emissiveIntensity = dynamicWallpaper ? 1 : 0;
    material.metalness = 0;
    material.roughness = mode === 'inner' ? .33 : .05;
    material.toneMapped = false;
    material.dithering = true;
    dynamicWallpaper?.installScreen(node, mode);
    material.needsUpdate = true;
  });
}
