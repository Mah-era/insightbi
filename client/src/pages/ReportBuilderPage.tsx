import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  Plus, Save, ArrowLeft, Settings, Database, Share2, Download, Pencil, Printer,
  Bookmark, Filter, FlaskConical, Code2, X, GripVertical, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChartWidget, echartsRegistry } from '@/components/charts/ChartWidget';
import { ChartTypeSelector } from '@/components/report-builder/ChartTypeSelector';
import { ChartConfigPanel } from '@/components/report-builder/ChartConfigPanel';
import { BookmarksPanel } from '@/components/report-builder/BookmarksPanel';
import { ReportFiltersPanel } from '@/components/report-builder/ReportFiltersPanel';
import { MeasureDialog } from '@/components/report-builder/MeasureDialog';
import { useReportBuilderStore } from '@/store/reportBuilderStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { reportAPI, datasetAPI, shareAPI, measureAPI, embedAPI } from '@/services/api';
import { ChartType, Dataset, Widget, Measure, WidgetConfig } from '@/types';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLS = 12;
const ROW_HEIGHT = 60;

export function ReportBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { activeWorkspace } = useWorkspaceStore();
  const {
    reportName, layout, selectedWidgetId, isDirty, reportFilters,
    setReport, setReportName, addWidget, updateWidgetLayout, selectWidget, markClean, globalFilters,
  } = useReportBuilderStore();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [saving, setSaving] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [containerWidth, setContainerWidth] = useState(900);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMeasureDialog, setShowMeasureDialog] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<Measure | null>(null);

  // Embed state
  const [embedToken, setEmbedToken] = useState<string | null>(null);
  const [generatingEmbed, setGeneratingEmbed] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Load report
  useEffect(() => {
    if (!id) return;
    reportAPI.get(id).then((res) => {
      const r = res.data.data;
      setReport(id, r.name, r.layoutJson || { widgets: [] }, r.configJson || { theme: 'light', refreshInterval: 0, globalFilters: [] });
    });
  }, [id]);

  // Load datasets
  useEffect(() => {
    if (!activeWorkspace) return;
    datasetAPI.list(activeWorkspace.id).then((res) => setDatasets(res.data.data));
  }, [activeWorkspace?.id]);

  // Load measures
  const loadMeasures = useCallback(() => {
    if (!activeWorkspace) return;
    measureAPI.list(activeWorkspace.id).then((res) => setMeasures(res.data.data)).catch(() => {});
  }, [activeWorkspace?.id]);

  useEffect(() => { loadMeasures(); }, [loadMeasures]);

  // Ref for pdf export — points at inner grid content, NOT the scrollable wrapper
  const pdfCanvasRef = useRef<HTMLDivElement>(null);
  const pdfScrollRef = useRef<HTMLDivElement>(null);

  // Measure canvas width
  const canvasRef = useCallback((node: HTMLDivElement | null) => {
    if (node) setContainerWidth(node.offsetWidth - 16);
  }, []);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await reportAPI.update(id, { name: reportName, layoutJson: layout, configJson: { theme: 'light', refreshInterval: 0, globalFilters: [] } });
      markClean();
      toast({ title: 'Report saved!', variant: 'default' });
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLayoutChange = (newLayout: Layout[]) => {
    newLayout.forEach((item) => {
      updateWidgetLayout(item.i, { x: item.x, y: item.y, w: item.w, h: item.h });
    });
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await reportAPI.exportJson(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${reportName}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const handleExportPDF = async () => {
    const target = pdfCanvasRef.current;
    const scroller = pdfScrollRef.current;
    if (!target || !scroller) return;
    if (layout.widgets.length === 0) {
      toast({ title: 'Nothing to export', description: 'Add widgets first.', variant: 'destructive' });
      return;
    }

    toast({
      title: '📄 Preparing PDF…',
      description: 'Rendering charts (≈5s), then your browser print dialog will open. Choose "Save as PDF".',
    });

    // ── STEP 1: Resize every chart to fill its card, then wait for animations ──
    // We use the browser's native print engine (window.print) to "screenshot"
    // the live page into a PDF. This renders the real charts exactly as shown —
    // no html2canvas, no canvas cloning, no blank cards.
    const chartInstances = Array.from(echartsRegistry.values()).filter((inst) => {
      try { return target.contains(inst.getDom()); } catch { return false; }
    });
    chartInstances.forEach((inst) => { try { inst.resize(); } catch { /* ok */ } });

    // Wait 5 seconds so all ECharts entrance animations finish painting.
    await new Promise((r) => setTimeout(r, 5000));

    // ── STEP 2: Inject a temporary print stylesheet ────────────────────────────
    // While printing we:
    //   • hide all app chrome (toolbars, panels, sidebars) via body.printing-pdf
    //   • expand the scroll container so every widget is laid out (no clipping)
    //   • force a white background and exact color printing
    const printStyle = document.createElement('style');
    printStyle.id = 'pdf-print-style';
    printStyle.textContent = `
      @media print {
        @page { size: landscape; margin: 8mm; }
        html, body { background: #ffffff !important; }
        /* Hide everything by default… */
        body.printing-pdf > * { visibility: hidden !important; }
        /* …then reveal only the report canvas and its descendants */
        body.printing-pdf #pdf-print-root,
        body.printing-pdf #pdf-print-root * { visibility: visible !important; }
        /* Pull the report canvas to the top-left of the printed page */
        body.printing-pdf #pdf-print-root {
          position: absolute !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important;
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        /* Avoid breaking a widget card across two pages */
        body.printing-pdf #pdf-print-root .react-grid-item {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        /* Neutralise clipping / fixed heights on every ancestor of the print root,
           otherwise a positioned ancestor with overflow:hidden clips the report */
        body.printing-pdf .pdf-print-ancestor {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
          position: static !important;
          display: block !important;
        }
        /* Un-clip EVERY inner scroll container inside a widget (table & matrix have
           their own overflow-auto wrappers — without this their rows below the fold
           print blank). */
        body.printing-pdf #pdf-print-root .react-grid-item * {
          overflow: visible !important;
          max-height: none !important;
        }
        /* ECharts canvases don't always survive print rasterization. We overlay a
           static PNG (.pdf-print-chart-img) on top of each chart and hide the live
           canvas during print so the snapshot is what gets printed. */
        body.printing-pdf .pdf-print-chart-img { display: block !important; }
        body.printing-pdf #pdf-print-root canvas { visibility: hidden !important; }
        body.printing-pdf .pdf-print-chart-img { visibility: visible !important; }
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      /* Overlay images are hidden on screen; only shown during print */
      .pdf-print-chart-img { display: none; }
    `;
    document.head.appendChild(printStyle);

    // The scroller is the element that clips/scrolls — mark it as the print root.
    const prevId = scroller.id;
    scroller.id = 'pdf-print-root';

    // Tag every ancestor up to <body> so the print CSS can un-clip them.
    const taggedAncestors: HTMLElement[] = [];
    {
      let cur: HTMLElement | null = scroller.parentElement;
      while (cur && cur !== document.body) {
        cur.classList.add('pdf-print-ancestor');
        taggedAncestors.push(cur);
        cur = cur.parentElement;
      }
    }
    document.body.classList.add('printing-pdf');

    // If the app is in dark mode, switch to light for the print so text isn't
    // white-on-white. (KPI/table/matrix text uses --foreground which is near-white
    // in dark mode; we force a white print background, so text would vanish.)
    const wasDark = document.documentElement.classList.contains('dark');
    if (wasDark) document.documentElement.classList.remove('dark');

    // Re-resize charts now that layout may have changed for print, then print.
    chartInstances.forEach((inst) => { try { inst.resize(); } catch { /* ok */ } });

    // ── STEP 3: Overlay each ECharts chart with a static PNG snapshot ──────────
    // getDataURL() reads ECharts' internal renderer buffer — always correct,
    // regardless of canvas/print quirks. We absolutely-position the PNG over the
    // chart's container; print CSS hides the live <canvas> and shows the PNG.
    interface OverlaySave { dom: HTMLElement; prevPosition: string; img: HTMLImageElement; }
    const overlays: OverlaySave[] = [];
    for (const inst of chartInstances) {
      try {
        const dom = inst.getDom();
        const url = inst.getDataURL({
          type: 'png', pixelRatio: 2, backgroundColor: '#ffffff',
        });
        if (!url || url === 'data:,') continue;

        const img = document.createElement('img');
        img.className = 'pdf-print-chart-img';
        img.src = url;
        img.style.cssText =
          'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;background:#ffffff;z-index:20;';

        // The chart container must be a positioning context for the overlay
        const prevPosition = dom.style.position;
        if (getComputedStyle(dom).position === 'static') dom.style.position = 'relative';

        dom.appendChild(img);
        overlays.push({ dom, prevPosition, img });

        // Make sure the PNG is fully decoded before we open the print dialog
        try { await img.decode(); } catch { /* fall back to onload timing */ }
      } catch { /* skip this chart — native print will still try */ }
    }

    const cleanup = () => {
      document.body.classList.remove('printing-pdf');
      if (wasDark) document.documentElement.classList.add('dark');
      scroller.id = prevId;
      taggedAncestors.forEach((el) => el.classList.remove('pdf-print-ancestor'));
      overlays.forEach(({ dom, prevPosition, img }) => {
        img.remove();
        dom.style.position = prevPosition;
      });
      const el = document.getElementById('pdf-print-style');
      if (el) el.remove();
      // Restore on-screen chart sizing
      chartInstances.forEach((inst) => { try { inst.resize(); } catch { /* ok */ } });
    };

    // Restore styles once the print dialog closes.
    const onAfterPrint = () => {
      cleanup();
      window.removeEventListener('afterprint', onAfterPrint);
      toast({ title: '✅ Print dialog closed', description: 'If you saved as PDF, it is in your downloads.' });
    };
    window.addEventListener('afterprint', onAfterPrint);

    // Small delay so the injected styles + resize apply before the dialog opens.
    await new Promise((r) => setTimeout(r, 150));
    try {
      window.print();
    } catch (err) {
      cleanup();
      window.removeEventListener('afterprint', onAfterPrint);
      console.error('Print failed:', err);
      toast({ title: 'PDF export failed', description: String(err), variant: 'destructive' });
    }

    // Safety net: if 'afterprint' never fires (some browsers), clean up after 60s.
    setTimeout(() => {
      if (document.body.classList.contains('printing-pdf')) {
        cleanup();
        window.removeEventListener('afterprint', onAfterPrint);
      }
    }, 60000);
  };

  const handleShare = async () => {
    if (!id) return;
    try {
      const res = await shareAPI.share(id, shareEmail ? { email: shareEmail, permission: sharePermission } : { permission: sharePermission });
      toast({ title: shareEmail ? 'Report shared!' : 'Share link created!', description: !shareEmail && res.data.data.token ? `Token: ${res.data.data.token}` : undefined });
      if (!shareEmail) setShowShare(false);
    } catch {
      toast({ title: 'Share failed', variant: 'destructive' });
    }
  };

  const handleGenerateEmbed = async () => {
    if (!id) return;
    setGeneratingEmbed(true);
    try {
      const res = await embedAPI.createToken(id, {});
      setEmbedToken(res.data.data.token);
    } catch {
      toast({ title: 'Failed to generate embed token', variant: 'destructive' });
    } finally {
      setGeneratingEmbed(false);
    }
  };

  const embedSnippet = embedToken
    ? `<iframe src="${window.location.origin}/embed/reports/${embedToken}" width="100%" height="600" frameborder="0"></iframe>`
    : '';

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const selectedWidget = layout.widgets.find((w) => w.id === selectedWidgetId) || null;

  const gridItems: Layout[] = layout.widgets.map((w) => ({
    i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, minW: 2, minH: 2,
  }));

  // Determine right panel content
  const rightPanelContent = showBookmarks ? 'bookmarks' : showFilters ? 'filters' : selectedWidget ? 'config' : 'empty';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="h-12 border-b bg-background flex items-center px-4 gap-2 shrink-0">
        <Link to="/reports">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5" />

        {editingName ? (
          <Input
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
            className="h-7 w-48 text-sm"
            autoFocus
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors">
            {reportName}
            {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            <Pencil className="w-3 h-3 opacity-50" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Filter button with badge */}
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1.5 h-7 text-xs relative"
            onClick={() => { setShowFilters(!showFilters); setShowBookmarks(false); }}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
            {reportFilters.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
                {reportFilters.length}
              </span>
            )}
          </Button>

          {/* Bookmarks button */}
          <Button
            variant={showBookmarks ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => { setShowBookmarks(!showBookmarks); setShowFilters(false); }}
          >
            <Bookmark className="w-3.5 h-3.5" /> Bookmarks
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowChartSelector(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Visual
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          {id && (
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleExportPDF}>
              <Printer className="w-3.5 h-3.5" /> PDF
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowShare(true)}>
            <Share2 className="w-3.5 h-3.5" /> Share
          </Button>
          <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsed left rail — click to reopen */}
        {!leftPanelOpen && (
          <button
            onClick={() => setLeftPanelOpen(true)}
            title="Show datasets"
            className="w-7 border-r bg-muted/20 hover:bg-muted/50 flex flex-col items-center pt-3 gap-2 shrink-0 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider [writing-mode:vertical-rl]">Datasets</span>
          </button>
        )}

        {/* Left panel: datasets + measures */}
        <div
          className={cn(
            'border-r bg-muted/20 flex flex-col shrink-0 transition-all duration-300 overflow-hidden',
            leftPanelOpen ? 'w-52' : 'w-0 border-r-0'
          )}
        >
          <div className="px-3 py-2.5 border-b flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datasets</p>
            <button
              onClick={() => setLeftPanelOpen(false)}
              title="Hide datasets"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {datasets.length === 0 ? (
                <div className="text-center py-6">
                  <Database className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">No datasets in workspace</p>
                </div>
              ) : (
                datasets.map((ds) => (
                  <div key={ds.id} className="rounded-md border bg-background overflow-hidden">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50">
                      <Database className="w-3 h-3 text-blue-500 shrink-0" />
                      <span className="text-[11px] font-medium truncate">{ds.name}</span>
                    </div>
                    <div className="px-2 pb-1.5 pt-1 space-y-0.5">
                      {ds.schemaJson.slice(0, 8).map((col) => (
                        <div
                          key={col.name}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('field', JSON.stringify({ datasetId: ds.id, fieldName: col.name, fieldType: col.type }));
                          }}
                          className="flex items-center gap-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing hover:bg-muted/50 px-1 rounded"
                        >
                          <GripVertical className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40" />
                          <span className={cn('w-2.5 h-2.5 rounded-sm shrink-0', {
                            'bg-blue-200 dark:bg-blue-900': col.type === 'text',
                            'bg-emerald-200 dark:bg-emerald-900': col.type === 'number',
                            'bg-amber-200 dark:bg-amber-900': col.type === 'date',
                            'bg-violet-200 dark:bg-violet-900': col.type === 'boolean',
                          })} />
                          {col.name}
                        </div>
                      ))}
                      {ds.schemaJson.length > 8 && (
                        <p className="text-[9px] text-muted-foreground/50 px-1">+{ds.schemaJson.length - 8} more</p>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Measures section */}
              <div className="pt-1">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Measures</p>
                  <button
                    onClick={() => { setEditingMeasure(null); setShowMeasureDialog(true); }}
                    className="text-[10px] text-primary hover:text-primary/80 font-medium"
                  >+ New</button>
                </div>
                {measures.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/50 px-1">No measures yet</p>
                ) : (
                  measures.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/50 px-1 rounded group"
                      onClick={() => { setEditingMeasure(m); setShowMeasureDialog(true); }}
                    >
                      <FlaskConical className="w-2.5 h-2.5 text-violet-500 shrink-0" />
                      <span className="truncate flex-1">{m.name}</span>
                      <span className="text-[9px] bg-violet-100 dark:bg-violet-900/30 px-1 rounded shrink-0">{m.format}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Canvas — pdfScrollRef on outer (overflow-auto), pdfCanvasRef on inner content */}
        <div
          className="flex-1 overflow-auto bg-muted/30 p-4"
          ref={(node) => {
            (canvasRef as unknown as (n: HTMLDivElement | null) => void)(node);
            (pdfScrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          onClick={() => selectWidget(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData('field');
            if (!raw) return;
            try {
              const { datasetId, fieldName, fieldType } = JSON.parse(raw) as { datasetId: string; fieldName: string; fieldType: string };
              let chartType: ChartType = 'bar';
              const config: WidgetConfig = { title: fieldName, datasetId };
              if (fieldType === 'number') {
                chartType = 'bar'; config.yField = fieldName; config.aggregation = 'sum';
              } else if (fieldType === 'date') {
                chartType = 'line'; config.xField = fieldName;
              } else {
                chartType = 'bar'; config.xField = fieldName;
              }
              addWidget(chartType);
              // After addWidget, the new widget is the last one; update its config
              setTimeout(() => {
                const widgets = useReportBuilderStore.getState().layout.widgets;
                const last = widgets[widgets.length - 1];
                if (last) useReportBuilderStore.getState().updateWidget(last.id, config);
              }, 0);
            } catch {
              // ignore malformed drag data
            }
          }}
        >
          <div ref={pdfCanvasRef} className="min-h-full">
          {layout.widgets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center" style={{minHeight:'60vh'}}>
              <div className="w-16 h-16 rounded-2xl bg-background border-2 border-dashed flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-base font-medium text-muted-foreground mb-1">Canvas is empty</p>
              <p className="text-sm text-muted-foreground/60 mb-4">Drag a field from the left panel to create a chart</p>
              <Button size="sm" onClick={() => setShowChartSelector(true)} className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Visual
              </Button>
            </div>
          ) : (
            <GridLayout
              className="layout"
              layout={gridItems}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              width={containerWidth}
              onLayoutChange={handleLayoutChange}
              margin={[8, 8]}
              compactType="vertical"
              draggableHandle=".drag-handle"
            >
              {layout.widgets.map((widget: Widget) => (
                <div
                  key={widget.id}
                  data-widget-id={widget.id}
                  className={cn(
                    'bg-background rounded-lg border overflow-hidden flex flex-col',
                    selectedWidgetId === widget.id && 'ring-2 ring-primary'
                  )}
                  onClick={(e) => { e.stopPropagation(); selectWidget(widget.id); }}
                >
                  <div className="drag-handle h-6 bg-muted/30 flex items-center px-2 cursor-grab active:cursor-grabbing shrink-0">
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => <div key={i} className="w-3 h-0.5 bg-muted-foreground/30 rounded" />)}
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2 truncate">{widget.config.title || widget.type}</span>
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    <ChartWidget widget={widget} globalFilters={globalFilters} isSelected={selectedWidgetId === widget.id} />
                  </div>
                </div>
              ))}
            </GridLayout>
          )}
          </div>
        </div>

        {/* Right panel */}
        <div
          className={cn(
            'border-l bg-background flex flex-col shrink-0 transition-all duration-300 overflow-hidden',
            rightPanelOpen ? 'w-60' : 'w-0 border-l-0'
          )}
        >
          {/* Collapse header (shown above any content) */}
          <div className="px-3 py-2.5 border-b flex items-center justify-between gap-2">
            <button
              onClick={() => setRightPanelOpen(false)}
              title="Hide panel"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {rightPanelContent === 'bookmarks' ? 'Bookmarks'
                : rightPanelContent === 'filters' ? 'Filters'
                : rightPanelContent === 'config' ? 'Configure'
                : 'Panel'}
            </p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            {rightPanelContent === 'bookmarks' && (
              <BookmarksPanel onClose={() => setShowBookmarks(false)} />
            )}
            {rightPanelContent === 'filters' && (
              <ReportFiltersPanel onClose={() => setShowFilters(false)} datasets={datasets} />
            )}
            {rightPanelContent === 'config' && selectedWidget && (
              <ScrollArea className="flex-1">
                <div className="p-3">
                  <ChartConfigPanel widget={selectedWidget} datasets={datasets} />
                </div>
              </ScrollArea>
            )}
            {rightPanelContent === 'empty' && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                  <Settings className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Select a widget to configure it</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsed right rail — click to reopen */}
        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            title="Show panel"
            className="w-7 border-l bg-muted/20 hover:bg-muted/50 flex flex-col items-center pt-3 gap-2 shrink-0 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider [writing-mode:vertical-rl]">Configure</span>
          </button>
        )}
      </div>

      {showChartSelector && (
        <ChartTypeSelector onSelect={(type: ChartType) => addWidget(type)} onClose={() => setShowChartSelector(false)} />
      )}

      {/* Measure Dialog */}
      {activeWorkspace && (
        <MeasureDialog
          open={showMeasureDialog}
          onClose={() => setShowMeasureDialog(false)}
          onSaved={loadMeasures}
          workspaceId={activeWorkspace.id}
          datasets={datasets}
          editing={editingMeasure}
        />
      )}

      {/* Share dialog with Embed tab */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Share Report</DialogTitle></DialogHeader>
          <Tabs defaultValue="share">
            <TabsList className="w-full">
              <TabsTrigger value="share" className="flex-1 text-xs">Share Link</TabsTrigger>
              <TabsTrigger value="embed" className="flex-1 text-xs">
                <Code2 className="w-3 h-3 mr-1.5" /> Embed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Share with (email, optional)</Label>
                <Input value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="colleague@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Permission</Label>
                <Select value={sharePermission} onValueChange={(v) => setSharePermission(v as 'VIEW' | 'EDIT')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEW">View Only</SelectItem>
                    <SelectItem value="EDIT">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowShare(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleShare}>
                  {shareEmail ? 'Share with User' : 'Create Link'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="embed" className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">
                Generate an embed token to embed this report in any webpage via an iframe. The embedded report is read-only.
              </p>
              {!embedToken ? (
                <Button className="w-full" onClick={handleGenerateEmbed} disabled={generatingEmbed}>
                  <Code2 className="w-3.5 h-3.5 mr-1.5" />
                  {generatingEmbed ? 'Generating...' : 'Generate Embed Token'}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Embed Code</Label>
                    <div className="relative">
                      <pre className="text-[10px] bg-muted p-2.5 rounded border font-mono break-all whitespace-pre-wrap select-all">
                        {embedSnippet}
                      </pre>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-xs h-8" onClick={handleCopyEmbed}>
                      {embedCopied ? '✓ Copied!' : 'Copy Code'}
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs h-8"
                      onClick={() => window.open(`/embed/reports/${embedToken}`, '_blank')}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/70 hover:text-destructive"
                      onClick={() => setEmbedToken(null)}
                      title="Clear token"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
