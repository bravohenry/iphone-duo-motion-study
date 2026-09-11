/**
 * [INPUT]: 依赖 React useSyncExternalStore 和 viewer 的不可变订阅快照。
 * [OUTPUT]: 提供按字段订阅的 useViewer，折叠逐帧数据只重渲染对应控件。
 * [POS]: React 与命令式 WebGL 之间的读取边界；不复制模型/相机到 React state。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useSyncExternalStore } from 'react';
export function useViewer(viewer, key) {
  return useSyncExternalStore(viewer.subscribe, () => viewer.getSnapshot()[key]);
}
