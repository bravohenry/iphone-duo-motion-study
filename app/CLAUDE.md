# app/
> L2 | 父级: ../CLAUDE.md

成员清单

config.js: 不可变产品状态与教学阶段；六姿态按 Closed、Foldable、Landscape、Portrait、Seated、Standing 排列，首项是默认状态。
material-fidelity.js: 从原始 LSD 还原 AO、Logo 透明度、镜头光学层及 Finish/Optics EXR 映射；保持屏幕和导出材质一致。
mockup-controller.js: 独占本地图片解码、每屏裁切和替换竞态；回调只发布元数据，像素送入 wallpaper renderer，无 UI DOM。
motion-controller.js: 独占 Slider 采样、可中断姿态过渡与 OrbitControls；变形后整机居中，手动操作打断姿态过渡，无自动环绕。
png-exporter.js: 同一 scene/camera 的离屏 MSAA + SSAA 渲染、降采样、Alpha 紧边裁切与浏览器下载。
render-quality.js: 纯函数计算 DPR、超采样和总像素预算；与 UI 框架无关。
render-runtime.js: 创建 WebGL 场景、工作台相机、双层 PMREM 与灯光；主题只修改清屏色，不修改材质或导出像素。
screen-materials.js: 将动态内外屏纹理注入已知模型节点；隔离 glTF 命名与屏幕材质策略。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
