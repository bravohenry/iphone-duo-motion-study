# ui/components/ui/
> L2 | 父级: ../CLAUDE.md

官方 shadcn CLI 生成的 Radix Nova 组件源码；语义样式依赖 ../../styles.css，变体通过 props 提供。局部 Slider 修订把名称和值描述绑定真实 Thumb，以支持读屏与键盘验收。

成员清单

alert.jsx: 错误与提示容器，包括标题、内容及操作区域。
button.jsx: 基于 CVA 的按钮变体，支持 asChild 链接与图标尺寸。
dialog.jsx: 模态对话框、焦点管理、标题/描述和关闭动作。
field.jsx: 组合表单行、标签、说明、错误和分组布局。
label.jsx: Radix 语义标签。
popover.jsx: 非模态锚点面板与标题/描述结构。
select.jsx: 选择器、分组、选项和键盘弹出层。
separator.jsx: 横向或纵向语义分隔。
slider.jsx: 受控范围输入；ARIA 传至实际 Thumb，多值时附加序号。
spinner.jsx: 加载状态图标。
toggle-group.jsx: 单选/多选分组与上下文共享变体，业务使用单选。
toggle.jsx: Toggle 基础变体与可切换状态。
tooltip.jsx: 按需提示及其延迟、锚点、浮层。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
