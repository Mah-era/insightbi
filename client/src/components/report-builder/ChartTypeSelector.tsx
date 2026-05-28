import { ChartType } from '@/types';
import { cn } from '@/lib/utils';

const CHART_TYPES: Array<{ type: ChartType; label: string; icon: string; comingSoon?: boolean }> = [
  { type: 'bar', label: 'Bar', icon: '▊' },
  { type: 'line', label: 'Line', icon: '📈' },
  { type: 'area', label: 'Area', icon: '◿' },
  { type: 'pie', label: 'Pie', icon: '◔' },
  { type: 'donut', label: 'Donut', icon: '◎' },
  { type: 'scatter', label: 'Scatter', icon: '⁙' },
  { type: 'combo', label: 'Combo', icon: '⧉' },
  { type: 'waterfall', label: 'Waterfall', icon: '⬇' },
  { type: 'treemap', label: 'Treemap', icon: '⊟' },
  { type: 'histogram', label: 'Histogram', icon: '▬' },
  { type: 'boxplot', label: 'Box Plot', icon: '⊡' },
  { type: 'kpi', label: 'KPI Card', icon: '◈' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'cardtrend', label: 'Card+Trend', icon: '↗' },
  { type: 'smartnarrative', label: 'Narrative', icon: '✦' },
  { type: 'table', label: 'Table', icon: '≡' },
  { type: 'matrix', label: 'Matrix', icon: '⊞' },
  { type: 'gauge', label: 'Gauge', icon: '◑' },
  { type: 'slicer', label: 'Slicer', icon: '▤' },
  { type: 'map', label: 'Map', icon: '🗺' },
  { type: 'decomptree', label: 'Decomp Tree', icon: '🌳' },
];

interface ChartTypeSelectorProps {
  onSelect: (type: ChartType) => void;
  onClose: () => void;
}

export function ChartTypeSelector({ onSelect, onClose }: ChartTypeSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background rounded-xl border shadow-xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold mb-4">Add Visual</h2>
        <div className="grid grid-cols-4 gap-2">
          {CHART_TYPES.map(({ type, label, icon, comingSoon }) => (
            <button
              key={type}
              onClick={() => { if (!comingSoon) { onSelect(type); onClose(); } }}
              disabled={comingSoon}
              className={cn(
                'flex flex-col items-center gap-1.5 p-3 rounded-lg border border-transparent',
                'hover:border-primary hover:bg-primary/5 transition-all text-center group',
                comingSoon && 'opacity-40 cursor-not-allowed'
              )}
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground font-medium">{label}</span>
              {comingSoon && <span className="text-[8px] text-muted-foreground/60">Soon</span>}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}
