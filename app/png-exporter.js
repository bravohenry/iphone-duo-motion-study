/**
 * [INPUT]: 依赖 Three.js renderer、当前设备 scene/camera 与浏览器 Canvas/Blob 下载能力。
 * [OUTPUT]: 提供将当前 3D 视角离屏渲染并下载为透明 PNG 的异步接口。
 * [POS]: app 的文件导出边界；隔离 GPU 像素回读、Y 轴翻转和透明边缘颜色恢复，不污染实时画布配置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from '../assets/three.module.min.js?v=165';

function flipAndUnpremultiply(source, width, height) {
  const output = new Uint8ClampedArray(source.length);
  const rowBytes = width * 4;
  for (let y = 0; y < height; y += 1) {
    const sourceRow = (height - 1 - y) * rowBytes;
    const outputRow = y * rowBytes;
    for (let x = 0; x < rowBytes; x += 4) {
      const sourceIndex = sourceRow + x;
      const outputIndex = outputRow + x;
      const alpha = source[sourceIndex + 3];
      const scale = alpha > 0 && alpha < 255 ? 255 / alpha : 1;
      output[outputIndex] = Math.min(255, Math.round(source[sourceIndex] * scale));
      output[outputIndex + 1] = Math.min(255, Math.round(source[sourceIndex + 1] * scale));
      output[outputIndex + 2] = Math.min(255, Math.round(source[sourceIndex + 2] * scale));
      output[outputIndex + 3] = alpha;
    }
  }
  return output;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG encoding failed.')), 'image/png');
  });
}

export async function downloadTransparentPng({ renderer, scene, camera, filename = 'iphone-duo-mockup.png' }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const width = Math.max(1, Math.floor(size.x));
  const height = Math.max(1, Math.floor(size.y));
  const target = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    samples: renderer.capabilities.isWebGL2 ? 4 : 0,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;

  const previousTarget = renderer.getRenderTarget();
  const previousColor = renderer.getClearColor(new THREE.Color()).clone();
  const previousAlpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(width * height * 4);
  try {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    // 切回原目标会先解析 multisample buffer，随后再从已解析的颜色纹理回读。
    renderer.setRenderTarget(previousTarget);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    target.dispose();
  }

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const context = exportCanvas.getContext('2d');
  context.putImageData(new ImageData(flipAndUnpremultiply(pixels, width, height), width, height), 0, 0);
  const blob = await canvasToBlob(exportCanvas);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return { width, height, bytes: blob.size };
}
