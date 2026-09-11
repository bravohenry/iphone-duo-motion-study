/**
 * [INPUT]: 依赖 React、shadcn Radix Nova 的基础能力与共享语义令牌。
 * [OUTPUT]: 提供就绪和导出等待反馈。
 * [POS]: ui/components/ui 的官方生成基础组件；业务状态由上层工作台组件持有。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

function Spinner({
  className,
  ...props
}) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
