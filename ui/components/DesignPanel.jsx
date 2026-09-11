/**
 * [INPUT]: 依赖本地 File 输入、viewer 图片命令/元数据、FoldControl 与 shadcn 表单控件。
 * [OUTPUT]: 提供内外屏图片上传、裁切、清除和折叠进度；图片不发送到远端。
 * [POS]: 工作台的素材编辑器；面板状态归 React，像素和每屏裁切状态归 mockup-controller。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useRef, useState } from 'react';
import { Upload, ImagePlus, X, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription } from '@/components/ui/popover';
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useViewer } from '@/lib/use-viewer';
import { FoldControl } from '@/components/FoldControl';

export function DesignPanel({ viewer, open, onOpenChange, target, onTargetChange }) {
  const fileInput = useRef(null);
  const artwork = useViewer(viewer, 'artwork');
  const [options, setOptions] = useState(() => viewer.getImageOptions(target));
  const [busy, setBusy] = useState(false);
  const currentImage = artwork[target === 'outer' ? 'outer' : 'inner'];
  function selectTarget(value) {
    if (!value) return;
    onTargetChange(value);
    setOptions(viewer.getImageOptions(value));
  }
  function change(patch) {
    setOptions((previous) => ({ ...previous, ...patch }));
    viewer.setImageOptions(patch, target);
  }
  async function upload(file) {
    if (!file) return;
    setBusy(true);
    await viewer.loadImage(file, target);
    setBusy(false);
    if (fileInput.current) fileInput.current.value = '';
  }
  return <Popover open={open} onOpenChange={(value) => { if (value) viewer.setMode('mockup'); onOpenChange(value); }}>
    <PopoverTrigger asChild><Button variant="outline" size="lg" className="design-trigger rounded-full"><Upload data-icon="inline-start" /><span>Add your design</span></Button></PopoverTrigger>
    <PopoverContent align="end" sideOffset={14} className="design-popover w-80 p-5 gap-5" aria-label="Your design">
      <div className="flex items-start justify-between gap-4">
        <PopoverHeader><PopoverTitle>Your design</PopoverTitle><PopoverDescription>Make either screen your own.</PopoverDescription></PopoverHeader>
        <Button variant="ghost" size="icon-sm" aria-label="Close design panel" onClick={() => onOpenChange(false)}><X /></Button>
      </div>
      <ToggleGroup type="single" value={target} onValueChange={selectTarget} variant="outline" spacing={0} className="w-full" aria-label="Target screen">
        <ToggleGroupItem value="both" className="flex-1">Both</ToggleGroupItem><ToggleGroupItem value="inner" className="flex-1">Inner</ToggleGroupItem><ToggleGroupItem value="outer" className="flex-1">Outer</ToggleGroupItem>
      </ToggleGroup>
      <Button variant="outline" className="upload-drop flex-col gap-3 h-32 w-full" disabled={busy} onClick={() => fileInput.current?.click()}>
        {busy ? <Spinner /> : <ImagePlus />}
        <span className="truncate max-w-full">{busy ? 'Opening image…' : currentImage?.name || 'Choose an image'}</span>
        <span className="upload-detail">{currentImage ? `${currentImage.width} × ${currentImage.height}` : 'PNG, JPG, WebP or AVIF · up to 40 MB'}</span>
      </Button>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden onChange={(event) => upload(event.target.files?.[0])} />
      <FieldGroup>
        <Field orientation="horizontal"><FieldLabel htmlFor="image-fit">Image fit</FieldLabel><Select value={options.fit} onValueChange={(fit) => change({ fit })}><SelectTrigger id="image-fit" className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="cover">Cover</SelectItem><SelectItem value="contain">Contain</SelectItem></SelectGroup></SelectContent></Select></Field>
        {[{ key: 'zoom', name: 'Scale', min: 1, max: 3 }, { key: 'x', name: 'Horizontal', min: -1, max: 1 }, { key: 'y', name: 'Vertical', min: -1, max: 1 }].map(({ key, name, min, max }) => <Field key={key} orientation="horizontal"><FieldLabel htmlFor={`image-${key}`}>{name}</FieldLabel><Slider id={`image-${key}`} min={min} max={max} step={.01} value={[options[key]]} onValueChange={([value]) => change({ [key]: value })} aria-label={name} className="w-36 min-h-6" /></Field>)}
      </FieldGroup>
      <Separator />
      <div className="flex items-center justify-between gap-3"><span className="privacy-note">Only on your device.</span><Button variant="ghost" size="sm" onClick={() => { viewer.clearImage(target); setOptions(viewer.getImageOptions(target)); }}><Undo2 data-icon="inline-start" />Reset</Button></div>
      <Separator />
      <FoldControl viewer={viewer} />
    </PopoverContent>
  </Popover>;
}
