/**
 * [INPUT]: 依赖 Three.js、KTX2/EXR/glTF 加载器、Apple 公开交付的五层壁纸资源与从目标 bundle 提取的 GLSL。
 * [OUTPUT]: 提供 createDeviceWallpaperRenderer、内外屏动态/自定义图片纹理、全链路半浮点中间目标、逐阶段调试纹理与可控壁纸层数。
 * [POS]: iphone-duo-motion-study 的屏幕渲染子系统；以 RGBA16F 处理壁纸、用户图片裁切、FramePass、两遍 Wipe blur、教学阶段输出与设备局部投影，避免暗部重复量化。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from './assets/three.module.min.js?v=165';
import { GLTFLoader } from './assets/GLTFLoader.js?v=165';
import { KTX2Loader } from './assets/KTX2Loader.js?v=165';
import { EXRLoader } from './assets/EXRLoader.js?v=165';

const ASSET_ROOT = './assets/wallpaper/';
const SHADER_ROOT = './shaders/';
const TARGET_SIZE = [2670, 1878];
const FOLD_DEAD_ZONE = 0.11;
const FIXED_STEP = 1 / 30;
const SPRING_PERIOD = 3 / 7;
const UI_OVERSCAN = 1.012;

const TEXTURE_SPACE_LOCATIONS = [
  [12.586, 2167.96, 641.917], [-18.6749, 1999.97, 645.12], [74.9038, 835.745, 5.85019],
  [7.06619, 99.53625, -13.56189], [-2.8202, 47.7888, -9.11627]
];
const TEXTURE_SPACE_SIZES = [
  [1357.29, 0.000122, 868.359], [1274.72, 1, 625.511], [535.265, 535.226, 65.1626],
  [48.13627, 25.78078, 10.37156], [47.19929, 46.9705, 11.64885]
];
const LUT_HEIGHTS = [
  { colorRampLutHeight: 6 }, { colorRampLutHeight: 3 },
  { colorRampLutHeight: 3, curveFloatLutHeight: 9 }, { colorRampLutHeight: 5 },
  { colorRampLutHeight: 9, curveFloatLutHeight: 9 }
];

const POSES = {
  folded: {
    nodes: {
      gyro: { translation: [0, 193, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1] },
      portrait: { translation: [-0.004487235, -114.05524, 0.007725975], rotationDeg: [0, 7.81365e-9, 0], scale: [1.0000001, 0.99999994, 1] },
      landscapeToPortrait: { translation: [1.1175871e-7, 0, -6.119266e-12], rotationDeg: [1.5549745e-8, 1.3817081e-34, -1.0182295e-24], scale: [1, 1, 1] },
      stateAB: { translation: [-7.3300557, -56.69477, -3.6021388], rotationDeg: [0.5, -0.2, -9.999999], scale: [0.9999999, 0.9999999, 1] },
      stateABJump: { translation: [4.4836597, 2.9876766, 3.5528476], rotationDeg: [88.28333, 0.13242236, 25.307945], scale: [1.0000002, 1, 1.0000002] },
      camera: { translation: [0.0005569458, 0.00015848875, -0.00046730042], rotationDeg: [0.46472773, -9.99994, 0.20308574], scale: [0.9999996, 1, 0.9999998] }
    },
    focalLength: 0.83, sensorSize: 0.415, sensorZoom: 1.30246313, sensorShift: [0, 0]
  },
  open: {
    nodes: {
      gyro: { translation: [0, 193, 0], rotationDeg: [-8.3376334e-10, 0, 0], scale: [1, 1, 1] },
      portrait: { translation: [-0.004487235, -114.05524, 0.007725975], rotationDeg: [0, 7.81365e-9, 0], scale: [1.0000001, 0.99999994, 1] },
      landscapeToPortrait: { translation: [1.1175871e-7, 0, 2.1686297e-10], rotationDeg: [1.5549732e-8, 1.381707e-33, -1.0182296e-24], scale: [1, 1, 1] },
      stateAB: { translation: [0.0044872, -78.94477, -0.007725957], rotationDeg: [-1.4715969e-8, -7.813649e-9, 2.1205774e-18], scale: [0.9999999, 0.9999999, 1] },
      stateABJump: { translation: [-0.00045784135, -7.8603506, -0.00015229009], rotationDeg: [89.54233, 0.28377768, 9.997996], scale: [1.0000001, 1, 1.0000001] },
      camera: { translation: [0.00055754185, 0.00015845895, -0.00046777725], rotationDeg: [0.4647278, -9.999938, 0.2030858], scale: [0.99999946, 1, 0.99999976] }
    },
    focalLength: 0.356996, sensorSize: 0.415, sensorZoom: 1.7525, sensorShift: [-0.03, 0]
  }
};

const DUNE_ANCHORS = {
  duneClose: { foldedTranslation: [4.1735, 70.605, -10.886], foldedRotationDeg: [0, 0, 0], unfoldedTranslation: [0, 50, -13.433], unfoldedRotationDeg: [0, 0, 0] },
  duneFar: { foldedTranslation: [9.3029, 127.15, -11.735], foldedRotationDeg: [0, -1.6771, 0], unfoldedTranslation: [0, 108.33, -13.433], unfoldedRotationDeg: [0, 0, 0] }
};

const PASSES = [
  { key: 'sky', mesh: 'Plane_001', fragment: 'sky.frag.glsl', depth: false, textures: { uColorRampLutTexture: ['sky_color_ramp_lut-wallpaper.exr', true], uWallpaperTexture: ['sky_3k_cropped-wallpaper_png.ktx', false] } },
  { key: 'stars', mesh: 'Plane_526', fragment: 'stars.frag.glsl', additive: true, depth: false, textures: { uColorRampLutTexture: ['stars_color_ramp_lut-wallpaper.exr', true] } },
  { key: 'hills', mesh: 'Plane_006', fragment: 'hills.frag.glsl', depth: true, noise: true, textures: { uColorRampLutTexture: ['hills_color_ramp_lut-wallpaper.exr', true], uCurveFloatLutTexture: ['hills_curve_float_lut-wallpaper.exr', true], uHashTexture: ['hash-wallpaper.exr', false], uWallpaperTexture: ['hills_5k_cropped-wallpaper_png.ktx', false] } },
  { key: 'duneBack', mesh: 'uvquickshade19_001', fragment: 'dune-back.frag.glsl', depth: true, textures: { uColorRampLutTexture: ['dune_far_color_ramp_lut-wallpaper.exr', true], uWallpaperTexture: ['dune_far_3k_cropped-wallpaper_png.ktx', false] } },
  { key: 'duneFront', mesh: 'attribdelete_cleanup', fragment: 'dune-front.frag.glsl', depth: true, textures: { uColorRampLutTexture: ['dune_close_color_ramp_lut-wallpaper.exr', true], uCurveFloatLutTexture: ['dune_close_curve_float_lut-wallpaper.exr', true], uWallpaperTexture: ['dune_close_3k_cropped-wallpaper_png.ktx', false] } }
];

function clamp01(value) { return Math.min(1, Math.max(0, value)); }
function lerp(a, b, amount) { return a + (b - a) * amount; }
function lerp3(a, b, amount) { return a.map((value, index) => lerp(value, b[index], amount)); }
function asFloat(value) { return Number.isInteger(value) ? `${value}.0` : String(value); }
function vec3(values) { return `vec3(${values.map(asFloat).join(', ')})`; }
async function loadText(path) { const response = await fetch(`${path}?pipeline=22`); if (!response.ok) throw new Error(`${path}: ${response.status}`); return response.text(); }

function screenCrop(mode) {
  const screenAspect = mode === 'outer' ? 0.687315634 : 1 / 0.703370787;
  const ratio = screenAspect / (TARGET_SIZE[0] / TARGET_SIZE[1]);
  return [Math.min(ratio, 1), Math.min(1 / ratio, 1)];
}

function rotationMatrix(rotationDeg) {
  const [x, y, z] = rotationDeg.map(THREE.MathUtils.degToRad);
  const [sx, cx] = [Math.sin(x), Math.cos(x)];
  const [sy, cy] = [Math.sin(y), Math.cos(y)];
  const [sz, cz] = [Math.sin(z), Math.cos(z)];
  const rotateX = new THREE.Matrix4().set(1, 0, 0, 0, 0, cx, -sx, 0, 0, sx, cx, 0, 0, 0, 0, 1);
  const rotateY = new THREE.Matrix4().set(cy, 0, sy, 0, 0, 1, 0, 0, -sy, 0, cy, 0, 0, 0, 0, 1);
  const rotateZ = new THREE.Matrix4().set(cz, -sz, 0, 0, sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  return rotateZ.multiply(rotateY).multiply(rotateX);
}

function transformMatrix(spec) {
  const matrix = rotationMatrix(spec.rotationDeg);
  matrix.scale(new THREE.Vector3(...spec.scale));
  matrix.setPosition(...spec.translation);
  return matrix;
}

function combinedCameraMatrix(pose) {
  return ['portrait', 'landscapeToPortrait', 'stateAB', 'stateABJump', 'camera']
    .reduce((matrix, key) => matrix.multiply(transformMatrix(pose.nodes[key])), new THREE.Matrix4());
}

const foldedCameraMatrix = combinedCameraMatrix(POSES.folded);
const openCameraMatrix = combinedCameraMatrix(POSES.open);

function interpolatedCameraMatrix(amount) {
  const foldedQuaternion = new THREE.Quaternion().setFromRotationMatrix(foldedCameraMatrix);
  const openQuaternion = new THREE.Quaternion().setFromRotationMatrix(openCameraMatrix);
  const quaternion = foldedQuaternion.slerp(openQuaternion, amount);
  const foldedPosition = new THREE.Vector3().setFromMatrixPosition(foldedCameraMatrix);
  const openPosition = new THREE.Vector3().setFromMatrixPosition(openCameraMatrix);
  return new THREE.Matrix4().makeRotationFromQuaternion(quaternion).setPosition(foldedPosition.lerp(openPosition, amount));
}

function updateCamera(camera, amount) {
  const pose = {
    nodes: Object.fromEntries(Object.keys(POSES.folded.nodes).map((key) => [key, {
      translation: lerp3(POSES.folded.nodes[key].translation, POSES.open.nodes[key].translation, amount),
      rotationDeg: lerp3(POSES.folded.nodes[key].rotationDeg, POSES.open.nodes[key].rotationDeg, amount),
      scale: lerp3(POSES.folded.nodes[key].scale, POSES.open.nodes[key].scale, amount)
    }])),
    focalLength: lerp(POSES.folded.focalLength, POSES.open.focalLength, amount),
    sensorSize: lerp(POSES.folded.sensorSize, POSES.open.sensorSize, amount),
    sensorZoom: lerp(POSES.folded.sensorZoom, POSES.open.sensorZoom, amount),
    sensorShift: lerp3(POSES.folded.sensorShift, POSES.open.sensorShift, amount)
  };
  camera.matrix.copy(transformMatrix({ ...pose.nodes.gyro, rotationDeg: [0, 0, 0] }).multiply(interpolatedCameraMatrix(amount)));
  camera.matrixWorldNeedsUpdate = true;
  const aspect = 1 / 0.703370787;
  const vertical = 2 * pose.focalLength / pose.sensorSize * pose.sensorZoom;
  const horizontal = vertical / aspect;
  const [shiftX, shiftY] = [pose.sensorShift[1], -pose.sensorShift[0]];
  const near = 10;
  const far = 3000;
  camera.projectionMatrix.set(horizontal, 0, -shiftX, 0, 0, vertical, -shiftY, 0, 0, 0, (far + near) / (near - far), 2 * far * near / (near - far), 0, 0, -1, 0);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

class DuneAnchor {
  constructor(spec) {
    this.spec = spec;
    this.bakedInverse = rotationMatrix(spec.unfoldedRotationDeg).setPosition(...spec.unfoldedTranslation).invert();
  }

  matrix(amount) {
    const matrix = rotationMatrix(lerp3(this.spec.foldedRotationDeg, this.spec.unfoldedRotationDeg, amount));
    matrix.setPosition(...lerp3(this.spec.foldedTranslation, this.spec.unfoldedTranslation, amount));
    return matrix.multiply(this.bakedInverse);
  }
}

function flipExrRows(texture) {
  const image = texture.image;
  if (!image?.data || !image.height) return texture;
  const rowLength = image.data.length / image.height;
  const row = image.data.slice(0, rowLength);
  for (let y = 0; y < image.height >> 1; y += 1) {
    const top = y * rowLength;
    const bottom = (image.height - 1 - y) * rowLength;
    row.set(image.data.subarray(top, top + rowLength));
    image.data.copyWithin(top, bottom, bottom + rowLength);
    image.data.set(row, bottom);
  }
  texture.needsUpdate = true;
  return texture;
}

function createTarget(width, height, mipmaps = false) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    depthBuffer: !mipmaps,
    generateMipmaps: mipmaps,
    minFilter: mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    magFilter: THREE.LinearFilter
  });
  // SOURCE: Lotus createRenderTarget 与 Wipe 的 RT 均不标记 sRGB；保存线性数据。
  target.texture.colorSpace = THREE.NoColorSpace;
  target.texture.anisotropy = 4;
  return target;
}

export async function createDeviceWallpaperRenderer(renderer) {
  const [common, noise, vertex, uiVertex, uiFragment, blurVertex, blurFragment, wipeVertexVars, wipeVertex, wipeFragmentVars, wipeFragment, frameFragment] = await Promise.all([
    'common.glsl', 'noise.glsl', 'vertex.glsl', 'screen-ui.vert.glsl', 'screen-ui.frag.glsl', 'wipe-blur.vert.glsl', 'wipe-blur.frag.glsl',
    'wipe-surface-vertex-vars.glsl', 'wipe-surface.vert.glsl', 'wipe-surface-fragment-vars.glsl', 'wipe-surface.frag.glsl', 'screen-frame.frag.glsl'
  ].map((name) => loadText(`${SHADER_ROOT}${name}`)));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 10, 3000);
  camera.matrixAutoUpdate = false;
  const wallpaperTarget = createTarget(...TARGET_SIZE);
  wallpaperTarget.samples = 4;
  const screenScene = new THREE.Scene();
  const screenCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
  const screenQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  screenScene.add(screenQuad);
  const blurScene = new THREE.Scene();
  const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  blurScene.add(blurQuad);

  const screenTargets = {};
  const uiTargets = {};
  const frameTargets = {};
  const blurTargets = {};
  const customScreens = {};
  for (const mode of ['inner', 'outer']) {
    const crop = screenCrop(mode);
    const width = Math.max(1, Math.round(TARGET_SIZE[0] * crop[0]));
    const height = Math.max(1, Math.round(TARGET_SIZE[1] * crop[1]));
    screenTargets[mode] = createTarget(width, height, true);
    uiTargets[mode] = createTarget(width, height);
    uiTargets[mode].depthBuffer = false;
    frameTargets[mode] = createTarget(width, height, true);
    blurTargets[mode] = createTarget(width, height, true);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    customScreens[mode] = {
      canvas,
      context: canvas.getContext('2d'),
      texture,
      image: null,
      fit: 'cover',
      zoom: 1,
      x: 0,
      y: 0,
      dirty: false
    };
  }

  const gltfLoader = new GLTFLoader();
  const ktxLoader = new KTX2Loader().setTranscoderPath('./libs/basis/').detectSupport(renderer);
  const exrLoader = new EXRLoader();
  const textureCache = new Map();
  const loadTexture = async (filename, needsFlipFix) => {
    if (textureCache.has(filename)) return textureCache.get(filename);
    const promise = filename.endsWith('.ktx')
      ? ktxLoader.loadAsync(`${ASSET_ROOT}${filename}`).then((texture) => { texture.colorSpace = THREE.SRGBColorSpace; texture.flipY = false; return texture; })
      : exrLoader.loadAsync(`${ASSET_ROOT}${filename}`).then((texture) => { texture.colorSpace = THREE.LinearSRGBColorSpace; return needsFlipFix ? flipExrRows(texture) : texture; });
    textureCache.set(filename, promise);
    return promise;
  };

  const wallpaper = await gltfLoader.loadAsync(`${ASSET_ROOT}scene-wallpaper.gltf`);
  wallpaper.scene.rotation.x = Math.PI / 2;
  wallpaper.scene.updateMatrixWorld(true);
  scene.add(wallpaper.scene);
  const duneClose = new DuneAnchor(DUNE_ANCHORS.duneClose);
  const duneFar = new DuneAnchor(DUNE_ANCHORS.duneFar);
  let hinge = 1 / 3;
  let fold = clamp01((hinge - FOLD_DEAD_ZONE) / (1 - FOLD_DEAD_ZONE));
  let velocity = 0;

  const materials = await Promise.all(PASSES.map(async (pass, index) => {
    const uniforms = { uFoldProgress: { value: fold } };
    if (pass.key === 'duneBack') uniforms.uDuneFarMatrix = { value: new THREE.Matrix4() };
    if (pass.key === 'duneFront') uniforms.uDuneCloseMatrix = { value: new THREE.Matrix4() };
    for (const [uniform, [filename, needsFlipFix]] of Object.entries(pass.textures)) uniforms[uniform] = { value: await loadTexture(filename, needsFlipFix) };
    const lut = LUT_HEIGHTS[index];
    const defines = { COLOR_INDEX: '0.0', OBJECT_INDEX: index, TEXTURE_SPACE_LOCATION: vec3(TEXTURE_SPACE_LOCATIONS[index]), TEXTURE_SPACE_SIZE: vec3(TEXTURE_SPACE_SIZES[index]) };
    if (lut.colorRampLutHeight) defines.COLOR_RAMP_LUT_HEIGHT = asFloat(lut.colorRampLutHeight);
    if (lut.curveFloatLutHeight) defines.CURVE_FLOAT_LUT_HEIGHT = asFloat(lut.curveFloatLutHeight);
    const material = new THREE.ShaderMaterial({
      name: `Wallpaper:${pass.key}`, defines, uniforms, vertexShader: `${common}\n${vertex}`,
      fragmentShader: [common, pass.noise ? noise : '', await loadText(`${SHADER_ROOT}${pass.fragment}`)].join('\n'),
      side: THREE.FrontSide, transparent: true, depthTest: pass.depth, depthWrite: pass.depth,
      blending: pass.additive ? THREE.CustomBlending : THREE.NoBlending
    });
    if (pass.additive) {
      material.blendEquation = material.blendEquationAlpha = THREE.AddEquation;
      material.blendSrc = material.blendSrcAlpha = THREE.OneFactor;
      material.blendDst = material.blendDstAlpha = THREE.OneFactor;
    }
    const mesh = wallpaper.scene.getObjectByName(pass.mesh);
    if (!mesh) throw new Error(`Wallpaper mesh not found: ${pass.mesh}`);
    mesh.material = material;
    mesh.renderOrder = index;
    mesh.frustumCulled = false;
    return material;
  }));

  const uiTextures = {
    inner: await loadTexture('lockscreen_ui_inner-wallpaper_png.ktx', false),
    outer: await loadTexture('lockscreen_ui_outer-wallpaper_png.ktx', false)
  };
  const uiMaterial = new THREE.RawShaderMaterial({
    name: 'ScreenUiPass', glslVersion: THREE.GLSL3, vertexShader: uiVertex, fragmentShader: uiFragment,
    depthTest: false, depthWrite: false,
    uniforms: { wallpaperMap: { value: wallpaperTarget.texture }, uiMap: { value: uiTextures.inner }, wallpaperUvScale: { value: new THREE.Vector2(1, 1) }, uiUvScale: { value: new THREE.Vector2(1, 1) } }
  });
  const customMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, map: null, toneMapped: false, depthTest: false, depthWrite: false });
  screenQuad.material = uiMaterial;
  const blurMaterial = new THREE.RawShaderMaterial({
    name: 'SourceWipeBlurPass', glslVersion: THREE.GLSL3, vertexShader: blurVertex, fragmentShader: blurFragment,
    depthTest: false, depthWrite: false,
    uniforms: { map: { value: screenTargets.inner.texture }, wipeAmount: { value: 0 }, wipePosition: { value: 0 }, blurBounds: { value: new THREE.Vector2(-0.25, 1) } }
  });
  blurQuad.material = blurMaterial;
  const frameMaterial = new THREE.RawShaderMaterial({
    name: 'SourceFramePass', glslVersion: THREE.GLSL3, vertexShader: uiVertex, fragmentShader: frameFragment,
    depthTest: false, depthWrite: false, uniforms: { map: { value: null } }
  });
  ktxLoader.dispose();
  function stepSpring() {
    const target = clamp01((clamp01(hinge) - FOLD_DEAD_ZONE) / (1 - FOLD_DEAD_ZONE));
    const angular = 2 * Math.PI / SPRING_PERIOD;
    const stiffness = angular * angular;
    const damping = 2.6 * angular;
    const displacement = Math.min(1, Math.max(-1, fold - target));
    velocity += (-stiffness * displacement - damping * velocity) * FIXED_STEP;
    const next = clamp01(fold + velocity * FIXED_STEP);
    if (Math.abs(velocity) < 0.001 && Math.abs(next - fold) < 0.001) { velocity = 0; fold = target; }
    else fold = next;
  }

  function renderScreen(mode) {
    const target = screenTargets[mode];
    const crop = screenCrop(mode);
    const custom = customScreens[mode];
    if (custom.image) {
      if (custom.dirty) drawCustomScreen(mode);
      customMaterial.map = custom.texture;
      screenQuad.material = customMaterial;
    } else {
      const uiTexture = uiTextures[mode];
      const uiAspect = uiTexture.image.width / uiTexture.image.height;
      const fit = (target.width / target.height) / uiAspect;
      uiMaterial.uniforms.wallpaperUvScale.value.fromArray(crop);
      uiMaterial.uniforms.uiUvScale.value.set(Math.max(fit, 1) * UI_OVERSCAN, Math.max(1 / fit, 1) * UI_OVERSCAN);
      uiMaterial.uniforms.uiMap.value = uiTexture;
      screenQuad.material = uiMaterial;
    }
    renderer.setRenderTarget(uiTargets[mode]);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(screenScene, screenCamera);
    frameMaterial.uniforms.map.value = uiTargets[mode].texture;
    screenQuad.material = frameMaterial;
    renderer.setRenderTarget(frameTargets[mode]);
    renderer.clear();
    renderer.render(screenScene, screenCamera);
    const blurAmount = mode === 'outer'
      ? clamp01(1 - 2 * Math.abs(hinge - 0.5)) / 2
      : clamp01(1 - hinge);
    blurMaterial.uniforms.wipeAmount.value = blurAmount;
    blurMaterial.uniforms.wipePosition.value = mode === 'inner' ? 1 : 0;
    blurMaterial.uniforms.blurBounds.value.set(...(mode === 'inner' ? [0.45, 1] : [0, 0.9]));
    blurMaterial.uniforms.map.value = frameTargets[mode].texture;
    renderer.setRenderTarget(blurTargets[mode]);
    renderer.clear();
    renderer.render(blurScene, screenCamera);
    blurMaterial.uniforms.map.value = blurTargets[mode].texture;
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(blurScene, screenCamera);
  }

  function drawCustomScreen(mode) {
    const screen = customScreens[mode];
    const { canvas, context, image } = screen;
    if (!image) return;
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const baseScale = screen.fit === 'contain'
      ? Math.min(canvas.width / imageWidth, canvas.height / imageHeight)
      : Math.max(canvas.width / imageWidth, canvas.height / imageHeight);
    const scale = baseScale * screen.zoom;
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    const travelX = Math.max(canvas.width * .35, Math.abs(width - canvas.width) / 2);
    const travelY = Math.max(canvas.height * .35, Math.abs(height - canvas.height) / 2);
    const left = (canvas.width - width) / 2 + screen.x * travelX;
    const top = (canvas.height - height) / 2 + screen.y * travelY;
    context.save();
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, left, top, width, height);
    context.restore();
    screen.texture.needsUpdate = true;
    screen.dirty = false;
  }

  function installScreen(node, mode) {
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (!material || material.userData.sourceWipeInstalled) return;
    const profile = mode === 'inner'
      ? { position: 1, scale: 1.9816, zoom: 7.95, offset: 0, shade: [0.5, 1], emissive: [0, 0, 0], darkness: 0.95 }
      : { position: 0, scale: 0.9894, zoom: 7.68, offset: 0.24, shade: [0, 1], emissive: [4.1, 0.8, 0], darkness: 0.9 };
    const uniforms = {
      modelMatrixInverse: { value: new THREE.Matrix4() },
      emissiveLocalPos: { value: new THREE.Vector3(...profile.emissive) },
      wipeRotation: { value: new THREE.Vector3(-Math.PI / 2, 0, 0) },
      wipeAmount: { value: 0 },
      wipePosition: { value: profile.position },
      minShading: { value: 0 },
      wipeOffset: { value: profile.offset },
      wipeScale: { value: profile.scale },
      wipeBrightness: { value: 1 },
      shadeBounds: { value: new THREE.Vector2(...profile.shade) },
      wipeZoom: { value: profile.zoom },
      transitionToCameraRest: { value: 0 },
      wallpaperUvScale: { value: new THREE.Vector2(1, 1) },
      enableFraming: { value: true },
      wipeCameraPos: { value: new THREE.Vector2(2035, 127) },
      wipeCameraRadius: { value: 83 },
      wipeCameraDarkness: { value: profile.darkness },
      maxViewingAngle: { value: 90 }
    };
    const previousCompile = material.onBeforeCompile?.bind(material);
    material.onBeforeCompile = (shader, webglRenderer) => {
      previousCompile?.(shader, webglRenderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${wipeVertexVars}`)
        .replace('#include <worldpos_vertex>', wipeVertex);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${wipeFragmentVars}`)
        .replace('#include <emissivemap_fragment>', wipeFragment);
    };
    material.customProgramCacheKey = () => `source-wipe-${mode}-v8`;
    material.userData.sourceWipeInstalled = true;
    const previousRender = node.onBeforeRender;
    node.onBeforeRender = function onBeforeScreenRender(...args) {
      previousRender?.apply(this, args);
      uniforms.modelMatrixInverse.value.copy(this.matrixWorld).invert();
      if (mode === 'inner') {
        uniforms.wipeAmount.value = clamp01(1 - hinge);
        uniforms.transitionToCameraRest.value = 0;
      } else {
        uniforms.wipeAmount.value = clamp01(1 - 2 * Math.abs(hinge - 0.5)) / 2;
        const transition = clamp01((hinge - 0.45) / 0.55);
        uniforms.transitionToCameraRest.value = transition * transition * (3 - 2 * transition);
      }
    };
    material.needsUpdate = true;
  }

  return {
    setHinge(value) { hinge = clamp01(Number(value)); },
    getTexture(mode) { return screenTargets[mode].texture; },
    getDebugTexture(stage, mode = 'inner') {
      if (stage === 'wallpaper') return wallpaperTarget.texture;
      if (stage === 'ui') return uiTargets[mode].texture;
      if (stage === 'frame') return frameTargets[mode].texture;
      return screenTargets[mode].texture;
    },
    setLayerCount(count) {
      materials.forEach((material, index) => { material.visible = index < count; });
    },
    setCustomImage(image, modes = ['inner', 'outer']) {
      modes.forEach((mode) => {
        customScreens[mode].image = image;
        customScreens[mode].dirty = true;
      });
    },
    clearCustomImage(modes = ['inner', 'outer']) {
      modes.forEach((mode) => {
        customScreens[mode].image = null;
        customScreens[mode].dirty = false;
      });
    },
    setCustomOptions(options, modes = ['inner', 'outer']) {
      modes.forEach((mode) => {
        Object.assign(customScreens[mode], options);
        customScreens[mode].dirty = true;
      });
    },
    getCustomOptions(mode = 'inner') {
      const { fit, zoom, x, y, image } = customScreens[mode];
      return { fit, zoom, x, y, hasImage: Boolean(image) };
    },
    installScreen,
    render() {
      stepSpring();
      const farMatrix = duneFar.matrix(fold);
      const closeMatrix = duneClose.matrix(fold);
      materials.forEach((material) => {
        material.uniforms.uFoldProgress.value = fold;
        material.uniforms.uDuneFarMatrix?.value.copy(farMatrix);
        material.uniforms.uDuneCloseMatrix?.value.copy(closeMatrix);
      });
      updateCamera(camera, fold);
      const previousTarget = renderer.getRenderTarget();
      const previousColor = renderer.getClearColor(new THREE.Color()).clone();
      const previousAlpha = renderer.getClearAlpha();
      const previousToneMapping = renderer.toneMapping;
      const previousExposure = renderer.toneMappingExposure;
      // 官网壁纸离屏管线工作在线性色彩输出，不经过设备场景的 ACES 映射。
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.toneMappingExposure = 1;
      renderer.setRenderTarget(wallpaperTarget);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      renderScreen('inner');
      renderScreen('outer');
      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(previousColor, previousAlpha);
      renderer.toneMapping = previousToneMapping;
      renderer.toneMappingExposure = previousExposure;
    }
  };
}
