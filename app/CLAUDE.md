# app/
> L2 | 父级: ../CLAUDE.md

成员清单

config.js: 共享产品姿态、渲染教学阶段与动画时长的不可变配置；不持有运行时状态。
material-fidelity.js: 将官网 LSD 的 AO 重绑定、材质透明度覆盖与 Finish/Optics 分层 EXR 反射映射到 Three.js；集中修复 Logo、镜头玻璃和黑色内衬的裸 glTF 偏差。
mockup-controller.js: 管理本地图片导入、目标屏选择与裁切参数；仅通过 wallpaper renderer 的公开接口提交屏幕内容。
motion-controller.js: 管理 Slider clip 采样、七姿态可中断过渡、OrbitControls 与可选几何中心跟随；向主循环暴露当前折叠量。
png-exporter.js: 将当前 3D scene/camera 以 MSAA + SSAA 离屏读回、高质量降采样并按 Alpha 包围盒紧边裁切为透明 PNG；负责像素预算、透明边缘与浏览器下载。
render-quality.js: 以纯函数计算设备 DPR、额外超采样与总像素预算之间的平衡；可脱离 WebGL 独立验证。
render-runtime.js: 建立 Three.js 场景、相机、克制补光、双层 PMREM 环境、教学预览与自适应超采样画布；集中控制 WebGL 质量和 resize 生命周期。
screen-materials.js: 将动态屏幕纹理注入设备内外屏材质；隔离模型节点命名与屏幕材质策略。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
