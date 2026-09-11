/**
 * [INPUT]: 依赖 cn 包的 class 合并规则。
 * [OUTPUT]: 重导出 shadcn 使用的 cn。
 * [POS]: UI 公共工具边界；不持有工作台状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export { cn } from "cn"
