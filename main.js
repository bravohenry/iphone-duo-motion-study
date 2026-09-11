/**
 * [INPUT]: 依赖 app 下的渲染、运动、Mockup、屏幕材质模块，以及 GLTF 设备模型与 wallpaper renderer。
 * [OUTPUT]: 组装 Mockup、Product Demo、WebGL Pipeline、透明 PNG 导出，并驱动唯一的应用渲染循环。
 * [POS]: iphone-duo-motion-study 的 composition root；只协调模块生命周期，不再持有各领域的内部交互状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from './assets/three.module.min.js?v=165';
import { GLTFLoader } from './assets/GLTFLoader.js?v=165';
import { PIPELINE_STAGES, PASSES_LAYER_COUNT } from './app/config.js?v=1';
import { createMockupController } from './app/mockup-controller.js?v=1';
import { createMotionController } from './app/motion-controller.js?v=3';
import { downloadTransparentPng } from './app/png-exporter.js?v=3';
import { createRenderRuntime } from './app/render-runtime.js?v=3';
import { installDynamicScreens } from './app/screen-materials.js?v=1';
import { createDeviceWallpaperRenderer } from './wallpaper-renderer.js?v=24';

const canvas = document.querySelector('#webgl');
const status = document.querySelector('#status');
const demoPanel = document.querySelector('.panel');
const pipelinePanel = document.querySelector('#pipeline-panel');
const pipelineStagesElement = document.querySelector('#pipeline-stages');
const stageDescription = document.querySelector('#stage-description');
const mockupPanel = document.querySelector('#mockup-panel');
const lessonTabs = [...document.querySelectorAll('.lesson-tab')];
const downloadPngButton = document.querySelector('#download-png');

const runtime = createRenderRuntime(canvas);
const motion = createMotionController({
  camera: runtime.camera,
  canvas,
  slider: document.querySelector('#fold'),
  foldValue: document.querySelector('#fold-value'),
  foldControls: document.querySelector('#fold-controls'),
  autoCenterButton: document.querySelector('#auto-center'),
  resetView: document.querySelector('#reset-view'),
  controlsElement: document.querySelector('#controls'),
});

let viewMode = 'mockup';
let wallpaperRenderer;
let productRoot;
let selectedPipelineStage = PIPELINE_STAGES[0];
const mockup = createMockupController({ status, getViewMode: () => viewMode });

function showError(message, error) {
  status.textContent = message;
  status.hidden = false;
  if (error) console.error(message, error);
}

function selectPipelineStage(stage) {
  selectedPipelineStage = stage;
  pipelineStagesElement.querySelectorAll('.pipeline-stage').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.stage === stage.id)));
  stageDescription.textContent = stage.description;
  wallpaperRenderer?.setLayerCount(stage.layers);
  runtime.setPipelineTexture(wallpaperRenderer?.getDebugTexture(stage.texture));
  if (productRoot) productRoot.visible = Boolean(stage.device);
  if (stage.device) motion.showPipelineDevice();
  runtime.resize();
}

PIPELINE_STAGES.forEach((stage) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pipeline-stage';
  button.dataset.stage = stage.id;
  button.setAttribute('aria-pressed', String(stage === selectedPipelineStage));
  button.textContent = stage.label;
  button.addEventListener('click', () => selectPipelineStage(stage));
  pipelineStagesElement.append(button);
});

function setViewMode(mode) {
  viewMode = mode;
  lessonTabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.view === mode)));
  demoPanel.hidden = mode !== 'demo' && mode !== 'mockup';
  mockupPanel.hidden = mode !== 'mockup';
  pipelinePanel.hidden = mode !== 'pipeline';
  downloadPngButton.hidden = mode === 'pipeline';
  motion.setViewMode(mode);
  if (productRoot) productRoot.visible = mode !== 'pipeline' || Boolean(selectedPipelineStage.device);
  if (mode === 'pipeline') selectPipelineStage(selectedPipelineStage);
  else wallpaperRenderer?.setLayerCount(PASSES_LAYER_COUNT);
}

lessonTabs.forEach((tab) => tab.addEventListener('click', () => setViewMode(tab.dataset.view)));

downloadPngButton.addEventListener('click', async () => {
  if (!productRoot || downloadPngButton.disabled) return;
  downloadPngButton.disabled = true;
  downloadPngButton.setAttribute('aria-busy', 'true');
  try {
    await downloadTransparentPng({ renderer: runtime.renderer, scene: runtime.scene, camera: runtime.camera });
    status.hidden = true;
  } catch (error) {
    showError('Unable to export a transparent PNG.', error);
  } finally {
    downloadPngButton.disabled = false;
    downloadPngButton.removeAttribute('aria-busy');
  }
});

runtime.loadEnvironment('./assets/apple-product-viewer/apple-environment.exr').catch((error) => {
  console.error('Environment map failed to load; direct lights remain active.', error);
});

new GLTFLoader().load('./assets/apple-product-viewer/product-viewer.gltf', (gltf) => {
  productRoot = gltf.scene;
  const turntable = new THREE.Group();
  const poseRig = new THREE.Group();
  const accentRig = new THREE.Group();
  // 官网 LSD 的三个包装层分别使用 YXZ / ZYX / YXZ 欧拉顺序。
  turntable.rotation.order = 'YXZ';
  poseRig.rotation.order = 'ZYX';
  accentRig.rotation.order = 'YXZ';
  installDynamicScreens(productRoot, wallpaperRenderer);
  accentRig.add(productRoot);
  poseRig.add(accentRig);
  turntable.add(poseRig);
  runtime.scene.add(turntable);

  const mixer = new THREE.AnimationMixer(productRoot);
  const sliderAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Slider'));
  // 折叠滑杆是有限区间；LoopRepeat 会让精确的 100% 取模回到第 0 帧。
  sliderAction.setLoop(THREE.LoopOnce, 1);
  sliderAction.clampWhenFinished = true;
  sliderAction.play();
  sliderAction.paused = true;

  const bounds = new THREE.Box3().setFromObject(productRoot);
  const frame = { center: bounds.getCenter(new THREE.Vector3()) };
  motion.attachModel({ mixer, sliderAction, turntable, poseRig, accentRig, productRoot, frame });
  downloadPngButton.disabled = false;
  resize();
  setViewMode(viewMode);
}, undefined, (error) => showError('Unable to load model. Reload to try again.', error));

createDeviceWallpaperRenderer(runtime.renderer).then((instance) => {
  wallpaperRenderer = instance;
  wallpaperRenderer.setLayerCount(viewMode === 'pipeline' ? selectedPipelineStage.layers : PASSES_LAYER_COUNT);
  mockup.setWallpaperRenderer(instance);
  if (productRoot) installDynamicScreens(productRoot, wallpaperRenderer);
  if (viewMode === 'pipeline') selectPipelineStage(selectedPipelineStage);
}).catch((error) => showError('Dynamic wallpaper failed to load; screens remain unlit.', error));

function resize() {
  runtime.resize();
  motion.updateOrbitControls();
}

function tick(now) {
  motion.tick(now);
  if (wallpaperRenderer) {
    wallpaperRenderer.setHinge(motion.getFold());
    wallpaperRenderer.render();
  }
  const inspectTarget = viewMode === 'pipeline' && !selectedPipelineStage.device;
  if (inspectTarget) runtime.setPipelineTexture(wallpaperRenderer?.getDebugTexture(selectedPipelineStage.texture));
  runtime.render(inspectTarget);
  requestAnimationFrame(tick);
}

addEventListener('resize', resize);
resize();
setViewMode(viewMode);
requestAnimationFrame(tick);
