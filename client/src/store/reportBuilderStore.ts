import { create } from 'zustand';
import { Widget, ReportLayout, ReportConfig, ChartType, WidgetConfig, FilterSpec, Bookmark } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface ReportBuilderState {
  reportId: string | null;
  reportName: string;
  layout: ReportLayout;
  config: ReportConfig;
  selectedWidgetId: string | null;
  isDirty: boolean;
  globalFilters: Record<string, unknown>;

  // Phase 9 - Cross filters & report filters
  crossFilters: Record<string, { field: string; value: unknown }[]>;
  reportFilters: FilterSpec[];

  // Phase 10 - Bookmarks
  bookmarks: Bookmark[];

  setReport: (id: string, name: string, layout: ReportLayout, config: ReportConfig) => void;
  setReportName: (name: string) => void;
  addWidget: (type: ChartType) => void;
  updateWidget: (id: string, config: Partial<WidgetConfig>) => void;
  updateWidgetLayout: (id: string, layout: Partial<Pick<Widget, 'x' | 'y' | 'w' | 'h'>>) => void;
  removeWidget: (id: string) => void;
  selectWidget: (id: string | null) => void;
  setGlobalFilter: (field: string, value: unknown) => void;
  clearGlobalFilters: () => void;
  markClean: () => void;
  getLayout: () => ReportLayout;

  // Cross-filter actions
  setCrossFilter: (sourceWidgetId: string, field: string, value: unknown) => void;
  clearCrossFilter: (sourceWidgetId: string) => void;

  // Report filter actions
  addReportFilter: (filter: FilterSpec) => void;
  removeReportFilter: (index: number) => void;

  // Bookmark actions
  saveBookmark: (name: string) => void;
  applyBookmark: (id: string) => void;
  deleteBookmark: (id: string) => void;
}

const DEFAULT_SIZES: Record<ChartType, { w: number; h: number }> = {
  bar: { w: 6, h: 4 }, line: { w: 6, h: 4 }, pie: { w: 4, h: 4 }, donut: { w: 4, h: 4 },
  area: { w: 6, h: 4 }, scatter: { w: 6, h: 4 }, kpi: { w: 3, h: 2 }, number: { w: 3, h: 2 },
  table: { w: 8, h: 4 }, matrix: { w: 8, h: 4 }, slicer: { w: 3, h: 2 },
  daterange: { w: 4, h: 2 }, gauge: { w: 4, h: 4 },
  combo: { w: 8, h: 4 }, waterfall: { w: 6, h: 4 }, treemap: { w: 6, h: 4 },
  smartnarrative: { w: 6, h: 3 }, cardtrend: { w: 3, h: 2 },
  histogram: { w: 6, h: 4 }, boxplot: { w: 6, h: 4 },
  map: { w: 8, h: 5 }, decomptree: { w: 10, h: 5 }, funnel: { w: 6, h: 5 }, heatmap: { w: 8, h: 5 },
};

export const useReportBuilderStore = create<ReportBuilderState>((set, get) => ({
  reportId: null,
  reportName: 'Untitled Report',
  layout: { widgets: [] },
  config: { theme: 'light', refreshInterval: 0, globalFilters: [] },
  selectedWidgetId: null,
  isDirty: false,
  globalFilters: {},
  crossFilters: {},
  reportFilters: [],
  bookmarks: [],

  setReport: (id, name, layout, config) =>
    set({ reportId: id, reportName: name, layout, config, isDirty: false, selectedWidgetId: null }),

  setReportName: (name) => set({ reportName: name, isDirty: true }),

  addWidget: (type) => {
    const { w, h } = DEFAULT_SIZES[type] || { w: 4, h: 4 };
    const newWidget: Widget = {
      id: uuidv4(), type, x: 0, y: Infinity, w, h,
      config: { title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}` },
    };
    set((s) => ({
      layout: { widgets: [...s.layout.widgets, newWidget] },
      selectedWidgetId: newWidget.id,
      isDirty: true,
    }));
  },

  updateWidget: (id, config) =>
    set((s) => ({
      layout: {
        widgets: s.layout.widgets.map((w) =>
          w.id === id ? { ...w, config: { ...w.config, ...config } } : w
        ),
      },
      isDirty: true,
    })),

  updateWidgetLayout: (id, layoutUpdate) =>
    set((s) => ({
      layout: {
        widgets: s.layout.widgets.map((w) => (w.id === id ? { ...w, ...layoutUpdate } : w)),
      },
      isDirty: true,
    })),

  removeWidget: (id) =>
    set((s) => ({
      layout: { widgets: s.layout.widgets.filter((w) => w.id !== id) },
      selectedWidgetId: s.selectedWidgetId === id ? null : s.selectedWidgetId,
      isDirty: true,
    })),

  selectWidget: (id) => set({ selectedWidgetId: id }),

  setGlobalFilter: (field, value) =>
    set((s) => ({ globalFilters: { ...s.globalFilters, [field]: value } })),

  clearGlobalFilters: () => set({ globalFilters: {} }),

  markClean: () => set({ isDirty: false }),

  getLayout: () => get().layout,

  setCrossFilter: (sourceWidgetId, field, value) =>
    set((s) => ({
      crossFilters: { ...s.crossFilters, [sourceWidgetId]: [{ field, value }] },
    })),

  clearCrossFilter: (sourceWidgetId) =>
    set((s) => {
      const { [sourceWidgetId]: _, ...rest } = s.crossFilters;
      return { crossFilters: rest };
    }),

  addReportFilter: (filter) =>
    set((s) => ({ reportFilters: [...s.reportFilters, filter], isDirty: true })),

  removeReportFilter: (index) =>
    set((s) => ({ reportFilters: s.reportFilters.filter((_, i) => i !== index), isDirty: true })),

  saveBookmark: (name) => {
    const state = get();
    const bookmark: Bookmark = {
      id: uuidv4(),
      name,
      reportFilters: state.reportFilters,
      crossFilters: state.crossFilters,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ bookmarks: [...s.bookmarks, bookmark], isDirty: true }));
  },

  applyBookmark: (id) => {
    const state = get();
    const bm = state.bookmarks.find((b) => b.id === id);
    if (!bm) return;
    set({ reportFilters: bm.reportFilters, crossFilters: bm.crossFilters });
  },

  deleteBookmark: (id) =>
    set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id), isDirty: true })),
}));
