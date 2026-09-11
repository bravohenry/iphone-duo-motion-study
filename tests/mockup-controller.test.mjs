/**
 * [INPUT]: 依赖 Node test/assert、mockup-controller 与产品配置；Image.decode 用受控测试替身。
 * [OUTPUT]: 验证六形态默认值、每屏裁切隔离、导入竞态、重置和文件边界。
 * [POS]: 无 GPU 的领域回归测试；不代替真实浏览器图片解码或 WebGL 验收。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockupController } from '../app/mockup-controller.js';
import { PRODUCT_STATES } from '../app/config.js';

function fixture(t) {
  const pending = [];
  const events = [];
  const previous = globalThis.Image;
  globalThis.Image = class {
    naturalWidth = 1200;
    naturalHeight = 800;
    decode() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); }
  };
  t.after(() => { if (previous) globalThis.Image = previous; else delete globalThis.Image; });
  const controller = createMockupController({
    onChange: (metadata) => events.push({ metadata }),
    onError: (error) => events.push({ error }),
  });
  const file = (name = 'design.png') => new File(['test pixels'], name, { type: 'image/png' });
  return { controller, pending, events, file };
}

test('Closed 是首个默认形态，六形态唯一且没有 Durability', () => {
  assert.deepEqual(PRODUCT_STATES.map(({ id }) => id), ['closed', 'foldable', 'landscape', 'portrait', 'seated', 'standing']);
  assert.equal(PRODUCT_STATES[0].fold, 0);
  assert.deepEqual(PRODUCT_STATES.filter(({ interactive }) => interactive).map(({ id }) => id), ['foldable']);
});

test('裁切参数是每屏独立的拷贝，both 修改才同时应用', (t) => {
  const { controller } = fixture(t);
  controller.setOptions({ zoom: 2, x: .4 }, 'inner');
  assert.equal(controller.getOptions('outer').zoom, 1);
  const snapshot = controller.getOptions('inner');
  snapshot.zoom = 99;
  assert.equal(controller.getOptions('inner').zoom, 2);
  controller.setOptions({ fit: 'contain' }, 'both');
  assert.equal(controller.getOptions('outer').fit, 'contain');
  assert.equal(controller.getOptions('inner').fit, 'contain');
});

test('图片可在 renderer 准备前导入，延迟绑定保留每屏数据', async (t) => {
  const { controller, pending, file, events } = fixture(t);
  const importing = controller.loadFile(file(), 'outer');
  pending[0].resolve();
  assert.equal(await importing, true);
  const calls = [];
  controller.setWallpaperRenderer({
    setCustomImage: (_image, targets) => calls.push(targets),
    setCustomOptions() {},
  });
  assert.deepEqual(calls, [['outer']]);
  assert.equal(events[0].metadata.inner, null);
  assert.equal(events[0].metadata.outer.width, 1200);
});

test('新导入胜出，较慢的旧导入不能覆盖当前图片', async (t) => {
  const { controller, pending, file, events } = fixture(t);
  const first = controller.loadFile(file('first.png'), 'both');
  const second = controller.loadFile(file('second.png'), 'both');
  pending[1].resolve();
  assert.equal(await second, true);
  pending[0].resolve();
  assert.equal(await first, false);
  assert.equal(events.length, 1);
  assert.equal(events[0].metadata.inner.name, 'second.png');
});

test('Reset 清除图片和参数，并取消尚未完成的导入', async (t) => {
  const { controller, pending, file, events } = fixture(t);
  controller.setOptions({ zoom: 2.5, y: .7 }, 'both');
  const importing = controller.loadFile(file(), 'both');
  controller.clearImage('both');
  pending[0].resolve();
  assert.equal(await importing, false);
  assert.deepEqual(controller.getOptions('inner'), { fit: 'cover', zoom: 1, x: 0, y: 0 });
  assert.deepEqual(events.at(-1).metadata, { inner: null, outer: null });
});

test('非图片、超出 40 MB 和解码失败均返回可读错误', async (t) => {
  const { controller, pending, events, file } = fixture(t);
  assert.equal(await controller.loadFile({ type: 'text/plain', size: 20 }), false);
  assert.equal(await controller.loadFile({ type: 'image/png', size: 41 * 1024 * 1024 }), false);
  const importing = controller.loadFile(file());
  pending[0].reject(new Error('bad image'));
  assert.equal(await importing, false);
  assert.equal(events.filter(({ error }) => error).length, 3);
});
