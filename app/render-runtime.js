/**
 * [INPUT]: 依赖 Three.js、EXRLoader、render-quality 像素预算、全屏 canvas 与 apple-product-viewer 环境贴图。
 * [OUTPUT]: 提供主场景/教学场景、相机、渲染器、独立背景色、自适应超采样、双层 PMREM 环境和绘制接口。
 * [POS]: app 的 WebGL 运行时边界；集中拥有画布质量与源场景光照基线，避免场景编排直接操作底层 renderer。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from '../assets/three.module.min.js?v=165';
import { EXRLoader } from '../assets/EXRLoader.js?v=165';
import { resolvePixelRatio } from './render-quality.js?v=1';

const PIPELINE_FALLBACK_ASPECT = 2670 / 1878;
const STUDIO_CAMERA_ZOOM = 1.8;

export function createRenderRuntime(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0xffffff, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .01, 100);
  camera.zoom = STUDIO_CAMERA_ZOOM;

  // 官网主体由分层 IBL 塑形；这里只保留克制的漫反射补偿，供 Three.js 的非金属材质使用。
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111216, .45));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
  keyLight.position.set(5, 6, 8);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xdde8ff, .18);
  fillLight.position.set(-5, 2, 4);
  scene.add(fillLight);

  const pipelineScene = new THREE.Scene();
  const pipelineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  pipelineCamera.position.z = 1;
  const pipelineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const pipelineQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pipelineMaterial);
  pipelineScene.add(pipelineQuad);
  let appliedPixelRatio = 0;

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    const pixelRatio = resolvePixelRatio(width, height);
    if (Math.abs(pixelRatio - appliedPixelRatio) > .01) {
      renderer.setPixelRatio(pixelRatio);
      appliedPixelRatio = pixelRatio;
    }
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // 窄屏按水平空间退让取景，避免全屏画布把模型两侧裁掉。
    camera.zoom = STUDIO_CAMERA_ZOOM * Math.min(1, camera.aspect);
    camera.updateProjectionMatrix();
    const texture = pipelineMaterial.map;
    const imageAspect = texture?.image?.width && texture?.image?.height ? texture.image.width / texture.image.height : PIPELINE_FALLBACK_ASPECT;
    const viewportAspect = width / height;
    pipelineQuad.scale.set(viewportAspect > imageAspect ? imageAspect / viewportAspect : 1, viewportAspect > imageAspect ? 1 : viewportAspect / imageAspect, 1);
  }

  function setPipelineTexture(texture) {
    if (!texture || pipelineMaterial.map === texture) return;
    pipelineMaterial.map = texture;
    pipelineMaterial.needsUpdate = true;
    resize();
  }

  function render(usePipelineScene) {
    renderer.render(usePipelineScene ? pipelineScene : scene, usePipelineScene ? pipelineCamera : camera);
  }

  function loadPmrem(url) {
    return new Promise((resolve, reject) => {
      new EXRLoader().load(url, (texture) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environment = pmrem.fromEquirectangular(texture).texture;
        texture.dispose();
        pmrem.dispose();
        resolve(environment);
      }, undefined, reject);
    });
  }

  async function loadMaterialEnvironments({ finishUrl, opticsUrl }) {
    const [finish, optics] = await Promise.all([loadPmrem(finishUrl), loadPmrem(opticsUrl)]);
    scene.environment = finish;
    scene.environmentRotation.set(0, 2.09, 0);
    return { finish, optics };
  }

  // 背景只影响画布清屏；环境光与透明 PNG 的独立离屏目标保持不变。
  const setBackground = (color) => renderer.setClearColor(color, 1);
  return { renderer, scene, camera, pipelineMaterial, resize, setPipelineTexture, render, loadMaterialEnvironments, setBackground };
}
