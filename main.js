/**
 * [INPUT]: 依赖 app 的渲染/运动/素材/导出模块，以及 GLTF 和动态壁纸；仅接收一个 canvas。
 * [OUTPUT]: 提供 createViewer 与可订阅状态/命令接口，装配三种视图及唯一 WebGL 渲染循环。
 * [POS]: Duo Mock 的 composition root；React 不持有场景对象，模型加载不随组件重渲染执行。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from './assets/three.module.min.js?v=165';
import { GLTFLoader } from './assets/GLTFLoader.js?v=165';
import { PIPELINE_STAGES, PASSES_LAYER_COUNT, PRODUCT_STATES } from './app/config.js?v=1';
import { applySourceMaterialFidelity } from './app/material-fidelity.js?v=4';
import { createMockupController } from './app/mockup-controller.js';
import { createMotionController } from './app/motion-controller.js';
import { downloadTransparentPng } from './app/png-exporter.js?v=3';
import { createRenderRuntime } from './app/render-runtime.js';
import { installDynamicScreens } from './app/screen-materials.js?v=1';
import { createDeviceWallpaperRenderer } from './wallpaper-renderer.js?v=24';

export function createViewer(canvas) {
  let state = { ready: false, error: null, exporting: false, pose: PRODUCT_STATES[0].id, fold: PRODUCT_STATES[0].fold, mode: 'mockup', pipeline: 'sky', artwork: { inner: null, outer: null } };
  const listeners = new Set();
  function publish(patch) {
    if (Object.entries(patch).every(([key, value]) => Object.is(state[key], value))) return;
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }
  const runtime = createRenderRuntime(canvas);
  runtime.setBackground('#080809');
  const motion = createMotionController({
    camera: runtime.camera,
    canvas,
    onChange: (patch) => publish({ ...patch, fold: Math.round(patch.fold * 1000) / 1000 }),
  });
  const mockup = createMockupController({ onChange: (artwork) => publish({ artwork }), onError: (error) => publish({ error }) });
  let wallpaperRenderer;
  let productRoot;
  let selectedPipelineStage = PIPELINE_STAGES[0];
  let animationFrame;
  const readyParts = new Set();

  function markReady(part) {
    readyParts.add(part);
    if (readyParts.size === 3) publish({ ready: true });
  }
  function showError(message, error) {
    publish({ error: message });
    if (error) console.error(message, error);
  }
  function selectPipelineStage(id) {
    const stage = PIPELINE_STAGES.find((entry) => entry.id === id);
    if (!stage) return;
    selectedPipelineStage = stage;
    publish({ pipeline: id });
    wallpaperRenderer?.setLayerCount(stage.layers);
    runtime.setPipelineTexture(wallpaperRenderer?.getDebugTexture(stage.texture));
    if (productRoot) productRoot.visible = Boolean(stage.device);
    if (stage.device) motion.showPipelineDevice();
    runtime.resize();
  }
  function setMode(mode) {
    if (state.mode === mode) return;
    publish({ mode });
    motion.setViewMode(mode);
    if (productRoot) productRoot.visible = mode !== 'pipeline' || Boolean(selectedPipelineStage.device);
    if (mode === 'pipeline') selectPipelineStage(selectedPipelineStage.id);
    else wallpaperRenderer?.setLayerCount(PASSES_LAYER_COUNT);
  }
  async function exportPng() {
    if (!state.ready || state.exporting) return;
    publish({ exporting: true, error: null });
    try {
      await downloadTransparentPng({ renderer: runtime.renderer, scene: runtime.scene, camera: runtime.camera });
    } catch (error) {
      showError('Unable to export a transparent PNG.', error);
    } finally {
      publish({ exporting: false });
    }
  }

  const environmentsPromise = runtime.loadMaterialEnvironments({
    finishUrl: './assets/apple-product-viewer/apple-environment.exr',
    opticsUrl: './assets/apple-product-viewer/apple-environment-alt.exr',
  }).catch((error) => {
    console.warn('Environment map failed to load; direct lights remain active.', error);
    return {};
  });
  new GLTFLoader().load('./assets/apple-product-viewer/product-viewer.gltf', (gltf) => {
    productRoot = gltf.scene;
    const turntable = new THREE.Group();
    const poseRig = new THREE.Group();
    const accentRig = new THREE.Group();
    // 保留官网包装层的欧拉顺序，避免跨姿态发生翻转。
    turntable.rotation.order = 'YXZ';
    poseRig.rotation.order = 'ZYX';
    accentRig.rotation.order = 'YXZ';
    installDynamicScreens(productRoot, wallpaperRenderer);
    applySourceMaterialFidelity(productRoot);
    environmentsPromise.then((environments) => {
      applySourceMaterialFidelity(productRoot, environments);
      markReady('materials');
    });
    accentRig.add(productRoot);
    poseRig.add(accentRig);
    turntable.add(poseRig);
    runtime.scene.add(turntable);
    const mixer = new THREE.AnimationMixer(productRoot);
    const sliderAction = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'Slider'));
    // LoopOnce 保证精确的 100% 不会取模回闭合状态。
    sliderAction.setLoop(THREE.LoopOnce, 1);
    sliderAction.clampWhenFinished = true;
    sliderAction.play();
    sliderAction.paused = true;
    const bounds = new THREE.Box3().setFromObject(productRoot);
    const frame = { center: bounds.getCenter(new THREE.Vector3()) };
    motion.attachModel({ mixer, sliderAction, turntable, poseRig, accentRig, productRoot, frame });
    motion.setViewMode(state.mode);
    markReady('model');
    resize();
  }, undefined, (error) => showError('Unable to load the model. Reload to try again.', error));
  createDeviceWallpaperRenderer(runtime.renderer).then((instance) => {
    wallpaperRenderer = instance;
    wallpaperRenderer.setLayerCount(state.mode === 'pipeline' ? selectedPipelineStage.layers : PASSES_LAYER_COUNT);
    mockup.setWallpaperRenderer(instance);
    if (productRoot) installDynamicScreens(productRoot, wallpaperRenderer);
    if (state.mode === 'pipeline') selectPipelineStage(selectedPipelineStage.id);
    markReady('screens');
  }).catch((error) => showError('Unable to load screen textures. Reload to try again.', error));

  function resize() { runtime.resize(); motion.updateOrbitControls(); }
  function tick(now) {
    motion.tick(now);
    if (wallpaperRenderer) {
      wallpaperRenderer.setHinge(motion.getFold());
      wallpaperRenderer.render();
    }
    const inspectTarget = state.mode === 'pipeline' && !selectedPipelineStage.device;
    if (inspectTarget) runtime.setPipelineTexture(wallpaperRenderer?.getDebugTexture(selectedPipelineStage.texture));
    runtime.render(inspectTarget);
    animationFrame = requestAnimationFrame(tick);
  }
  addEventListener('resize', resize);
  resize();
  animationFrame = requestAnimationFrame(tick);

  return {
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => state,
    selectPose: motion.selectPose,
    scrub: motion.scrub,
    resetView: motion.resetView,
    setBackground: runtime.setBackground,
    setMode,
    selectPipelineStage,
    exportPng,
    loadImage: (file, target) => { publish({ error: null }); return mockup.loadFile(file, target); },
    clearImage: mockup.clearImage,
    getImageOptions: mockup.getOptions,
    setImageOptions: mockup.setOptions,
    clearError: () => publish({ error: null }),
    dispose: () => { cancelAnimationFrame(animationFrame); removeEventListener('resize', resize); motion.dispose(); runtime.renderer.dispose(); },
  };
}
