import { useState, useEffect } from 'react';
import { Widget, Dataset, ColumnSchema } from '@/types';
import { useReportBuilderStore } from '@/store/reportBuilderStore';
import { datasetAPI } from '@/services/api';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';

interface ChartConfigPanelProps {
  widget: Widget;
  datasets: Dataset[];
}

export function ChartConfigPanel({ widget, datasets }: ChartConfigPanelProps) {
  const { updateWidget, removeWidget } = useReportBuilderStore();
  const [schema, setSchema] = useState<ColumnSchema[]>([]);

  useEffect(() => {
    if (widget.config.datasetId) {
      datasetAPI.get(widget.config.datasetId).then((res) => {
        setSchema(res.data.data.schemaJson || []);
      }).catch(() => {});
    }
  }, [widget.config.datasetId]);

  const update = (key: string, value: unknown) => updateWidget(widget.id, { [key]: value });

  const textCols = schema.filter((c) => c.type === 'text').map((c) => c.name);
  const numCols = schema.filter((c) => c.type === 'number').map((c) => c.name);
  const allCols = schema.map((c) => c.name);

  const isChart = ['bar', 'line', 'area', 'scatter'].includes(widget.type);
  const isPieDonut = ['pie', 'donut'].includes(widget.type);
  const isKpi = ['kpi', 'number', 'cardtrend'].includes(widget.type);
  const isCombo = widget.type === 'combo';
  const isWaterfallOrTreemap = ['waterfall', 'treemap'].includes(widget.type);
  const isHistogram = widget.type === 'histogram';
  const isBoxPlot = widget.type === 'boxplot';
  const isNarrative = widget.type === 'smartnarrative';
  const isMap = widget.type === 'map';
  const isDecompTree = widget.type === 'decomptree';
  const isDrillable = ['bar', 'line', 'area'].includes(widget.type);

  return (
    <div className="space-y-4 text-sm">
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">Title</Label>
        <Input
          value={widget.config.title || ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Chart title"
          className="h-8 text-xs"
        />
      </div>

      {/* Dataset */}
      <div className="space-y-1.5">
        <Label className="text-xs">Dataset</Label>
        <Select value={widget.config.datasetId || ''} onValueChange={(v) => update('datasetId', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select dataset" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bar/Line/Area config */}
      {isChart && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">X Axis (Category)</Label>
            <Select value={widget.config.xField || ''} onValueChange={(v) => update('xField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Y Axis (Value)</Label>
            <Select value={widget.config.yField || ''} onValueChange={(v) => update('yField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Pie/Donut config */}
      {isPieDonut && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Group By</Label>
            <Select value={widget.config.groupField || ''} onValueChange={(v) => update('groupField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value Field</Label>
            <Select value={widget.config.valueField || ''} onValueChange={(v) => update('valueField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* KPI config */}
      {isKpi && (
        <div className="space-y-1.5">
          <Label className="text-xs">Value Field</Label>
          <Select value={widget.config.valueField || ''} onValueChange={(v) => update('valueField', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
            <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {/* Table columns */}
      {widget.type === 'table' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Columns (leave empty for all)</Label>
          <Select onValueChange={(v) => update('columns', [...(widget.config.columns || []), v])}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add column" /></SelectTrigger>
            <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
          {(widget.config.columns || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {widget.config.columns!.map((col) => (
                <span key={col} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-[10px]">
                  {col}
                  <button onClick={() => update('columns', widget.config.columns!.filter((c) => c !== col))} className="text-muted-foreground hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Combo Chart config */}
      {isCombo && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">X Axis</Label>
            <Select value={widget.config.xField || ''} onValueChange={(v) => update('xField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bar Field</Label>
            <Select value={widget.config.barField || ''} onValueChange={(v) => update('barField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Line Field</Label>
            <Select value={widget.config.lineField || ''} onValueChange={(v) => update('lineField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Waterfall / Treemap config */}
      {isWaterfallOrTreemap && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Category Field</Label>
            <Select value={widget.config.categoryField || ''} onValueChange={(v) => update('categoryField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value Field</Label>
            <Select value={widget.config.valueField || ''} onValueChange={(v) => update('valueField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Histogram config */}
      {isHistogram && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Value Field</Label>
            <Select value={widget.config.valueField || ''} onValueChange={(v) => update('valueField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bin Count</Label>
            <Input type="number" value={widget.config.binCount || 10}
              onChange={(e) => update('binCount', Number(e.target.value))} className="h-8 text-xs" />
          </div>
        </>
      )}

      {/* Box Plot config */}
      {isBoxPlot && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Value Field</Label>
            <Select value={widget.config.valueField || ''} onValueChange={(v) => update('valueField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category Field (optional)</Label>
            <Select value={widget.config.categoryField || ''} onValueChange={(v) => update('categoryField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Smart Narrative config */}
      {isNarrative && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Category Field</Label>
            <Select value={widget.config.categoryField || ''} onValueChange={(v) => update('categoryField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value Field</Label>
            <Select value={widget.config.valueField || ''} onValueChange={(v) => update('valueField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Map Visual config */}
      {isMap && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Latitude Field</Label>
            <Select value={widget.config.latField || ''} onValueChange={(v) => update('latField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Longitude Field</Label>
            <Select value={widget.config.lngField || ''} onValueChange={(v) => update('lngField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Location Field (text)</Label>
            <Select value={widget.config.locationField || ''} onValueChange={(v) => update('locationField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Country/City/Region" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Value Field</Label>
            <Select value={widget.config.valueField || ''} onValueChange={(v) => update('valueField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Decomposition Tree config */}
      {isDecompTree && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Metric Field (numeric)</Label>
            <Select value={widget.config.metricField || ''} onValueChange={(v) => update('metricField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
              <SelectContent>{numCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Breakdown Fields (up to 3)</Label>
            <Select onValueChange={(v) => {
              const current = widget.config.breakdownFields || [];
              if (current.length < 3 && !current.includes(v)) update('breakdownFields', [...current, v]);
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add breakdown field" /></SelectTrigger>
              <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
            </Select>
            {(widget.config.breakdownFields || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {(widget.config.breakdownFields || []).map((f, i) => (
                  <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-[10px]">
                    {i + 1}. {f}
                    <button onClick={() => update('breakdownFields', (widget.config.breakdownFields || []).filter((x) => x !== f))} className="text-muted-foreground hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max Nodes per Level</Label>
            <Input type="number" value={widget.config.maxNodes || 5}
              onChange={(e) => update('maxNodes', Number(e.target.value))} className="h-8 text-xs" min={2} max={20} />
          </div>
        </>
      )}

      {/* Drill-down config */}
      {isDrillable && (
        <div className="space-y-1.5 pt-1 border-t">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Drill-down Hierarchy</Label>
          <Select onValueChange={(v) => {
            const current = widget.config.drillFields || [];
            if (!current.includes(v)) update('drillFields', [...current, v]);
          }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Add drill field" /></SelectTrigger>
            <SelectContent>{allCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
          </Select>
          {(widget.config.drillFields || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {(widget.config.drillFields || []).map((f, i) => (
                <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 rounded text-[10px]">
                  {i + 1}. {f}
                  <button onClick={() => update('drillFields', (widget.config.drillFields || []).filter((x) => x !== f))} className="text-muted-foreground hover:text-destructive">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Aggregation */}
      {!['table', 'slicer', 'daterange', 'smartnarrative', 'histogram', 'boxplot', 'combo', 'map', 'decomptree'].includes(widget.type) && (
        <div className="space-y-1.5">
          <Label className="text-xs">Aggregation</Label>
          <Select value={widget.config.aggregation || 'sum'} onValueChange={(v) => update('aggregation', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['sum', 'avg', 'count', 'min', 'max'].map((a) => (
                <SelectItem key={a} value={a} className="text-xs">{a.toUpperCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Format (KPI) */}
      {isKpi && (
        <div className="space-y-1.5">
          <Label className="text-xs">Format</Label>
          <Select value={widget.config.format || 'number'} onValueChange={(v) => update('format', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="number" className="text-xs">Number</SelectItem>
              <SelectItem value="currency" className="text-xs">Currency</SelectItem>
              <SelectItem value="percent" className="text-xs">Percent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Limit */}
      <div className="space-y-1.5">
        <Label className="text-xs">Max Items</Label>
        <Input
          type="number"
          value={widget.config.limit || ''}
          onChange={(e) => update('limit', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="All"
          className="h-8 text-xs"
        />
      </div>

      <div className="pt-2 border-t">
        <Button variant="destructive" size="sm" className="w-full h-8 text-xs" onClick={() => removeWidget(widget.id)}>
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Widget
        </Button>
      </div>
    </div>
  );
}
