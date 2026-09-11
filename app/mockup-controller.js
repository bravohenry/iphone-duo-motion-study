/**
 * [INPUT]: 依赖 Mockup 面板 DOM、状态提示元素、当前视图读取器与 wallpaper renderer 的图片合成接口。
 * [OUTPUT]: 提供图片上传/拖放、内外屏目标、cover/contain 与裁切参数控制，以及延迟绑定 renderer 的接口。
 * [POS]: app 的本地素材输入层；持有用户图片状态，但不触碰 Three.js 场景与设备运动状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export function createMockupController({ status, getViewMode }) {
  const fileInput = document.querySelector('#mockup-file');
  const dropTarget = document.querySelector('#mockup-drop');
  const clearButton = document.querySelector('#mockup-clear');
  const targetButtons = [...document.querySelectorAll('#mockup-targets button')];
  const fitControl = document.querySelector('#mockup-fit');
  const zoomControl = document.querySelector('#mockup-zoom');
  const xControl = document.querySelector('#mockup-x');
  const yControl = document.querySelector('#mockup-y');
  let wallpaperRenderer;
  let mockupTarget = 'both';
  const images = { inner: null, outer: null };
  const names = { inner: '', outer: '' };

  function targetModes(target = mockupTarget) {
    return target === 'both' ? ['inner', 'outer'] : [target];
  }

  function currentOptions() {
    return { fit: fitControl.value, zoom: Number(zoomControl.value), x: Number(xControl.value), y: Number(yControl.value) };
  }

  function applyOptions() {
    wallpaperRenderer?.setCustomOptions(currentOptions(), targetModes());
  }

  function updateDropLabel() {
    const modes = targetModes();
    const selectedNames = [...new Set(modes.map((mode) => names[mode]).filter(Boolean))];
    const title = selectedNames.length === 1 ? selectedNames[0] : selectedNames.length > 1 ? 'Different images' : 'Choose an image';
    const detail = selectedNames.length ? 'drop another to replace' : 'or drop PNG, JPG, WebP or AVIF';
    dropTarget.querySelector('strong').textContent = title;
    dropTarget.querySelector('span').textContent = detail;
  }

  function syncControls() {
    const mode = mockupTarget === 'outer' ? 'outer' : 'inner';
    const options = wallpaperRenderer?.getCustomOptions(mode) || { fit: 'cover', zoom: 1, x: 0, y: 0 };
    fitControl.value = options.fit;
    zoomControl.value = String(options.zoom);
    xControl.value = String(options.x);
    yControl.value = String(options.y);
    updateDropLabel();
  }

  async function loadFile(file) {
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
      modes.forEach((mode) => { images[mode] = image; names[mode] = file.name; });
      wallpaperRenderer?.setCustomImage(image, modes);
      applyOptions();
      updateDropLabel();
      dropTarget.querySelector('span').textContent = `${image.naturalWidth} × ${image.naturalHeight} · drop another to replace`;
      status.hidden = true;
    } catch {
      status.textContent = 'This image could not be decoded.';
      status.hidden = false;
    } finally {
      URL.revokeObjectURL(url);
      fileInput.value = '';
    }
  }

  fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
  dropTarget.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.click(); }
  });
  ['dragenter', 'dragover'].forEach((type) => addEventListener(type, (event) => {
    if (getViewMode() !== 'mockup') return;
    event.preventDefault();
    dropTarget.dataset.active = 'true';
  }));
  ['dragleave', 'drop'].forEach((type) => addEventListener(type, (event) => {
    if (getViewMode() !== 'mockup') return;
    event.preventDefault();
    dropTarget.dataset.active = 'false';
    if (type === 'drop') loadFile(event.dataTransfer?.files[0]);
  }));
  targetButtons.forEach((button) => button.addEventListener('click', () => {
    mockupTarget = button.dataset.target;
    targetButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    syncControls();
  }));
  [fitControl, zoomControl, xControl, yControl].forEach((control) => control.addEventListener('input', applyOptions));
  clearButton.addEventListener('click', () => {
    const modes = targetModes();
    wallpaperRenderer?.clearCustomImage(modes);
    modes.forEach((mode) => { images[mode] = null; names[mode] = ''; });
    updateDropLabel();
  });

  function setWallpaperRenderer(instance) {
    wallpaperRenderer = instance;
    Object.entries(images).forEach(([mode, image]) => { if (image) wallpaperRenderer.setCustomImage(image, [mode]); });
    applyOptions();
    syncControls();
  }

  return { setWallpaperRenderer };
}
