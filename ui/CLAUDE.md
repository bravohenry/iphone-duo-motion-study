# ui/
> L2 | 父级: ../CLAUDE.md

成员清单

main.jsx: 仅在入口创建 viewer 和 React root，HMR 时清理；组件重渲染不会重复加载模型。
App.jsx: 编排品牌、主题、图片拖放与顶栏操作；从 viewer 逐字段订阅，不驱动渲染帧。
styles.css: 官方 shadcn 语义主题、TikTok Display 品牌字族与响应式工作台；底部仅无文字分段栏，滑杆不占用画布。
components/: 业务组件及官方生成的基础控件，详见本目录 CLAUDE.md。
lib/: viewer 订阅 hook 与类名工具，详见本目录 CLAUDE.md。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
