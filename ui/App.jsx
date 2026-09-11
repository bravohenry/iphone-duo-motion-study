/**
 * [INPUT]: 依赖 viewer 的订阅/命令接口、shadcn、DesignPanel、PoseDock 与 InfoDialog。
 * [OUTPUT]: 提供 Duo Mock 的 React 工作台、主题/图片面板状态与 PNG 操作。
 * [POS]: UI 编排层；只订阅低频应用状态，折叠帧更新隔离在 FoldControl，3D 在独立 RAF 运行。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useEffect, useRef, useState } from 'react';
import { Sun, Moon, Download, X, CircleAlert, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle, AlertAction } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DesignPanel } from '@/components/DesignPanel';
import { PoseDock } from '@/components/PoseDock';
import { InfoDialog } from '@/components/InfoDialog';
import { useViewer } from '@/lib/use-viewer';
import { PIPELINE_STAGES } from '../app/config.js?v=1';

const REPOSITORY = 'https://github.com/bravohenry/iphone-duo-motion-study';
function initialTheme() {
  try { return localStorage.getItem('duo-mock-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
}
export function App({ viewer }) {
  const ready = useViewer(viewer, 'ready');
  const exporting = useViewer(viewer, 'exporting');
  const error = useViewer(viewer, 'error');
  const mode = useViewer(viewer, 'mode');
  const pipeline = useViewer(viewer, 'pipeline');
  const [theme, setTheme] = useState(initialTheme);
  const [designOpen, setDesignOpen] = useState(false);
  const [target, setTarget] = useState('both');
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    viewer.setBackground(theme === 'dark' ? '#080809' : '#f7f7f8');
    try { localStorage.setItem('duo-mock-theme', theme); } catch { /* 私密浏览仍可切换本次主题。 */ }
  }, [theme, viewer]);
  useEffect(() => {
    const enter = (event) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      dragDepth.current++;
      setDragging(true);
    };
    const over = (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); };
    const leave = (event) => {
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragging(false);
    };
    const drop = async (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      viewer.setMode('mockup');
      if (await viewer.loadImage(file, target)) setDesignOpen(true);
    };
    addEventListener('dragenter', enter);
    addEventListener('dragover', over);
    addEventListener('dragleave', leave);
    addEventListener('drop', drop);
    return () => {
      removeEventListener('dragenter', enter);
      removeEventListener('dragover', over);
      removeEventListener('dragleave', leave);
      removeEventListener('drop', drop);
    };
  }, [viewer, target]);

  return <TooltipProvider delayDuration={350}>
    <header className="studio-header">
      <h1 className="wordmark">Duo <span>Mock</span></h1>
      <span className="device-name">iPhone Duo</span>
      <div className="header-actions">
        <DesignPanel viewer={viewer} open={designOpen} onOpenChange={setDesignOpen} target={target} onTargetChange={setTarget} />
        <Tooltip><TooltipTrigger asChild><Button size="lg" className="export-button rounded-full" onClick={viewer.exportPng} disabled={!ready || exporting || mode === 'pipeline'} aria-label="Export transparent PNG" aria-busy={exporting}>{exporting ? <Spinner data-icon="inline-start" /> : <Download data-icon="inline-start" />}<span>{exporting ? 'Exporting…' : 'Export'}</span></Button></TooltipTrigger><TooltipContent>Transparent PNG · cropped to device</TooltipContent></Tooltip>
        <div className="header-utilities">
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-lg" asChild><a href={REPOSITORY} target="_blank" rel="noreferrer" aria-label="View source on GitHub"><img className="github-icon" src="/assets/icons/github-logo.svg" alt="" /></a></Button></TooltipTrigger><TooltipContent>GitHub</TooltipContent></Tooltip>
          <InfoDialog viewer={viewer} />
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon-lg" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} background`} onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</Button></TooltipTrigger><TooltipContent>Change background</TooltipContent></Tooltip>
        </div>
      </div>
    </header>
    {mode !== 'pipeline' ? <PoseDock viewer={viewer} /> : <aside className="pipeline-controls"><ToggleGroup type="single" value={pipeline} onValueChange={(id) => { if (id) viewer.selectPipelineStage(id); }} orientation="vertical" aria-label="Rendering stages">{PIPELINE_STAGES.map((stage) => <ToggleGroupItem key={stage.id} value={stage.id}>{stage.label}</ToggleGroupItem>)}</ToggleGroup><p>{PIPELINE_STAGES.find((item) => item.id === pipeline)?.description}</p><Button variant="outline" onClick={() => viewer.setMode('mockup')}>Back to mockup</Button></aside>}
    {!ready && !error ? <div className="loading-state" role="status"><Spinner /><span>Preparing your mockup</span></div> : null}
    {error ? <div className="error-state"><Alert variant="destructive"><CircleAlert /><AlertTitle>{error}</AlertTitle><AlertAction><Button variant="ghost" size="icon-xs" onClick={viewer.clearError} aria-label="Dismiss error"><X /></Button></AlertAction></Alert></div> : null}
    {dragging ? <div className="drop-overlay"><ImagePlus /><p>Drop your design</p><span>{target === 'both' ? 'Both screens' : `${target} screen`}</span></div> : null}
  </TooltipProvider>;
}
