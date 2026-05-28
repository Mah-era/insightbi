import { useState } from 'react';
import { useReportBuilderStore } from '@/store/reportBuilderStore';
import { FilterSpec, Dataset } from '@/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Filter, X, Plus } from 'lucide-react';

interface ReportFiltersPanelProps {
  onClose: () => void;
  datasets: Dataset[];
}

const OPERATORS: { value: FilterSpec['operator']; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'between', label: 'between' },
  { value: 'blank', label: 'is blank' },
  { value: 'notblank', label: 'is not blank' },
];

export function ReportFiltersPanel({ onClose, datasets }: ReportFiltersPanelProps) {
  const { reportFilters, addReportFilter, removeReportFilter } = useReportBuilderStore();
  const [showForm, setShowForm] = useState(false);
  const [field, setField] = useState('');
  const [operator, setOperator] = useState<FilterSpec['operator']>('eq');
  const [value, setValue] = useState('');

  // Collect all field names from all datasets
  const allFields = [...new Set(datasets.flatMap((ds) => ds.schemaJson.map((col) => col.name)))];

  const handleAdd = () => {
    if (!field || !operator) return;
    addReportFilter({ field, operator, value: value || undefined });
    setField('');
    setOperator('eq');
    setValue('');
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Filters</p>
          {reportFilters.length > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {reportFilters.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        {reportFilters.length === 0 && !showForm ? (
          <div className="text-center py-6">
            <Filter className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground">No filters applied</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Filters apply to all charts in this report</p>
          </div>
        ) : (
          reportFilters.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 p-2 rounded-md border bg-background group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  <span className="text-primary">{f.field}</span>{' '}
                  <span className="text-muted-foreground">{OPERATORS.find((o) => o.value === f.operator)?.label}</span>{' '}
                  {f.value !== undefined && <span className="font-mono">{String(f.value)}</span>}
                </p>
              </div>
              <button
                onClick={() => removeReportFilter(i)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}

        {showForm && (
          <div className="border rounded-md p-2.5 space-y-2 bg-muted/20">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase">Field</p>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select field" /></SelectTrigger>
                <SelectContent>
                  {allFields.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground font-medium uppercase">Condition</p>
              <Select value={operator} onValueChange={(v) => setOperator(v as FilterSpec['operator'])}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!['blank', 'notblank'].includes(operator) && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase">Value</p>
                <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Filter value" className="h-7 text-xs" />
              </div>
            )}
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAdd} disabled={!field}>Add</Button>
            </div>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="p-2 border-t shrink-0">
          <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3 h-3" /> Add Filter
          </Button>
        </div>
      )}
    </div>
  );
}
