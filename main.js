/**
 * [INPUT]: 依赖 three.module、GLTFLoader、OrbitControls、wallpaper-renderer 与 apple-product-viewer 的 Slider clip、EXR 和设备模型。
 * [OUTPUT]: 驱动自定义图片 mockup、产品演示、手动折叠/可选几何中心跟随和逐阶段 WebGL 教学，并复用同一设备与屏幕管线。
 * [POS]: iphone-duo-motion-study 的交互编排层；管理图片导入/裁切、三种视图、姿态/自由视角、整机中心跟随和管线预览。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from './assets/three.module.min.js?v=165';
import { GLTFLoader } from './assets/GLTFLoader.js?v=165';
import { OrbitControls } from './assets/OrbitControls.js?v=165';
import { EXRLoader } from './assets/EXRLoader.js?v=165';
import { createDeviceWallpaperRenderer } from './wallpaper-renderer.js?v=23';

const CLIP_SECONDS = 2;
const PASSES_LAYER_COUNT = 5;
const canvas = document.querySelector('#webgl');
const slider = document.querySelector('#fold');
const foldValue = document.querySelector('#fold-value');
const autoCenterButton = document.querySelector('#auto-center');
const resetView = document.querySelector('#reset-view');
const foldControls = document.querySelector('#fold-controls');
const status = document.querySelector('#status');
const controls = document.querySelector('#controls');
const demoPanel = document.querySelector('.panel');
const pipelinePanel = document.querySelector('#pipeline-panel');
const pipelineStagesElement = document.querySelector('#pipeline-stages');
const stageDescription = document.querySelector('#stage-description');
const mockupPanel = document.querySelector('#mockup-panel');
const mockupFile = document.querySelector('#mockup-file');
const mockupDrop = document.querySelector('#mockup-drop');
const mockupClear = document.querySelector('#mockup-clear');
const mockupTargets = [...document.querySelectorAll('#mockup-targets button')];
const mockupFit = document.querySelector('#mockup-fit');
const mockupZoom = document.querySelector('#mockup-zoom');
const mockupX = document.querySelector('#mockup-x');
const mockupY = document.querySelector('#mockup-y');
const lessonTabs = [...document.querySelectorAll('.lesson-tab')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const states = [
  { id: 'foldable', label: 'Foldable', fold: .3333, interactive: true, primary: { position: [2.668, 0, 0] } },
  { id: 'landscape', label: 'Landscape', fold: 1 },
  { id: 'portrait', label: 'Portrait', fold: 1, pose: { rotation: [0, Math.PI / 2, 0] } },
  { id: 'closed', label: 'Closed', fold: 0, primary: { position: [4, 0, 0] } },
  { id: 'seated', label: 'Seated', fold: .5111, orbit: [31, 1.38, -Math.PI / 2], primary: { position: [0, -4, 0] }, pose: { rotation: [0, Math.PI / 2, -Math.PI / 2] } },
  { id: 'standing', label: 'Standing', fold: .25, orbit: [29, 1.45, Math.PI * .8], primary: { position: [0, 4, .2562] }, accent: { rotation: [0, -Math.PI / 2, -Math.PI / 8] } },
  { id: 'durability', label: 'Durability', fold: .3333, orbit: [25, 1.43, Math.PI * .52], primary: { position: [4, 0, .2379] }, pose: { rotation: [0, 0, -Math.PI / 6] } },
];

const pipelineStages = [
  { id: 'sky', label: '01 Sky', layers: 1, texture: 'wallpaper', description: 'Base sky gradient and source texture.' },
  { id: 'stars', label: '02 Stars', layers: 2, texture: 'wallpaper', description: 'Additive star field composited over the sky.' },
  { id: 'hills', label: '03 Hills', layers: 3, texture: 'wallpaper', description: 'Depth-tested procedural hills, LUTs and noise.' },
  { id: 'dunes', label: '04 Dunes', layers: 5, texture: 'wallpaper', description: 'Near and far dune layers driven by fold progress.' },
  { id: 'ui', label: '05 UI', layers: 5, texture: 'ui', description: 'Lock-screen plate composited with the animated wallpaper.' },
  { id: 'frame', label: '06 Frame', layers: 5, texture: 'frame', description: '0.9 inset, rounded display boundary and black surround.' },
  { id: 'blur', label: '07 Blur', layers: 5, texture: 'blur', description: 'Two bicubic mip passes controlled by hinge position.' },
  { id: 'wipe', label: '08 Wipe', layers: 5, texture: 'blur', device: true, description: 'The result is projected through the folding screen in local 3D space.' }
];

let selected = states[0];
let currentFold = selected.fold;
let transition = null;
let mixer;
let sliderAction;
let frame;
let turntable;
let poseRig;
let accentRig;
let productRoot;
let wallpaperRenderer;
let viewMode = 'mockup';
let autoCenter = false;
let mockupTarget = 'both';
const mockupImages = { inner: null, outer: null };
const mockupNames = { inner: '', outer: '' };
let selectedPipelineStage = pipelineStages[0];
const orbit = new THREE.Spherical();
const productBounds = new THREE.Box3();
const viewCenter = new THREE.Vector3();
let orbitControls;

states.forEach((state) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'control';
  button.dataset.state = state.id;
  button.setAttribute('aria-pressed', String(state === selected));
  button.textContent = state.label;
  button.addEventListener('click', () => selectState(state));
  controls.append(button);
});

pipelineStages.forEach((stage) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pipeline-stage';
  button.dataset.stage = stage.id;
  button.setAttribute('aria-pressed', String(stage === selectedPipelineStage));
  button.textContent = stage.label;
  button.addEventListener('click', () => selectPipelineStage(stage));
  pipelineStagesElement.append(button);
});

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const pipelineScene = new THREE.Scene();
const pipelineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
pipelineCamera.position.z = 1;
const pipelineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const pipelineQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pipelineMaterial);
pipelineScene.add(pipelineQuad);
const camera = new THREE.PerspectiveCamera(50, 1, .01, 100);
camera.zoom = 1.5;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8d96a0, 2.2));
const keyLight = new THREE.DirectionalLight(0xffffff, 4.5);
keyLight.position.set(5, 6, 8);
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xdde8ff, 2.2);
fillLight.position.set(-5, 2, 4);
scene.add(fillLight);

new EXRLoader().load('./assets/apple-product-viewer/apple-environment.exr', (texture) => {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(texture).texture;
  texture.dispose();
  pmrem.dispose();
});

function normalizeFold(value) { return Math.max(0, Math.min(1, Number(value))); }

function setFold(value) {
  currentFold = normalizeFold(value);
  slider.value = String(currentFold);
  foldValue.value = `${Math.round(currentFold * 100)}%`;
  slider.setAttribute('aria-valuetext', `${Math.round(currentFold * 100)}% open`);
  if (!mixer || !sliderAction) return;
  sliderAction.enabled = true;
  sliderAction.paused = false;
  mixer.setTime(currentFold * CLIP_SECONDS);
  sliderAction.paused = true;
}

function selectPipelineStage(stage) {
  selectedPipelineStage = stage;
  pipelineStagesElement.querySelectorAll('.pipeline-stage').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.stage === stage.id)));
  stageDescription.textContent = stage.description;
  wallpaperRenderer?.setLayerCount(stage.layers);
  const texture = wallpaperRenderer?.getDebugTexture(stage.texture);
  if (texture && pipelineMaterial.map !== texture) {
    pipelineMaterial.map = texture;
    pipelineMaterial.needsUpdate = true;
  }
  if (productRoot) productRoot.visible = Boolean(stage.device);
  if (stage.device) {
    setFold(.72);
    Object.assign(orbit, { radius: 35, phi: Math.PI / 2, theta: Math.PI });
    setRigState(states[0]);
    applyOrbit();
  }
  resize();
}

function setViewMode(mode) {
  viewMode = mode;
  scene.background = null;
  if (orbitControls) {
    orbitControls.minPolarAngle = mode === 'mockup' ? .08 : 1.1519173063162575;
    orbitControls.maxPolarAngle = mode === 'mockup' ? Math.PI - .08 : 2.0943951023931953;
    orbitControls.enablePan = true;
  }
  lessonTabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.view === mode)));
  demoPanel.hidden = mode !== 'demo' && mode !== 'mockup';
  mockupPanel.hidden = mode !== 'mockup';
  pipelinePanel.hidden = mode !== 'pipeline';
  if (productRoot) productRoot.visible = mode !== 'pipeline' || Boolean(selectedPipelineStage.device);
  if (mode === 'demo' || mode === 'mockup') {
    wallpaperRenderer?.setLayerCount(PASSES_LAYER_COUNT);
    setFold(selected.fold);
    applyView(selected);
  } else selectPipelineStage(selectedPipelineStage);
}

function installDynamicScreens(root, dynamicWallpaper) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    const mode = node.name === 'skeleton_0_3_screenTexture_geo' ? 'inner' : node.name === 'skeleton_0_7_outerDisplayScreenTexture_geo' ? 'outer' : null;
    if (!mode) return;
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (!material) return;
    // 屏幕只接受离屏渲染结果；加载期间保持未点亮，避免闪现旧截图。
    material.map = null;
    material.emissiveMap = dynamicWallpaper?.getTexture(mode) ?? null;
    material.color.set(0x000000);
    material.emissive.set(0xffffff);
    material.emissiveIntensity = dynamicWallpaper ? 1 : 0;
    material.metalness = 0;
    material.roughness = mode === 'inner' ? .33 : .05;
    material.toneMapped = false;
    dynamicWallpaper?.installScreen(node, mode);
    material.needsUpdate = true;
  });
}

function orbitFor(state) {
  if (!frame) return;
  if (state.orbit) {
    const [radius, phi, theta] = state.orbit;
    return { radius, phi, theta };
  }
  return { radius: 35, phi: Math.PI / 2, theta: Math.PI };
}

function applyView(state) {
  const targetOrbit = orbitFor(state);
  if (!targetOrbit) return;
  Object.assign(orbit, targetOrbit);
  setRigState(state);
  applyOrbit();
}

function centerForCurrentView() {
  const shouldFollow = autoCenter && selected.interactive && (viewMode === 'mockup' || viewMode === 'demo') && productRoot;
  if (!shouldFollow) return viewCenter.copy(frame.center);
  productRoot.updateWorldMatrix(true, true);
  // 机身由骨骼驱动；静态 geometry bounds 会把闭合状态误判成展开宽度。
  productRoot.traverse((node) => { if (node.isSkinnedMesh) node.computeBoundingBox(); });
  productBounds.setFromObject(productRoot);
  return productBounds.isEmpty() ? viewCenter.copy(frame.center) : productBounds.getCenter(viewCenter);
}

function syncOrbitFromCamera() {
  if (!orbitControls) return;
  orbit.setFromVector3(camera.position.clone().sub(orbitControls.target));
}

function applyOrbit() {
  if (!frame) return;
  const center = centerForCurrentView();
  camera.position.copy(center).add(new THREE.Vector3().setFromSpherical(orbit));
  camera.lookAt(center);
  if (orbitControls) {
    orbitControls.target.copy(center);
    orbitControls.update();
  }
}

function transformFor(state, key, defaults) {
  const transform = state[key] || {};
  return { position: transform.position || defaults.position, rotation: transform.rotation || defaults.rotation };
}

function setTransform(rig, transform) {
  if (!rig) return;
  rig.position.fromArray(transform.position);
  rig.rotation.set(...transform.rotation);
}

function setRigState(state) {
  setTransform(turntable, transformFor(state, 'primary', { position: [0, 0, 0], rotation: [Math.PI / 2, Math.PI, 0] }));
  setTransform(poseRig, transformFor(state, 'pose', { position: [0, 0, 0], rotation: [0, 0, 0] }));
  setTransform(accentRig, transformFor(state, 'accent', { position: [0, 0, 0], rotation: [0, 0, 0] }));
}

function getRigState() {
  const read = (rig) => ({ position: rig ? rig.position.toArray() : [0, 0, 0], rotation: rig ? [rig.rotation.x, rig.rotation.y, rig.rotation.z] : [0, 0, 0] });
  return { primary: read(turntable), pose: read(poseRig), accent: read(accentRig) };
}

function interpolateTransform(rig, from, to, amount) {
  if (!rig) return;
  rig.position.fromArray(from.position.map((value, index) => THREE.MathUtils.lerp(value, to.position[index], amount)));
  rig.rotation.set(...from.rotation.map((value, index) => lerpAngle(value, to.rotation[index], amount)));
}

function updateControls(state) {
  controls.querySelectorAll('.control').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.state === state.id)));
  slider.disabled = !state.interactive;
  foldControls.hidden = !state.interactive;
}

function finishTransition(target) {
  transition = null;
  setFold(target.fold);
  applyView(target);
}

function selectState(target) {
  selected = target;
  updateControls(target);
  const duration = reducedMotion ? 0 : 620;
  const targetOrbit = orbitFor(target);
  const rigDefaults = { primary: { position: [0, 0, 0], rotation: [Math.PI / 2, Math.PI, 0] }, pose: { position: [0, 0, 0], rotation: [0, 0, 0] }, accent: { position: [0, 0, 0], rotation: [0, 0, 0] } };
  const targetRig = Object.fromEntries(Object.entries(rigDefaults).map(([key, defaults]) => [key, transformFor(target, key, defaults)]));
  transition = { target, fromFold: currentFold, fromOrbit: { ...orbit }, targetOrbit, fromRig: getRigState(), targetRig, start: performance.now(), duration };
  if (duration === 0) finishTransition(target);
}

function easeOutCubic(value) { return 1 - Math.pow(1 - value, 3); }
function lerpAngle(from, to, amount) {
  const delta = THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
  return from + delta * amount;
}
function tick(now) {
  if (transition) {
    const elapsed = transition.duration === 0 ? 1 : Math.min(1, (now - transition.start) / transition.duration);
    const progress = easeOutCubic(elapsed);
    setFold(THREE.MathUtils.lerp(transition.fromFold, transition.target.fold, progress));
    if (transition.targetOrbit) {
      orbit.radius = THREE.MathUtils.lerp(transition.fromOrbit.radius, transition.targetOrbit.radius, progress);
      orbit.phi = THREE.MathUtils.lerp(transition.fromOrbit.phi, transition.targetOrbit.phi, progress);
      orbit.theta = lerpAngle(transition.fromOrbit.theta, transition.targetOrbit.theta, progress);
      applyOrbit();
    }
    interpolateTransform(turntable, transition.fromRig.primary, transition.targetRig.primary, progress);
    interpolateTransform(poseRig, transition.fromRig.pose, transition.targetRig.pose, progress);
    interpolateTransform(accentRig, transition.fromRig.accent, transition.targetRig.accent, progress);
    if (elapsed === 1) finishTransition(transition.target);
  }
  orbitControls?.update();
  if (wallpaperRenderer) {
    wallpaperRenderer.setHinge(currentFold);
    wallpaperRenderer.render();
  }
  if (viewMode === 'pipeline' && !selectedPipelineStage.device) {
    const texture = wallpaperRenderer?.getDebugTexture(selectedPipelineStage.texture);
    if (texture && pipelineMaterial.map !== texture) {
      pipelineMaterial.map = texture;
      pipelineMaterial.needsUpdate = true;
      resize();
    }
    renderer.render(pipelineScene, pipelineCamera);
  } else renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

function resize() {
  const { width, height } = canvas.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // 窄屏按水平空间退让取景，避免全屏画布把模型两侧裁掉。
  camera.zoom = 1.5 * Math.min(1, camera.aspect);
  camera.updateProjectionMatrix();
  orbitControls?.update();
  const texture = pipelineMaterial.map;
  const imageAspect = texture?.image?.width && texture?.image?.height ? texture.image.width / texture.image.height : 2670 / 1878;
  const viewportAspect = width / height;
  pipelineQuad.scale.set(viewportAspect > imageAspect ? imageAspect / viewportAspect : 1, viewportAspect > imageAspect ? 1 : viewportAspect / imageAspect, 1);
}

slider.addEventListener('input', (event) => {
  if (!selected.interactive) return;
  transition = null;
  setFold(event.target.value);
  if (autoCenter) {
    syncOrbitFromCamera();
    applyOrbit();
  }
});

autoCenterButton.addEventListener('click', () => {
  syncOrbitFromCamera();
  autoCenter = !autoCenter;
  autoCenterButton.setAttribute('aria-pressed', String(autoCenter));
  if (autoCenter) applyOrbit();
});

function revealFreeView() {
  transition = null;
}

canvas.addEventListener('pointerdown', revealFreeView);
canvas.addEventListener('wheel', revealFreeView, { passive: true });

resetView.addEventListener('click', () => {
  transition = null;
  applyView(selected);
});

lessonTabs.forEach((tab) => tab.addEventListener('click', () => setViewMode(tab.dataset.view)));

function targetModes(target = mockupTarget) {
  return target === 'both' ? ['inner', 'outer'] : [target];
}

function currentMockupOptions() {
  return { fit: mockupFit.value, zoom: Number(mockupZoom.value), x: Number(mockupX.value), y: Number(mockupY.value) };
}

function applyMockupOptions() {
  wallpaperRenderer?.setCustomOptions(currentMockupOptions(), targetModes());
}

function syncMockupControls() {
  const mode = mockupTarget === 'outer' ? 'outer' : 'inner';
  const options = wallpaperRenderer?.getCustomOptions(mode) || { fit: 'cover', zoom: 1, x: 0, y: 0 };
  mockupFit.value = options.fit;
  mockupZoom.value = String(options.zoom);
  mockupX.value = String(options.x);
  mockupY.value = String(options.y);
  updateMockupDropLabel();
}

function updateMockupDropLabel() {
  const modes = targetModes();
  const names = [...new Set(modes.map((mode) => mockupNames[mode]).filter(Boolean))];
  const title = names.length === 1 ? names[0] : names.length > 1 ? 'Different images' : 'Choose an image';
  const detail = names.length ? 'drop another to replace' : 'or drop PNG, JPG, WebP or AVIF';
  mockupDrop.querySelector('strong').textContent = title;
  mockupDrop.querySelector('span').textContent = detail;
}

async function loadMockupFile(file) {
  if (!file?.type.startsWith('image/')) {
    status.textContent = 'Choose a PNG, JPG, WebP or AVIF image.';
    status.hidden = false;
    return;
  }
  if (file.size > 40 * 1024 * 1024) {
    status.textContent = 'Choose an image smaller than 40 MB.';
    status.hidden = false;
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
    const modes = targetModes();
    modes.forEach((mode) => { mockupImages[mode] = image; mockupNames[mode] = file.name; });
    wallpaperRenderer?.setCustomImage(image, modes);
    applyMockupOptions();
    updateMockupDropLabel();
    mockupDrop.querySelector('span').textContent = `${image.naturalWidth} × ${image.naturalHeight} · drop another to replace`;
    status.hidden = true;
  } catch {
    status.textContent = 'This image could not be decoded.';
    status.hidden = false;
  } finally {
    URL.revokeObjectURL(url);
    mockupFile.value = '';
  }
}

mockupFile.addEventListener('change', () => loadMockupFile(mockupFile.files[0]));
mockupDrop.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); mockupFile.click(); }
});
['dragenter', 'dragover'].forEach((type) => addEventListener(type, (event) => {
  if (viewMode !== 'mockup') return;
  event.preventDefault();
  mockupDrop.dataset.active = 'true';
}));
['dragleave', 'drop'].forEach((type) => addEventListener(type, (event) => {
  if (viewMode !== 'mockup') return;
  event.preventDefault();
  mockupDrop.dataset.active = 'false';
  if (type === 'drop') loadMockupFile(event.dataTransfer?.files[0]);
}));
mockupTargets.forEach((button) => button.addEventListener('click', () => {
  mockupTarget = button.dataset.target;
  mockupTargets.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  syncMockupControls();
}));
[mockupFit, mockupZoom, mockupX, mockupY].forEach((control) => control.addEventListener('input', applyMockupOptions));
mockupClear.addEventListener('click', () => {
  const modes = targetModes();
  wallpaperRenderer?.clearCustomImage(modes);
  modes.forEach((mode) => { mockupImages[mode] = null; mockupNames[mode] = ''; });
  updateMockupDropLabel();
});

new GLTFLoader().load('./assets/apple-product-viewer/product-viewer.gltf', (gltf) => {
  productRoot = gltf.scene;
  turntable = new THREE.Group();
  poseRig = new THREE.Group();
  accentRig = new THREE.Group();
  // 官网 LSD 的三个包装层分别使用 YXZ / ZYX / YXZ 欧拉顺序。
  // Three 的默认 XYZ 会在组合了 X=90°、Y=180° 的基准姿态后翻到侧面。
  turntable.rotation.order = 'YXZ';
  poseRig.rotation.order = 'ZYX';
  accentRig.rotation.order = 'YXZ';
  installDynamicScreens(gltf.scene, wallpaperRenderer);
  accentRig.add(gltf.scene);
  poseRig.add(accentRig);
  turntable.add(poseRig);
  scene.add(turntable);
  mixer = new THREE.AnimationMixer(gltf.scene);
  sliderAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Slider'));
  // Slider 默认使用 LoopRepeat；恰好采样到 2s 时会取模回到第 0 帧。
  // 折叠滑杆表达有限区间而非循环时间轴，因此必须把末帧钳制为稳定状态。
  sliderAction.setLoop(THREE.LoopOnce, 1);
  sliderAction.clampWhenFinished = true;
  sliderAction.play();
  sliderAction.paused = true;
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = bounds.getSize(new THREE.Vector3());
  frame = { center: bounds.getCenter(new THREE.Vector3()), distance: Math.max(size.x, size.y, size.z) * .9 };
  orbitControls = new OrbitControls(camera, canvas);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = .18;
  orbitControls.rotateSpeed = .45;
  orbitControls.zoomSpeed = .65;
  orbitControls.panSpeed = .45;
  orbitControls.minDistance = 16;
  orbitControls.maxDistance = 72;
  orbitControls.minPolarAngle = 1.1519173063162575;
  orbitControls.maxPolarAngle = 2.0943951023931953;
  orbitControls.target.copy(frame.center);
  resize();
  applyView(selected);
  setFold(currentFold);
  setViewMode(viewMode);
}, undefined, () => {
  status.textContent = 'Unable to load model. Reload to try again.';
  status.hidden = false;
});

createDeviceWallpaperRenderer(renderer).then((instance) => {
  wallpaperRenderer = instance;
  wallpaperRenderer.setLayerCount(viewMode === 'pipeline' ? selectedPipelineStage.layers : PASSES_LAYER_COUNT);
  Object.entries(mockupImages).forEach(([mode, image]) => { if (image) wallpaperRenderer.setCustomImage(image, [mode]); });
  applyMockupOptions();
  if (productRoot) installDynamicScreens(productRoot, wallpaperRenderer);
}).catch((error) => {
  console.error('Dynamic wallpaper failed to load; screens remain unlit.', error);
});

addEventListener('resize', resize);
resize();
requestAnimationFrame(tick);
