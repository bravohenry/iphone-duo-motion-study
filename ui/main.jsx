/**
 * [INPUT]: 依赖 React DOM、App、createViewer 以及静态入口中的 canvas/root。
 * [OUTPUT]: 每次页面加载只创建一个 WebGL viewer 和一个 React root。
 * [POS]: 浏览器启动边界；组件重渲染不会重新加载模型，HMR 卸载时释放渲染循环。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createRoot } from 'react-dom/client';
import { createViewer } from '../main.js';
import { App } from './App.jsx';
import './styles.css';

const viewer = createViewer(document.querySelector('#webgl'));
const root = createRoot(document.querySelector('#root'));
root.render(<App viewer={viewer} />);
if (import.meta.hot) import.meta.hot.dispose(() => { root.unmount(); viewer.dispose(); });
