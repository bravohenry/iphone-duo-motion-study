/**
 * [INPUT]: 依赖 viewer 视图命令、原有 Pipeline 配置和 shadcn Dialog/Select。
 * [OUTPUT]: 提供简洁帮助、导出说明及保留的研究视图入口。
 * [POS]: 非主工作流信息层；将说明从画布移入可访问对话框。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useViewer } from '@/lib/use-viewer';
export function InfoDialog({ viewer }) {
  const mode = useViewer(viewer, 'mode');
  return <Dialog>
    <DialogTrigger asChild><Button variant="ghost" size="icon-lg" aria-label="About Duo Mock"><Info /></Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>Duo Mock</DialogTitle><DialogDescription>One live model. Six ways to see it.</DialogDescription></DialogHeader>
      <dl className="help-list"><div><dt>Rotate</dt><dd>Drag</dd></div><div><dt>Zoom</dt><dd>Scroll or pinch</dd></div><div><dt>Move</dt><dd>Right-drag or two fingers</dd></div></dl>
      <p className="help-copy">Export saves your current view as a transparent PNG, cropped to the device. Your images stay in this browser.</p>
      <Separator />
      <Field orientation="horizontal"><FieldLabel htmlFor="research-view">Workspace</FieldLabel><Select value={mode} onValueChange={viewer.setMode}><SelectTrigger id="research-view"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="mockup">Mockup</SelectItem><SelectItem value="demo">Product Demo</SelectItem><SelectItem value="pipeline">WebGL Pipeline</SelectItem></SelectGroup></SelectContent></Select></Field>
      <p className="privacy-note">Independent study. Device assets © Apple. Not affiliated with Apple.</p>
    </DialogContent>
  </Dialog>;
}
