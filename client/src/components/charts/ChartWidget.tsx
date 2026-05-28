import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { Widget, AggregatedResult, FilterSpec } from '@/types';
import { datasetAPI, publicDataAPI } from '@/services/api';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, X, MapPin, Globe } from 'lucide-react';
import { useReportBuilderStore } from '@/store/reportBuilderStore';

/** Minimal ECharts instance surface needed for PDF export */
export interface EChartsExportInstance {
  resize(): void;
  getDom(): HTMLElement;
  getDataURL(opts: object): string;
  getOption(): object;
  setOption(opts: object, notMerge?: object): void;
}

/**
 * Global registry: widgetId → ECharts instance.
 * PDF export reads from this map instead of calling echartsLib.getInstanceByDom(),
 * which silently returns undefined when echarts-for-react uses a different module
 * instance of echarts than a direct `import * as echarts from 'echarts'`.
 */
export const echartsRegistry = new Map<string, EChartsExportInstance>();

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

interface ChartWidgetProps {
  widget: Widget;
  globalFilters?: Record<string, unknown>;
  isSelected?: boolean;
  onSelect?: () => void;
  readOnly?: boolean;
  /** Share-link token — enables unauthenticated data fetch on public report pages */
  publicToken?: string;
  /** Embed token — enables unauthenticated data fetch on embed pages */
  embedToken?: string;
}

export function ChartWidget({ widget, globalFilters = {}, isSelected, onSelect, readOnly = false, publicToken, embedToken }: ChartWidgetProps) {
  const [data, setData] = useState<AggregatedResult[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drill-down state
  const [drillLevel, setDrillLevel] = useState(0);
  const [drillPath, setDrillPath] = useState<{ field: string; value: string }[]>([]);

  const { config, type } = widget;

  // Zustand store for cross-filtering
  const { crossFilters, reportFilters, setCrossFilter, clearCrossFilter } = useReportBuilderStore();

  // Check if this widget is source of a cross-filter
  const myActiveCrossFilter = crossFilters[widget.id];

  // Build merged filters from reportFilters + cross-filters from OTHER widgets
  const mergedExternalFilters = useMemo<FilterSpec[]>(() => {
    const f: FilterSpec[] = [...reportFilters];
    for (const [srcId, cfList] of Object.entries(crossFilters)) {
      if (srcId === widget.id) continue; // exclude self
      for (const cf of cfList) {
        f.push({ field: cf.field, operator: 'eq', value: cf.value });
      }
    }
    // Add drill-path filters
    for (const dp of drillPath) {
      f.push({ field: dp.field, operator: 'eq', value: dp.value });
    }
    // Merge globalFilters
    for (const [field, value] of Object.entries(globalFilters)) {
      if (value !== null && value !== undefined && value !== '') {
        f.push({ field, operator: 'eq', value });
      }
    }
    return f;
  }, [reportFilters, crossFilters, widget.id, drillPath, globalFilters]);

  const fetchData = useCallback(async () => {
    if (!config.datasetId) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};

      // Chart types that need raw rows — skip aggregation params so the API returns individual rows
      const RAW_ROW_TYPES = ['histogram', 'boxplot', 'scatter', 'matrix', 'decomposition', 'decomptree', 'table', 'map', 'heatmap'];
      const needsRawRows = RAW_ROW_TYPES.includes(type);

      // Determine effective groupBy considering drill-down
      const drillFields = config.drillFields || [];
      const effectiveGroupBy = drillLevel > 0 && drillFields[drillLevel]
        ? drillFields[drillLevel]
        : (config.groupField || config.xField || config.categoryField);

      if (!needsRawRows && effectiveGroupBy) params.groupBy = effectiveGroupBy;
      if (!needsRawRows && (config.valueField || config.yField)) params.valueField = config.valueField || config.yField;
      if (!needsRawRows && config.aggregation) params.aggregation = config.aggregation;
      if (config.sortBy) params.sortBy = config.sortBy;
      if (config.sortOrder) params.sortOrder = config.sortOrder;
      // Raw-row charts need enough rows; default to 500 unless explicitly limited
      if (config.limit) params.limit = config.limit;
      else if (needsRawRows) params.limit = 500;

      // Merge all filters
      const activeFilters = [...(config.filters || []), ...mergedExternalFilters];
      if (activeFilters.length) params.filters = JSON.stringify(activeFilters);

      // Choose the right fetcher: public share link, embed token, or authenticated
      let res;
      if (publicToken) {
        res = await publicDataAPI.getRows(publicToken, { datasetId: config.datasetId!, ...params });
      } else if (embedToken) {
        res = await publicDataAPI.getEmbedRows(embedToken, { datasetId: config.datasetId!, ...params });
      } else {
        res = await datasetAPI.rows(config.datasetId!, params);
      }
      if (Array.isArray(res.data.data) && res.data.data.length > 0 && res.data.data[0]?.label !== undefined) {
        setData(res.data.data);
        setRawRows([]);
      } else {
        setRawRows(res.data.data || []);
        setData([]);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load data';
      setError(msg);
      setData([]);
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  }, [config, mergedExternalFilters, drillLevel, publicToken, embedToken]);

  useEffect(() => {
    if (!config.datasetId) return;
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(fetchData, 300);
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
  }, [fetchData, config.datasetId]);

  // Register ECharts instance into the global registry so PDF export can find it
  // regardless of module bundling (echarts-for-react may use a different echarts
  // module instance than `import * as echarts` imported directly in another file).
  const handleChartReady = useCallback((inst: EChartsExportInstance) => {
    echartsRegistry.set(widget.id, inst);
  }, [widget.id]);

  // Clean up registry on unmount
  useEffect(() => {
    return () => { echartsRegistry.delete(widget.id); };
  }, [widget.id]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  // Cross-filter click handler
  const handleChartClick = useCallback((params: { name?: string; value?: unknown; data?: unknown }) => {
    if (readOnly) return;
    const clickedValue = params.name || String(params.value ?? '');
    const xField = config.groupField || config.xField || config.categoryField || '';
    if (!xField || !clickedValue) return;

    // Drill-down if drillFields configured
    const drillFields = config.drillFields || [];
    if (drillFields.length > 0 && drillLevel < drillFields.length - 1) {
      setDrillPath((prev) => [...prev, { field: drillFields[drillLevel], value: clickedValue }]);
      setDrillLevel((prev) => prev + 1);
      return;
    }

    // Cross-filter
    if (myActiveCrossFilter?.[0]?.value === clickedValue) {
      clearCrossFilter(widget.id);
    } else {
      setCrossFilter(widget.id, xField, clickedValue);
    }
  }, [readOnly, config, drillLevel, myActiveCrossFilter, setCrossFilter, clearCrossFilter, widget.id]);

  const drillUp = () => {
    if (drillLevel > 0) {
      setDrillLevel((l) => l - 1);
      setDrillPath((p) => p.slice(0, -1));
    }
  };

  if (loading) {
    return <div className="w-full h-full p-3"><Skeleton className="w-full h-full" /></div>;
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 border-2 border-destructive/30 rounded">
        <AlertCircle className="w-5 h-5 text-destructive mb-2" />
        <p className="text-xs text-destructive text-center mb-2">{error}</p>
        <button onClick={fetchData} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (!config.datasetId) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
        <span className="text-2xl mb-2">📊</span>
        <p className="text-xs">Select a dataset and configure this {type} chart</p>
      </div>
    );
  }

  // Cross-filter active indicator (clear button for source widget)
  const CrossFilterBadge = () => {
    if (!myActiveCrossFilter || readOnly) return null;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); clearCrossFilter(widget.id); }}
        className="absolute top-1 right-1 z-10 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground text-[9px] rounded-full shadow"
      >
        <X className="w-2.5 h-2.5" /> {myActiveCrossFilter[0]?.value as string}
      </button>
    );
  };

  // Drill breadcrumb
  const DrillBreadcrumb = () => {
    if (drillPath.length === 0) return null;
    return (
      <div className="absolute top-1 left-1 z-10 flex items-center gap-1 text-[9px] bg-background/90 border rounded px-1.5 py-0.5">
        <button onClick={() => { setDrillLevel(0); setDrillPath([]); }} className="text-muted-foreground hover:text-foreground">All</button>
        {drillPath.map((dp, i) => (
          <React.Fragment key={i}>
            <span className="text-muted-foreground">›</span>
            <button
              onClick={() => { setDrillLevel(i); setDrillPath((p) => p.slice(0, i)); }}
              className="text-primary font-medium"
            >{dp.value}</button>
          </React.Fragment>
        ))}
        <button onClick={drillUp} className="ml-1 text-muted-foreground hover:text-foreground border-l pl-1">↑</button>
      </div>
    );
  };

  // ── KPI Card ──────────────────────────────────────────────────────────────
  if (type === 'kpi' || type === 'number') {
    const value = data.length > 0 ? data.reduce((s, d) => s + d.value, 0) : 0;
    const formatted = config.format === 'currency' ? formatCurrency(value) : formatNumber(value);

    // Real period-over-period change: compare the most recent group to the
    // previous one (only meaningful when the data is grouped into ≥2 points).
    let pctChange: number | null = null;
    if (data.length >= 2) {
      const latest = data[data.length - 1].value;
      const previous = data[data.length - 2].value;
      if (previous !== 0) pctChange = ((latest - previous) / Math.abs(previous)) * 100;
    }
    const positive = pctChange !== null && pctChange >= 0;

    return (
      <div className="w-full h-full flex flex-col p-4 justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground truncate">{config.title}</p>
          {config.subtitle && <p className="text-[10px] text-muted-foreground/60">{config.subtitle}</p>}
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight text-foreground">{formatted}</p>
          {pctChange !== null && (
            <div className="flex items-center gap-1 mt-1">
              {positive ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={`text-[10px] font-medium ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                {positive ? '+' : ''}{pctChange.toFixed(1)}%
              </span>
              <span className="text-[10px] text-muted-foreground">vs previous</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Table ─────────────────────────────────────────────────────────────────
  if (type === 'table') {
    const cols = config.columns || (rawRows.length > 0 ? Object.keys(rawRows[0]).slice(0, 6) : []);
    const rows = rawRows.slice(0, 50);
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {config.title && <p className="text-xs font-semibold px-3 pt-2 pb-1 text-foreground shrink-0">{config.title}</p>}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80">
              <tr>{cols.map((c) => <th key={c} className="text-left px-3 py-1.5 font-medium text-muted-foreground whitespace-nowrap">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                  {cols.map((c) => <td key={c} className="px-3 py-1.5 text-foreground/80 whitespace-nowrap">{String(row[c] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Slicer ────────────────────────────────────────────────────────────────
  if (type === 'daterange') {
    return (
      <div className="w-full h-full p-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-foreground">{config.title || 'Date Range Filter'}</p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1"><label className="text-[10px] text-muted-foreground">From</label><input type="date" className="h-7 text-xs border rounded px-2 bg-background" /></div>
          <div className="flex flex-col gap-1"><label className="text-[10px] text-muted-foreground">To</label><input type="date" className="h-7 text-xs border rounded px-2 bg-background" /></div>
        </div>
        <p className="text-[10px] text-muted-foreground">Field: {config.xField || 'Date'}</p>
      </div>
    );
  }

  if (type === 'slicer') {
    const vals = [...new Set(data.map((d) => d.label))].slice(0, 20);
    return (
      <div className="w-full h-full p-3">
        <p className="text-xs font-semibold mb-2 text-foreground">{config.title || 'Filter'}</p>
        <div className="flex flex-wrap gap-1.5">
          {vals.map((v) => (
            <button key={v} className="px-2.5 py-1 text-xs rounded-full border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors">
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Smart Narrative ───────────────────────────────────────────────────────
  if (type === 'smartnarrative') {
    const nums = data.map((d) => d.value);
    const totalVal = nums.reduce((a, b) => a + b, 0);
    const avg = nums.length ? totalVal / nums.length : 0;
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    // Detect trend if data appears time-ordered
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstHalfAvg = firstHalf.length ? firstHalf.reduce((s, d) => s + d.value, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length ? secondHalf.reduce((s, d) => s + d.value, 0) / secondHalf.length : 0;
    const trend = secondHalfAvg > firstHalfAvg ? 'upward' : secondHalfAvg < firstHalfAvg ? 'downward' : 'flat';

    const stats = [
      { label: 'Total', value: config.format === 'currency' ? formatCurrency(totalVal) : formatNumber(totalVal), icon: '📊' },
      { label: 'Average', value: config.format === 'currency' ? formatCurrency(avg) : formatNumber(avg), icon: '📈' },
      top && { label: 'Highest', value: `${top.label}: ${formatNumber(top.value)}`, icon: '🏆' },
      bottom && bottom.label !== top?.label && { label: 'Lowest', value: `${bottom.label}: ${formatNumber(bottom.value)}`, icon: '📉' },
    ].filter(Boolean) as { label: string; value: string; icon: string }[];

    return (
      <div className="w-full h-full p-4 overflow-auto flex flex-col gap-3">
        {config.title && <p className="text-sm font-semibold">{config.title}</p>}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {config.title || 'The dataset'} shows a total of{' '}
          <strong>{config.format === 'currency' ? formatCurrency(totalVal) : formatNumber(totalVal)}</strong>{' '}
          across <strong>{data.length}</strong> {data.length === 1 ? 'category' : 'categories'}.{' '}
          {top && <>The top performer is <strong>{top.label}</strong> with <strong>{formatNumber(top.value)}</strong>. </>}
          The average per category is <strong>{formatNumber(avg)}</strong>.{' '}
          {data.length > 2 && (
            <>Overall trend appears <strong>{trend}</strong> compared to earlier periods.</>
          )}
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          {stats.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs font-medium">
              {s.icon} {s.label}: {s.value}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Card with Trend ───────────────────────────────────────────────────────
  if (type === 'cardtrend') {
    const current = data.length > 0 ? data[0].value : 0;
    const prev = data.length > 1 ? data[data.length - 1].value : null;
    const delta = prev !== null ? current - prev : null;
    const pct = prev !== null && prev !== 0 ? (delta! / Math.abs(prev)) * 100 : null;
    const positive = delta !== null && delta >= 0;
    return (
      <div className="w-full h-full flex flex-col p-4 justify-between">
        <p className="text-xs font-medium text-muted-foreground truncate">{config.title}</p>
        <div>
          <p className="text-3xl font-bold tracking-tight">
            {config.format === 'currency' ? formatCurrency(current) : formatNumber(current)}
          </p>
          {delta !== null && (
            <div className="flex items-center gap-1 mt-1">
              {positive ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
              <span className={`text-[10px] font-medium ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                {positive ? '+' : ''}{formatNumber(delta)}
                {pct !== null && ` (${pct.toFixed(1)}%)`}
              </span>
              <span className="text-[10px] text-muted-foreground">vs prev</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Matrix (pivot table) ──────────────────────────────────────────────────
  if (type === 'matrix') {
    const rowField = config.rowFields?.[0] || config.xField;
    const colField = config.columnField || config.groupField;
    const valField = config.valueField;
    if (!rowField || !colField || !valField) {
      return <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Configure row, column, and value fields</div>;
    }
    const rows50 = rawRows.slice(0, 50);
    const rowKeys = [...new Set(rows50.map((r) => String(r[rowField] ?? '')))];
    const colKeys = [...new Set(rows50.map((r) => String(r[colField] ?? '')))].slice(0, 10);
    const cellMap: Record<string, number> = {};
    for (const row of rows50) {
      const rk = String(row[rowField] ?? '');
      const ck = String(row[colField] ?? '');
      cellMap[`${rk}||${ck}`] = (cellMap[`${rk}||${ck}`] || 0) + (Number(row[valField]) || 0);
    }
    return (
      <div className="w-full h-full overflow-auto">
        {config.title && <p className="text-xs font-semibold px-3 pt-2">{config.title}</p>}
        <table className="w-full text-[10px]">
          <thead className="sticky top-0 bg-muted/80">
            <tr>
              <th className="px-2 py-1 text-left font-medium text-muted-foreground">{rowField}</th>
              {colKeys.map((ck) => <th key={ck} className="px-2 py-1 font-medium text-muted-foreground text-right">{ck}</th>)}
            </tr>
          </thead>
          <tbody>
            {rowKeys.map((rk) => (
              <tr key={rk} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-2 py-1 font-medium">{rk}</td>
                {colKeys.map((ck) => <td key={ck} className="px-2 py-1 text-right">{cellMap[`${rk}||${ck}`] !== undefined ? formatNumber(cellMap[`${rk}||${ck}`]) : '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Map Visual ────────────────────────────────────────────────────────────
  if (type === 'map') {
    // Detect lat/lng columns
    const latField = config.latField || rawRows[0] && (
      Object.keys(rawRows[0]).find((k) => /^lat(itude)?$/i.test(k))
    );
    const lngField = config.lngField || rawRows[0] && (
      Object.keys(rawRows[0]).find((k) => /^(lng|lon|longitude|long)$/i.test(k))
    );
    const locationField = config.locationField || rawRows[0] && (
      Object.keys(rawRows[0]).find((k) => /country|city|region|location|state/i.test(k))
    );
    const valueField = config.valueField || rawRows[0] && (
      Object.keys(rawRows[0]).find((k) => {
        const v = rawRows[0][k];
        return typeof v === 'number';
      })
    );

    if (latField && lngField && rawRows.length > 0) {
      // Lat/Lng scatter on a geographic grid
      const scatterData = rawRows
        .map((r) => {
          const lat = Number(r[latField]) || 0;
          const lng = Number(r[lngField]) || 0;
          const val = valueField ? Number(r[valueField]) || 0 : 1;
          const label = locationField ? String(r[locationField] ?? '') : `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
          return [lng, lat, val, label] as [number, number, number, string];
        })
        .filter(([lng, lat]) => lat !== 0 || lng !== 0);

      const maxVal = Math.max(...scatterData.map(([, , v]) => v), 1);
      const option = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          formatter: (p: { data: [number, number, number, string] }) =>
            `${p.data[3]}: ${formatNumber(p.data[2])}`,
        },
        grid: { top: 30, right: 10, bottom: 30, left: 50, containLabel: true },
        xAxis: { type: 'value', name: 'Longitude', min: -180, max: 180, axisLabel: { fontSize: 9 } },
        yAxis: { type: 'value', name: 'Latitude', min: -90, max: 90, axisLabel: { fontSize: 9 } },
        series: [{
          type: 'scatter',
          data: scatterData,
          symbolSize: (d: [number, number, number]) => Math.max(6, Math.min(30, (d[2] / maxVal) * 30)),
          itemStyle: { color: CHART_COLORS[0], opacity: 0.7 },
          emphasis: { itemStyle: { opacity: 1, borderWidth: 2, borderColor: '#fff' } },
        }],
      };
      return (
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b shrink-0">
            <MapPin className="w-3 h-3 text-blue-500" />
            <span className="text-[11px] font-medium">{config.title || 'Map View'}</span>
            <span className="text-[10px] text-muted-foreground ml-1">({scatterData.length} locations)</span>
          </div>
          <div className="flex-1">
            <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'canvas' }} notMerge onChartReady={handleChartReady} />
          </div>
        </div>
      );
    }

    // Fallback: bar chart by location — aggregate (sum) per location so each
    // location appears once, not one bar per raw row.
    const locField = locationField || (data.length > 0 ? '' : Object.keys(rawRows[0] || {})[0]);
    let chartData: { label: string; value: number; count: number }[];
    if (data.length > 0) {
      chartData = data;
    } else {
      const agg = new Map<string, number>();
      for (const r of rawRows) {
        const key = String(r[locField || ''] ?? '');
        const val = valueField ? Number(r[valueField]) || 0 : 1;
        agg.set(key, (agg.get(key) || 0) + val);
      }
      chartData = Array.from(agg.entries())
        .map(([label, value]) => ({ label, value, count: 1 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 20);
    }

    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b shrink-0">
          <Globe className="w-3 h-3 text-blue-500" />
          <span className="text-[11px] font-medium">{config.title || 'Map View'}</span>
          <span className="text-[10px] text-muted-foreground ml-1 italic">Location Bar Chart</span>
        </div>
        <div className="flex-1">
          <ReactECharts
            option={{
              grid: { top: 10, right: 10, bottom: 50, left: 10, containLabel: true },
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: chartData.map((d) => d.label), axisLabel: { fontSize: 9, rotate: 30 } },
              yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
              series: [{ type: 'bar', data: chartData.map((d) => d.value), itemStyle: { color: CHART_COLORS[0], borderRadius: [3, 3, 0, 0] } }],
            }}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'canvas' }}
            notMerge
            onChartReady={handleChartReady}
          />
        </div>
      </div>
    );
  }

  // ── Decomposition Tree ────────────────────────────────────────────────────
  if (type === 'decomptree') {
    const metricField = config.metricField || config.valueField;
    const breakdownFields = config.breakdownFields || [config.groupField || config.xField || ''].filter(Boolean);
    const maxNodes = config.maxNodes || 5;

    if (!metricField || breakdownFields.length === 0 || rawRows.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          Configure metric field and at least one breakdown field
        </div>
      );
    }

    const grandTotal = rawRows.reduce((s, r) => s + (Number(r[metricField]) || 0), 0);

    // Build tree structure
    interface TreeNode {
      name: string;
      value: number;
      children?: TreeNode[];
    }

    const buildLevel = (rows: Record<string, unknown>[], field: string, depth: number): TreeNode[] => {
      const groups = new Map<string, Record<string, unknown>[]>();
      for (const row of rows) {
        const key = String(row[field] ?? 'Unknown');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row);
      }
      return Array.from(groups.entries())
        .map(([label, groupRows]) => {
          const val = groupRows.reduce((s, r) => s + (Number(r[metricField]) || 0), 0);
          const nextField = breakdownFields[depth + 1];
          return {
            name: `${label}\n${formatNumber(val)}`,
            value: val,
            children: nextField && depth + 1 < breakdownFields.length
              ? buildLevel(groupRows, nextField, depth + 1)
              : undefined,
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, maxNodes);
    };

    const treeData: TreeNode = {
      name: `Total\n${formatNumber(grandTotal)}`,
      value: grandTotal,
      children: breakdownFields[0] ? buildLevel(rawRows, breakdownFields[0], 0) : [],
    };

    const option = {
      tooltip: { trigger: 'item', formatter: (p: { data: { name: string } }) => p.data.name.replace('\n', ': ') },
      series: [{
        type: 'tree',
        data: [treeData],
        top: '5%',
        left: '10%',
        bottom: '5%',
        right: '20%',
        symbolSize: 10,
        orient: 'LR',
        label: {
          position: 'left',
          verticalAlign: 'middle',
          align: 'right',
          fontSize: 10,
          formatter: (p: { data: { name: string } }) => p.data.name,
        },
        leaves: { label: { position: 'right', verticalAlign: 'middle', align: 'left', fontSize: 9 } },
        emphasis: { focus: 'descendant' },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
        itemStyle: { color: CHART_COLORS[0], borderColor: CHART_COLORS[0] },
        lineStyle: { color: '#94a3b8', width: 1.5 },
      }],
    };

    return (
      <div className="w-full h-full flex flex-col">
        {config.title && (
          <div className="px-3 py-1.5 border-b shrink-0 flex items-center gap-1.5">
            <span className="text-[11px] font-medium">{config.title}</span>
            <span className="text-[10px] text-muted-foreground">Decomposition Tree</span>
          </div>
        )}
        <div className="flex-1">
          <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'canvas' }} notMerge onChartReady={handleChartReady} />
        </div>
      </div>
    );
  }

  // ── ECharts-based charts ──────────────────────────────────────────────────
  // Compute which bars are "highlighted" by cross-filter from other widgets
  const activeCrossFilterValues = new Set<string>();
  for (const [srcId, cfList] of Object.entries(crossFilters)) {
    if (srcId === widget.id) continue;
    for (const cf of cfList) {
      activeCrossFilterValues.add(String(cf.value));
    }
  }
  const hasCrossHighlight = activeCrossFilterValues.size > 0;

  const getItemStyle = (label: string, baseColor: string) => {
    if (!hasCrossHighlight) return { color: baseColor };
    return {
      color: baseColor,
      opacity: activeCrossFilterValues.has(label) ? 1 : 0.3,
    };
  };

  const getOption = () => {
    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);

    const base = {
      title: config.title ? { text: config.title, textStyle: { fontSize: 12, fontWeight: 600 }, top: 0, left: 0 } : undefined,
      grid: { top: config.title ? 36 : 10, right: 10, bottom: 30, left: 50, containLabel: true },
      tooltip: { trigger: 'axis' as const, backgroundColor: 'rgba(0,0,0,0.8)', textStyle: { color: '#fff', fontSize: 12 } },
    };

    switch (type) {
      case 'bar':
        return {
          ...base,
          xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, rotate: labels.length > 8 ? 30 : 0 } },
          yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => formatNumber(v) } },
          series: [{
            type: 'bar',
            data: data.map((d, i) => ({
              value: d.value,
              itemStyle: getItemStyle(d.label, CHART_COLORS[i % CHART_COLORS.length]),
            })),
            itemStyle: { borderRadius: [3, 3, 0, 0] },
          }],
        };

      case 'line':
      case 'area':
        return {
          ...base,
          xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
          yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => formatNumber(v) } },
          series: [{
            type: 'line', data: values, smooth: true,
            itemStyle: { color: CHART_COLORS[0] },
            lineStyle: { color: CHART_COLORS[0], width: 2 },
            areaStyle: type === 'area' ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: CHART_COLORS[0] + '66' }, { offset: 1, color: CHART_COLORS[0] + '00' }] } } : undefined,
            symbol: 'circle', symbolSize: 5,
          }],
        };

      case 'pie':
      case 'donut':
        return {
          ...base,
          grid: undefined,
          tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
          legend: { bottom: 0, textStyle: { fontSize: 10 } },
          series: [{
            type: 'pie',
            radius: type === 'donut' ? ['40%', '70%'] : '65%',
            center: ['50%', '45%'],
            data: data.map((d, i) => ({
              name: d.label,
              value: d.value,
              itemStyle: getItemStyle(d.label, CHART_COLORS[i % CHART_COLORS.length]),
            })),
            label: { fontSize: 10, formatter: '{b}: {d}%' },
          }],
        };

      case 'scatter': {
        const scatterX = config.xField || '';
        const scatterY = config.yField || config.valueField || '';
        const scatterPts = rawRows.length > 0
          ? rawRows.map((r) => [Number(r[scatterX]) || 0, Number(r[scatterY]) || 0])
          : data.map((d, i) => [i, d.value]);
        return {
          ...base,
          xAxis: { type: 'value', name: scatterX, nameLocation: 'middle', nameGap: 25, axisLabel: { fontSize: 9 } },
          yAxis: { type: 'value', name: scatterY, nameLocation: 'middle', nameGap: 35, axisLabel: { fontSize: 9 } },
          series: [{ type: 'scatter', data: scatterPts, itemStyle: { color: CHART_COLORS[0] }, symbolSize: 6 }],
        };
      }

      case 'gauge': {
        // Show the actual aggregated metric (average across groups), not a share-of-total.
        const gaugeVal = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const gaugeMax = gaugeVal <= 100 ? 100 : Math.ceil(gaugeVal / 100) * 100;
        return {
          series: [{
            type: 'gauge',
            radius: '85%',
            min: 0,
            max: gaugeMax,
            progress: { show: true, width: 12 },
            axisLine: { lineStyle: { width: 12 } },
            axisTick: { show: false },
            splitLine: { length: 8, lineStyle: { width: 1 } },
            axisLabel: { fontSize: 10 },
            anchor: { show: true, showAbove: true, size: 18 },
            title: { show: true, fontSize: 12 },
            detail: { valueAnimation: true, fontSize: 24, fontWeight: 'bold', offsetCenter: [0, '70%'], formatter: (v: number) => formatNumber(v) },
            data: [{ value: +gaugeVal.toFixed(1), name: config.title || 'Value' }],
          }],
        };
      }

      case 'combo': {
        // Two distinct metrics from raw rows when configured…
        const hasTwoFields = rawRows.length > 0 && !!config.lineField && (config.barField || config.yField);
        if (hasTwoFields) {
          const xLabels = rawRows.map((r) => String(r[config.xField || ''] ?? ''));
          const barVals = rawRows.map((r) => Number(r[config.barField || config.yField || '']) || 0);
          const lineVals = rawRows.map((r) => Number(r[config.lineField || '']) || 0);
          return {
            ...base,
            xAxis: { type: 'category', data: xLabels, axisLabel: { fontSize: 10 } },
            yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
            series: [
              { type: 'bar', data: barVals, name: config.barField || config.yField || 'Bar', itemStyle: { color: CHART_COLORS[0] } },
              { type: 'line', data: lineVals, name: config.lineField || 'Line', smooth: true, itemStyle: { color: CHART_COLORS[1] } },
            ],
            legend: { bottom: 0, textStyle: { fontSize: 10 } },
          };
        }
        // …otherwise Pareto-style: bars = value, line = cumulative total (no duplicate series).
        let running = 0;
        const cumulative = values.map((v) => (running += v));
        return {
          ...base,
          xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10, rotate: labels.length > 8 ? 30 : 0 } },
          yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: (v: number) => formatNumber(v) } },
          series: [
            { type: 'bar', data: values, name: config.yField || 'Value', itemStyle: { color: CHART_COLORS[0], borderRadius: [3, 3, 0, 0] } },
            { type: 'line', data: cumulative, name: 'Cumulative', smooth: true, itemStyle: { color: CHART_COLORS[1] }, lineStyle: { width: 2 } },
          ],
          legend: { bottom: 0, textStyle: { fontSize: 10 } },
        };
      }

      case 'waterfall': {
        let running = 0;
        const waterfallData = data.map((d) => {
          const base2 = running;
          running += d.value;
          return { base: base2, value: d.value };
        });
        return {
          ...base,
          xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
          yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
          series: [
            { type: 'bar', data: waterfallData.map((d) => d.base), itemStyle: { color: 'transparent' }, stack: 'wf' },
            {
              type: 'bar',
              data: waterfallData.map((d) => d.value),
              itemStyle: { color: (p: { dataIndex: number }) => waterfallData[p.dataIndex].value >= 0 ? CHART_COLORS[1] : CHART_COLORS[3] },
              stack: 'wf',
            },
          ],
        };
      }

      case 'treemap':
        return {
          series: [{
            type: 'treemap',
            data: data.map((d, i) => ({ name: d.label, value: d.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } })),
            label: { show: true, formatter: '{b}', fontSize: 10 },
            breadcrumb: { show: false },
          }],
        };

      case 'histogram': {
        const valField = config.valueField || config.yField || '';
        const allVals = rawRows.map((r) => Number(r[valField]) || 0).filter((v) => isFinite(v));
        const binCount = config.binCount || 10;
        if (allVals.length === 0) return base;
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        const binSize = (maxVal - minVal) / binCount || 1;
        const bins = Array.from({ length: binCount }, (_, i) => ({ min: minVal + i * binSize, count: 0 }));
        for (const v of allVals) {
          const idx = Math.min(Math.floor((v - minVal) / binSize), binCount - 1);
          bins[idx].count++;
        }
        return {
          ...base,
          xAxis: { type: 'category', data: bins.map((b) => formatNumber(b.min)), axisLabel: { fontSize: 9 } },
          yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
          series: [{ type: 'bar', data: bins.map((b) => b.count), itemStyle: { color: CHART_COLORS[0] }, barCategoryGap: '0%' }],
        };
      }

      case 'boxplot': {
        const valField2 = config.valueField || config.yField || '';
        const groupField2 = config.xField || config.groupField || '';
        if (groupField2 && rawRows.length > 0) {
          // Grouped boxplot: one box per group
          const groups = [...new Set(rawRows.map((r) => String(r[groupField2] ?? '')))].slice(0, 8);
          const q = (arr: number[], p: number) => arr.length === 0 ? 0 : (arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] ?? 0);
          const boxData = groups.map((g) => {
            const vals = rawRows.filter((r) => String(r[groupField2]) === g).map((r) => Number(r[valField2]) || 0).sort((a, b) => a - b);
            return [q(vals, 0), q(vals, 0.25), q(vals, 0.5), q(vals, 0.75), q(vals, 1)];
          });
          return {
            ...base,
            xAxis: { type: 'category', data: groups, axisLabel: { fontSize: 9, rotate: 20 } },
            yAxis: { type: 'value', axisLabel: { fontSize: 9 } },
            series: [{ type: 'boxplot', data: boxData, itemStyle: { color: CHART_COLORS[0] } }],
          };
        }
        const allVals2 = rawRows.map((r) => Number(r[valField2]) || 0).sort((a, b) => a - b);
        if (allVals2.length === 0) return base;
        const q2 = (arr: number[], p: number) => arr.length === 0 ? 0 : (arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] ?? 0);
        const boxData2 = [[q2(allVals2, 0), q2(allVals2, 0.25), q2(allVals2, 0.5), q2(allVals2, 0.75), q2(allVals2, 1)]];
        return {
          ...base,
          xAxis: { type: 'category', data: [config.valueField || 'Values'] },
          yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
          series: [{ type: 'boxplot', data: boxData2, itemStyle: { color: CHART_COLORS[0] } }],
        };
      }

      case 'funnel': {
        const funnelData = data.length > 0
          ? data.slice(0, 8).map((d, i) => ({ name: d.label, value: d.value, itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] } }))
          : [];
        return {
          tooltip: { trigger: 'item', formatter: '{b}: {c}' },
          series: [{
            type: 'funnel',
            left: '10%', width: '80%', top: 20, bottom: 20,
            sort: 'descending',
            gap: 2,
            label: { show: true, position: 'inside', fontSize: 10, formatter: '{b}\n{c}' },
            data: funnelData,
          }],
        };
      }

      case 'heatmap': {
        // Build a 2D heatmap from groupBy (x=hours/cols) and xField (y=days/rows)
        const hx = config.xField || '';   // e.g. DayOfWeek — becomes Y axis
        const hy = config.groupField || config.yField || ''; // e.g. Hour — becomes X axis
        const hval = config.valueField || config.yField || '';
        if (data.length > 0 && hx) {
          // Aggregated data: use data labels as y-axis
          const yKeys = [...new Set(data.map((d) => d.label))];
          const heatData = data.map((d, i) => [i, 0, d.value]);
          return {
            tooltip: { position: 'top', formatter: (p: { value: [number, number, number] }) => formatNumber(p.value[2]) },
            grid: { top: 20, right: 10, bottom: 40, left: 80 },
            xAxis: { type: 'category', data: yKeys, axisLabel: { fontSize: 9 } },
            yAxis: { type: 'category', data: ['Value'], axisLabel: { fontSize: 9 } },
            visualMap: { min: 0, max: Math.max(...data.map((d) => d.value), 1), calculable: true, orient: 'horizontal', left: 'center', bottom: 0, textStyle: { fontSize: 9 }, itemHeight: 60 },
            series: [{ type: 'heatmap', data: heatData, label: { show: true, fontSize: 8 } }],
          };
        }
        // Raw rows 2D heatmap
        const xKeys = [...new Set(rawRows.map((r) => String(r[hx] ?? '')))].slice(0, 24);
        const yKeys2 = [...new Set(rawRows.map((r) => String(r[hy] ?? '')))].slice(0, 10);
        const cellMap: Record<string, number> = {};
        for (const r of rawRows) {
          const xk = String(r[hx] ?? ''); const yk = String(r[hy] ?? '');
          cellMap[`${xk}||${yk}`] = (cellMap[`${xk}||${yk}`] || 0) + (hval ? (Number(r[hval]) || 0) : 1);
        }
        const heatData2 = xKeys.flatMap((xk, xi) => yKeys2.map((yk, yi) => [xi, yi, cellMap[`${xk}||${yk}`] || 0]));
        const maxHeat = Math.max(...heatData2.map(([, , v]) => v as number), 1);
        return {
          tooltip: { position: 'top', formatter: (p: { value: [number, number, number] }) => formatNumber(p.value[2]) },
          grid: { top: 20, right: 10, bottom: 60, left: 80 },
          xAxis: { type: 'category', data: xKeys, axisLabel: { fontSize: 8, rotate: 30 } },
          yAxis: { type: 'category', data: yKeys2, axisLabel: { fontSize: 9 } },
          visualMap: { min: 0, max: maxHeat, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, textStyle: { fontSize: 9 }, itemHeight: 60 },
          series: [{ type: 'heatmap', data: heatData2, label: { show: rawRows.length < 100, fontSize: 8 } }],
        };
      }

      default:
        return {};
    }
  };

  return (
    <div className="w-full h-full relative">
      <CrossFilterBadge />
      <DrillBreadcrumb />
      <ReactECharts
        option={getOption()}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge
        onEvents={readOnly ? undefined : { click: handleChartClick }}
        onChartReady={handleChartReady}
      />
    </div>
  );
}
