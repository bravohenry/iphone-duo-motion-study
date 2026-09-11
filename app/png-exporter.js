/**
 * [INPUT]: 依赖 Three.js renderer、当前设备 scene/camera 与浏览器 Canvas/Blob 下载能力。
 * [OUTPUT]: 提供将当前 3D 视角以 SSAA 离屏渲染、降采样、Alpha 紧边裁切并下载为透明 PNG 的异步接口。
 * [POS]: app 的文件导出边界；隔离 GPU 回读、透明边缘恢复、高质量缩放与内容包围盒裁切，不污染实时画布配置。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import * as THREE from '../assets/three.module.min.js?v=165';

const EXPORT_SSAA = 1.5;
const MAX_EXPORT_RENDER_PIXELS = 14_000_000;
const ALPHA_THRESHOLD = 2;
const MIN_CROP_PADDING = 8;
const MAX_CROP_PADDING = 32;

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

function resolveRenderSize(width, height, maxTextureSize) {
  const pixelBudgetScale = Math.sqrt(MAX_EXPORT_RENDER_PIXELS / Math.max(1, width * height));
  const textureScale = Math.min(maxTextureSize / width, maxTextureSize / height);
  const scale = Math.max(1, Math.min(EXPORT_SSAA, pixelBudgetScale, textureScale));
  return {
    width: Math.max(width, Math.floor(width * scale)),
    height: Math.max(height, Math.floor(height * scale)),
    scale,
  };
}

function cropToAlphaBounds(sourceCanvas) {
  const { width, height } = sourceCanvas;
  const sourceContext = sourceCanvas.getContext('2d');
  const pixels = sourceContext.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return { canvas: sourceCanvas, bounds: null };

  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const padding = Math.max(MIN_CROP_PADDING, Math.min(MAX_CROP_PADDING, Math.round(Math.max(contentWidth, contentHeight) * .02)));
  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width, maxX + padding + 1);
  const bottom = Math.min(height, maxY + padding + 1);
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = right - left;
  croppedCanvas.height = bottom - top;
  croppedCanvas.getContext('2d').drawImage(sourceCanvas, left, top, croppedCanvas.width, croppedCanvas.height, 0, 0, croppedCanvas.width, croppedCanvas.height);
  return { canvas: croppedCanvas, bounds: { left, top, right, bottom, padding } };
}

export async function downloadTransparentPng({ renderer, scene, camera, filename = 'iphone-duo-mockup.png' }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const width = Math.max(1, Math.floor(size.x));
  const height = Math.max(1, Math.floor(size.y));
  const renderSize = resolveRenderSize(width, height, renderer.capabilities.maxTextureSize);
  const target = new THREE.WebGLRenderTarget(renderSize.width, renderSize.height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    samples: renderer.capabilities.isWebGL2 ? 4 : 0,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;

  const previousTarget = renderer.getRenderTarget();
  const previousColor = renderer.getClearColor(new THREE.Color()).clone();
  const previousAlpha = renderer.getClearAlpha();
  const pixels = new Uint8Array(renderSize.width * renderSize.height * 4);
  try {
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    // 切回原目标会先解析 multisample buffer，随后再从已解析的颜色纹理回读。
    renderer.setRenderTarget(previousTarget);
    renderer.readRenderTargetPixels(target, 0, 0, renderSize.width, renderSize.height, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    target.dispose();
  }

  const supersampledCanvas = document.createElement('canvas');
  supersampledCanvas.width = renderSize.width;
  supersampledCanvas.height = renderSize.height;
  const supersampledContext = supersampledCanvas.getContext('2d');
  supersampledContext.putImageData(new ImageData(flipAndUnpremultiply(pixels, renderSize.width, renderSize.height), renderSize.width, renderSize.height), 0, 0);

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = width;
  exportCanvas.height = height;
  const context = exportCanvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, width, height);
  context.drawImage(supersampledCanvas, 0, 0, width, height);
  const cropped = cropToAlphaBounds(exportCanvas);
  const blob = await canvasToBlob(cropped.canvas);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return { width: cropped.canvas.width, height: cropped.canvas.height, sourceWidth: width, sourceHeight: height, renderWidth: renderSize.width, renderHeight: renderSize.height, sampleScale: renderSize.scale, cropBounds: cropped.bounds, bytes: blob.size };
}
