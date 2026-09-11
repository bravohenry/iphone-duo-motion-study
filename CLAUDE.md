# Duo Mock - 可自由构图的折叠设备 Mockup 工作台

React 19.3 + Vite 6.4 + Tailwind CSS 4.3 + shadcn Radix Nova + Three.js r165

<directory>
ui/ - React 界面与基础控件 (2 子目录: components、lib)；不持有 Three.js 场景对象
app/ - 运动、素材、质量与 PNG 导出领域模块；只通过 viewer 状态/命令接口服务 UI
tests/ - 无 GPU 的图片状态/竞态与产品姿态契约回归；真实渲染另行浏览器验证
assets/ - 原始模型、EXR、屏幕素材、本地 Three.js、Phosphor SVG 与 TikTok Display 标题字体
shaders/ - 原始壁纸、双向模糊与设备局部 Wipe 着色流程
math/ - 壁纸运动矩阵工具
libs/ - 原始纹理解码依赖
utils/ - 原始加载辅助工具
evidence/ - 历史资源溯源与本轮工作台验证证据；不进入应用构建
</directory>

<config>
main.js - createViewer(canvas) 组合根；单例 WebGL 生命周期、订阅状态及语义命令
wallpaper-renderer.js - RGBA16F 屏幕流水线、自定义图片、Frame/Blur/Wipe 与调试纹理
index.html - 生产根入口，挂载与 foldable-v2.html 相同的 React 应用
foldable-v2.html - 保留已有链接的 React HTML 宿主，无业务状态或事件处理
foldable.html - 旧链接跳转至当前工作台
research.html - 早期独立 model-viewer 研究页面快照，不进入生产构建
package.json / package-lock.json - npm 脚本与锁定的依赖图；不再使用 Python 静态服务启动当前工作台
.npmrc - 将项目安装源固定为公共 npm registry，避免本机内网镜像进入 Vercel 构建
vite.config.js - React/Tailwind 编译、单实例 Three.js alias、原始静态资源复制；构建至 dist/
components.json - 官方 shadcn Radix Nova 配置，JS、Lucide、ui/ 路径别名
jsconfig.json - @/* 对应 ui/*，供编辑器和 shadcn CLI 识别
vercel.json - npm 构建 dist/，保留 cleanUrls 下根路径到 /foldable-v2 的重写
.gitignore / .vercelignore - 排除本地依赖、构建缓存、部署链接与研究证据
README.md - 使用、功能、React/3D 边界和资源来源
design-qa.md - 本轮 React 工作台的实测结果与剩余限制
scout-card.json / replay-manifest.json - 原始资源与重放层级的历史审计记录
known-gaps.md / qa-report.md / extraction-report.md - 早期渲染研究边界及验收证据
</config>

React 只管理面板、主题与低频状态；折叠与相机在独立 RAF 更新。六形态顺序以 app/config.js 为准，Closed 为默认；几何居中始终启用。底部只保留图标分段栏，折叠滑杆归 Add your design 面板；不提供自动环绕。删除旧生成 bundle.js，避免两套入口漂移。

法则: 极简·稳定·资源可追溯·界面与渲染解耦
