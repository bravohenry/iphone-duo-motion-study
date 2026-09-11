/**
 * [INPUT]: 依赖 Vite、React 与 Tailwind 插件，以及本地 Three.js 静态资源目录。
 * [OUTPUT]: 提供 React 控件编译与静态模型资源复制，保持原有 foldable-v2 URL。
 * [POS]: 构建边界；只打包应用代码，不重编码 Apple 模型、贴图和 EXR。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { cp } from 'node:fs/promises';

export default defineConfig({
  server: { headers: { 'Cache-Control': 'no-store' } },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-original-media',
      async closeBundle() {
        await Promise.all(['assets', 'shaders', 'libs'].map((directory) => cp(directory, `dist/${directory}`, { recursive: true })));
      },
    },
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./ui', import.meta.url)), three: fileURLToPath(new URL('./assets/three.module.min.js', import.meta.url)) + '?v=165' } },
  build: { rollupOptions: { input: ['index.html', 'foldable-v2.html'], output: { chunkFileNames: 'build/[name]-[hash].js', entryFileNames: 'build/[name]-[hash].js', assetFileNames: 'build/[name]-[hash][extname]' } } },
});
