/**
 * [INPUT]: 依赖 viewer 的折叠/视角命令、姿态配置与 shadcn Field/Slider/Button。
 * [OUTPUT]: 提供面板内的折叠进度与视角复位，预设姿态显示只读折叠角度。
 * [POS]: DesignPanel 的运动子区；隔离逐帧角度订阅，避免重渲染整个图片编辑面板。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { RotateCcw } from 'lucide-react';
import { PRODUCT_STATES } from '../../app/config.js?v=1';
import { useViewer } from '@/lib/use-viewer';
import { Field, FieldLabel } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

export function FoldControl({ viewer }) {
  const pose = useViewer(viewer, 'pose');
  const fold = useViewer(viewer, 'fold');
  const ready = useViewer(viewer, 'ready');
  const selected = PRODUCT_STATES.find((item) => item.id === pose);
  return <div className="flex flex-col gap-3">
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor="fold-angle">Fold angle</FieldLabel>
        <output className="text-xs text-muted-foreground tabular-nums" aria-label="Current fold angle">{Math.round(fold * 180)}°</output>
      </div>
      <Slider id="fold-angle" min={0} max={1} step={.001} value={[fold]} onValueChange={([value]) => viewer.scrub(value)} disabled={!ready || !selected.interactive} aria-label="Fold angle" aria-valuetext={`${Math.round(fold * 180)} degrees`} className="min-h-6" />
    </Field>
    <Button variant="ghost" size="sm" className="self-end" onClick={viewer.resetView} disabled={!ready}><RotateCcw data-icon="inline-start" />Reset view</Button>
  </div>;
}
