/**
 * [INPUT]: 依赖 Three.js、OrbitControls、姿态配置、Slider action、设备 rig 与状态通知回调。
 * [OUTPUT]: 提供可中断六姿态、手动折叠、自由相机、默认居中及逐帧更新；不操作 UI DOM。
 * [POS]: app 的设备运动领域层；独占折叠/相机状态，使主循环只读取 fold 并触发 tick。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from '../assets/three.module.min.js?v=165';
import { OrbitControls } from '../assets/OrbitControls.js?v=165';
import { CLIP_SECONDS, PRODUCT_STATES } from './config.js?v=1';

const DEFAULT_ORBIT = { radius: 35, phi: Math.PI / 2, theta: Math.PI };
const RIG_DEFAULTS = {
  primary: { position: [0, 0, 0], rotation: [Math.PI / 2, Math.PI, 0] },
  pose: { position: [0, 0, 0], rotation: [0, 0, 0] },
  accent: { position: [0, 0, 0], rotation: [0, 0, 0] },
};

function normalizeFold(value) { return Math.max(0, Math.min(1, Number(value))); }
function easeOutCubic(value) { return 1 - Math.pow(1 - value, 3); }
function easeInFastOut(value) { return 2 * Math.pow(value, 3) - Math.pow(value, 6); }
function lerpAngle(from, to, amount) {
  const delta = THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
  return from + delta * amount;
}

export function createMotionController({ camera, canvas, onChange = () => {} }) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let selected = PRODUCT_STATES[0];
  let currentFold = selected.fold;
  let transition = null;
  let mixer;
  let sliderAction;
  let turntable;
  let poseRig;
  let accentRig;
  let productRoot;
  let frame;
  let orbitControls;
  let viewMode = 'mockup';
  let previousTime = 0;
  const orbit = new THREE.Spherical();
  const productBounds = new THREE.Box3();
  const viewCenter = new THREE.Vector3();

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
    setTransform(turntable, transformFor(state, 'primary', RIG_DEFAULTS.primary));
    setTransform(poseRig, transformFor(state, 'pose', RIG_DEFAULTS.pose));
    setTransform(accentRig, transformFor(state, 'accent', RIG_DEFAULTS.accent));
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

  function setFold(value) {
    currentFold = normalizeFold(value);
    publish();
    if (!mixer || !sliderAction) return;
    sliderAction.enabled = true;
    sliderAction.paused = false;
    mixer.setTime(currentFold * CLIP_SECONDS);
    sliderAction.paused = true;
  }

  function orbitFor(state) {
    if (!frame) return;
    if (!state.orbit) return { ...DEFAULT_ORBIT };
    const [radius, phi, theta] = state.orbit;
    return { radius, phi, theta };
  }

  function centerForCurrentView() {
    const shouldFollow = (viewMode === 'mockup' || viewMode === 'demo') && productRoot;
    if (!shouldFollow) return viewCenter.copy(frame.center);
    // SkinnedMesh.updateMatrixWorld 还会更新 bindMatrixInverse；普通 updateWorldMatrix
    // 不走此钩子，首帧会用旧绑定矩阵算出偏离整机的中心，直到下一次 Reset 才恢复。
    turntable.updateMatrixWorld(true);
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

  function applyView(state) {
    const targetOrbit = orbitFor(state);
    if (!targetOrbit) return;
    Object.assign(orbit, targetOrbit);
    setRigState(state);
    applyOrbit();
  }

  function publish() {
    onChange({ pose: selected.id, fold: currentFold });
  }

  function finishTransition(target) {
    transition = null;
    setFold(target.fold);
    applyView(target);
  }

  function transitionProfile(from, to) {
    if (from.id === 'foldable' && to.id === 'landscape') return { duration: 1000, easing: easeInFastOut };
    return { duration: 620, easing: easeOutCubic };
  }

  function selectState(target) {
    syncOrbitFromCamera();
    const from = selected;
    selected = target;
    publish();
    const profile = transitionProfile(from, target);
    const duration = reducedMotion ? 0 : profile.duration;
    const targetOrbit = orbitFor(target);
    const targetRig = Object.fromEntries(Object.entries(RIG_DEFAULTS).map(([key, defaults]) => [key, transformFor(target, key, defaults)]));
    transition = { target, fromFold: currentFold, fromOrbit: { ...orbit }, targetOrbit, fromRig: getRigState(), targetRig, start: performance.now(), duration, easing: profile.easing };
    if (duration === 0) finishTransition(target);
  }

  function scrub(value) {
    if (!selected.interactive) return;
    transition = null;
    setFold(value);
    syncOrbitFromCamera();
    applyOrbit();
  }

  const revealFreeView = () => { transition = null; };
  canvas.addEventListener('pointerdown', revealFreeView);
  canvas.addEventListener('wheel', revealFreeView, { passive: true });
  function resetView() { transition = null; applyView(selected); }

  function attachModel(model) {
    ({ mixer, sliderAction, turntable, poseRig, accentRig, productRoot, frame } = model);
    orbitControls = new OrbitControls(camera, canvas);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = .18;
    orbitControls.rotateSpeed = .45;
    orbitControls.zoomSpeed = .65;
    orbitControls.panSpeed = .45;
    orbitControls.minDistance = 16;
    orbitControls.maxDistance = 72;
    orbitControls.target.copy(frame.center);
    setViewMode(viewMode);
  }

  function setViewMode(mode) {
    viewMode = mode;
    if (orbitControls) {
      orbitControls.minPolarAngle = mode === 'mockup' ? .08 : 1.1519173063162575;
      orbitControls.maxPolarAngle = mode === 'mockup' ? Math.PI - .08 : 2.0943951023931953;
      orbitControls.enablePan = true;
    }
    if ((mode === 'demo' || mode === 'mockup') && frame) {
      setFold(selected.fold);
      applyView(selected);
    }
    publish();
  }

  function showPipelineDevice() {
    if (!frame) return;
    setFold(.72);
    Object.assign(orbit, DEFAULT_ORBIT);
    setRigState(PRODUCT_STATES.find((state) => state.id === 'foldable'));
    applyOrbit();
  }

  function tick(now) {
    const delta = previousTime ? Math.min((now - previousTime) / 1000, .05) : 0;
    previousTime = now;
    if (transition) {
      const elapsed = transition.duration === 0 ? 1 : Math.min(1, (now - transition.start) / transition.duration);
      const progress = transition.easing(elapsed);
      setFold(THREE.MathUtils.lerp(transition.fromFold, transition.target.fold, progress));
      // 先更新机身再算几何中心，让姿态过渡中的目标点与本帧骨骼保持同步。
      interpolateTransform(turntable, transition.fromRig.primary, transition.targetRig.primary, progress);
      interpolateTransform(poseRig, transition.fromRig.pose, transition.targetRig.pose, progress);
      interpolateTransform(accentRig, transition.fromRig.accent, transition.targetRig.accent, progress);
      if (transition.targetOrbit) {
        orbit.radius = THREE.MathUtils.lerp(transition.fromOrbit.radius, transition.targetOrbit.radius, progress);
        orbit.phi = THREE.MathUtils.lerp(transition.fromOrbit.phi, transition.targetOrbit.phi, progress);
        orbit.theta = lerpAngle(transition.fromOrbit.theta, transition.targetOrbit.theta, progress);
        applyOrbit();
      }
      if (elapsed === 1) finishTransition(transition.target);
    }
    orbitControls?.update(delta);
  }

  return {
    attachModel,
    setViewMode,
    showPipelineDevice,
    tick,
    getFold: () => currentFold,
    selectPose: (id) => { const target = PRODUCT_STATES.find((state) => state.id === id); if (target && frame) selectState(target); },
    scrub,
    resetView,
    dispose: () => {
      orbitControls?.dispose();
      canvas.removeEventListener('pointerdown', revealFreeView);
      canvas.removeEventListener('wheel', revealFreeView);
    },
    updateOrbitControls: () => orbitControls?.update(),
  };
}
