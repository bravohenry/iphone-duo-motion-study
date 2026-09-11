# ui/components/
> L2 | 父级: ../CLAUDE.md

成员清单

DesignPanel.jsx: 按需展开的图片编辑面板；上传目标、裁切、清除与 FoldControl 共存，文件不发送到远端。
FoldControl.jsx: 面板内独立订阅折叠进度，提供 0–180°滑杆和 Reset view；仅 Foldable 允许编辑铰链。
PoseDock.jsx: 六形态单选分段栏，保留旧版 SVG、去除可见文字；ARIA 名称、键盘和 Tooltip 保留可发现性。
InfoDialog.jsx: 将操作帮助、独立研究声明与 Demo/Pipeline 入口收进可访问 Dialog，不占主画布。
ui/: shadcn Radix Nova 生成组件，业务状态不进入此层。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
