/**
 * [INPUT]: 依赖产品姿态配置、上一版姿态 SVG、viewer 命令/订阅与 shadcn 控件。
 * [OUTPUT]: 渲染无文字的六姿态分段栏；图标保留可访问名称与按需提示。
 * [POS]: 工作台底部运动控件；只订阅姿态/折叠字段，不驱动 RAF 或持有 Three.js 对象。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { PRODUCT_STATES } from '../../app/config.js?v=1';
import { useViewer } from '@/lib/use-viewer';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const POSE_ICONS = { foldable: 'book-open', landscape: 'device-tablet', portrait: 'device-tablet', closed: 'device-mobile', seated: 'angle', standing: 'triangle' };
export function PoseDock({ viewer }) {
  const pose = useViewer(viewer, 'pose');
  const ready = useViewer(viewer, 'ready');
  return <section className="pose-dock" aria-label="Device controls">
    <ToggleGroup type="single" value={pose} onValueChange={(id) => { if (id) viewer.selectPose(id); }} spacing={1} disabled={!ready} aria-label="Product poses" className="pose-group">
      {PRODUCT_STATES.map((state) => {
        return <Tooltip key={state.id}><TooltipTrigger asChild><ToggleGroupItem value={state.id} data-pose={state.id} aria-label={state.label} className="pose-item"><img className="pose-icon" src={`/assets/icons/${POSE_ICONS[state.id]}.svg`} alt="" /></ToggleGroupItem></TooltipTrigger><TooltipContent>{state.label}</TooltipContent></Tooltip>;
      })}
    </ToggleGroup>
  </section>;
}
