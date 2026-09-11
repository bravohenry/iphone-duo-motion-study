/**
 * [INPUT]: 依赖本地 File/Image、wallpaper renderer 的合成接口，以及元数据/错误回调。
 * [OUTPUT]: 提供内外屏图片导入、目标裁切参数、清除与延迟绑定；不访问表单 DOM。
 * [POS]: app 的素材领域层；React 只保存选择状态，图片像素和每屏参数留在此层。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
const DEFAULT_OPTIONS = { fit: 'cover', zoom: 1, x: 0, y: 0 };
const modesFor = (target) => target === 'both' ? ['inner', 'outer'] : [target];

export function createMockupController({ onChange, onError }) {
  let wallpaperRenderer;
  let requestId = 0;
  const images = { inner: null, outer: null };
  const metadata = { inner: null, outer: null };
  const options = { inner: { ...DEFAULT_OPTIONS }, outer: { ...DEFAULT_OPTIONS } };
  const publish = () => onChange({ ...metadata });
  const getOptions = (target) => ({ ...options[target === 'outer' ? 'outer' : 'inner'] });

  function setOptions(patch, target) {
    modesFor(target).forEach((mode) => {
      options[mode] = { ...options[mode], ...patch };
      wallpaperRenderer?.setCustomOptions(options[mode], [mode]);
    });
  }

  async function loadFile(file, target = 'both') {
    if (!file) return false;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(file.type)) {
      onError('Choose a PNG, JPG, WebP or AVIF image.');
      return false;
    }
    if (file.size > 40 * 1024 * 1024) {
      onError('Choose an image smaller than 40 MB.');
      return false;
    }
    const id = ++requestId;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    try {
      await image.decode();
      if (id !== requestId) return false;
      modesFor(target).forEach((mode) => {
        images[mode] = image;
        metadata[mode] = { name: file.name, width: image.naturalWidth, height: image.naturalHeight };
        wallpaperRenderer?.setCustomImage(image, [mode]);
        wallpaperRenderer?.setCustomOptions(options[mode], [mode]);
      });
      publish();
      return true;
    } catch {
      onError('This image could not be decoded.');
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function clearImage(target) {
    requestId++;
    const modes = modesFor(target);
    modes.forEach((mode) => {
      images[mode] = null;
      metadata[mode] = null;
      options[mode] = { ...DEFAULT_OPTIONS };
    });
    wallpaperRenderer?.clearCustomImage(modes);
    publish();
  }

  function setWallpaperRenderer(instance) {
    wallpaperRenderer = instance;
    Object.entries(images).forEach(([mode, image]) => {
      if (image) wallpaperRenderer.setCustomImage(image, [mode]);
      wallpaperRenderer.setCustomOptions(options[mode], [mode]);
    });
  }

  return { setWallpaperRenderer, loadFile, clearImage, getOptions, setOptions };
}
