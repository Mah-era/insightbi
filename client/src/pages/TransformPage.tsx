import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Play, Save, Trash2, ArrowLeft, Database } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { datasetAPI, transformAPI } from '@/services/api';
import { Dataset, ColumnSchema, TransformStep } from '@/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { toast } from '@/hooks/useToast';
import { v4 as uuidv4 } from 'uuid';

const STEP_TYPES = [
  { value: 'renameColumn', label: 'Rename Column' },
  { value: 'removeColumn', label: 'Remove Column' },
  { value: 'filterRows', label: 'Filter Rows' },
  { value: 'sortRows', label: 'Sort Rows' },
  { value: 'fillNull', label: 'Fill Null Values' },
  { value: 'removeDuplicates', label: 'Remove Duplicates' },
  { value: 'trimText', label: 'Trim Text' },
  { value: 'changeCase', label: 'Change Case' },
  { value: 'addCalculatedColumn', label: 'Add Calculated Column' },
  { value: 'changeType', label: 'Change Data Type' },
];

export function TransformPage() {
  const { id: paramId } = useParams<{ id: string }>();
  const { activeWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [steps, setSteps] = useState<TransformStep[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewSchema, setPreviewSchema] = useState<ColumnSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);

  // Load datasets
  useEffect(() => {
    if (!activeWorkspace) return;
    datasetAPI.list(activeWorkspace.id).then((res) => {
      const ds = res.data.data;
      setDatasets(ds);
      if (paramId) {
        const found = ds.find((d: Dataset) => d.id === paramId);
        if (found) selectDataset(found);
      }
    });
  }, [activeWorkspace?.id, paramId]);

  const selectDataset = async (ds: Dataset) => {
    setSelectedDataset(ds);
    setSteps([]);
    setLoading(true);
    try {
      const preview = await datasetAPI.preview(ds.id, 1, 20);
      setPreviewRows(preview.data.data.rows);
      setPreviewSchema(ds.schemaJson);
      // Load existing transformations
      const txRes = await transformAPI.list(ds.id);
      if (txRes.data.data.length > 0) {
        setSteps(txRes.data.data[0].stepsJson as TransformStep[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setSteps((s) => [...s, { id: uuidv4(), type: 'renameColumn', label: 'Rename Column', column: '' }]);
  };

  const removeStep = (id: string) => setSteps((s) => s.filter((st) => st.id !== id));

  const updateStep = (id: string, key: string, value: unknown) =>
    setSteps((s) => s.map((st) => st.id === id ? { ...st, [key]: value } : st));

  const handlePreview = async () => {
    if (!selectedDataset) return;
    setPreviewing(true);
    try {
      const res = await transformAPI.preview(selectedDataset.id, { steps });
      setPreviewRows(res.data.data.rows);
      setPreviewSchema(res.data.data.schema);
      toast({ title: `Preview: ${res.data.data.rowCount} rows` });
    } catch {
      toast({ title: 'Preview failed', variant: 'destructive' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleApply = async () => {
    if (!selectedDataset || !confirm('Apply these transformations? This will modify the dataset permanently.')) return;
    setApplying(true);
    try {
      await transformAPI.apply(selectedDataset.id, { steps });
      await transformAPI.save(selectedDataset.id, { steps });
      toast({ title: 'Transformations applied!', description: 'Dataset has been updated.' });
      navigate(`/datasets/${selectedDataset.id}`);
    } catch {
      toast({ title: 'Apply failed', variant: 'destructive' });
    } finally {
      setApplying(false);
    }
  };

  const schema = selectedDataset?.schemaJson || [];
  const colNames = schema.map((c) => c.name);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Transform Data" actions={
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate('/datasets')}>
          <ArrowLeft className="w-3.5 h-3.5" /> Datasets
        </Button>
      } />

      <div className="flex-1 flex overflow-hidden">
        {/* Left: steps panel */}
        <div className="w-72 border-r flex flex-col">
          <div className="p-3 border-b">
            <Label className="text-xs mb-1.5 block">Dataset</Label>
            <Select value={selectedDataset?.id || ''} onValueChange={(id) => {
              const ds = datasets.find((d) => d.id === id);
              if (ds) selectDataset(ds);
            }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select dataset" /></SelectTrigger>
              <SelectContent>
                {datasets.map((d) => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Applied Steps */}
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Applied Steps</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={addStep}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {steps.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[11px] text-muted-foreground">No steps yet.</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Click "Add" to start.</p>
                </div>
              ) : (
                steps.map((step, idx) => (
                  <div key={step.id} className="border rounded-lg p-2.5 bg-background space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{idx + 1}</span>
                        <Select value={step.type} onValueChange={(v) => updateStep(step.id, 'type', v)}>
                          <SelectTrigger className="h-6 text-[10px] w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STEP_TYPES.map((st) => <SelectItem key={st.value} value={st.value} className="text-xs">{st.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => removeStep(step.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Column selector */}
                    {['renameColumn', 'removeColumn', 'filterRows', 'sortRows', 'fillNull', 'trimText', 'changeCase', 'addCalculatedColumn', 'changeType'].includes(step.type) && (
                      <Select value={step.column || ''} onValueChange={(v) => updateStep(step.id, 'column', v)}>
                        <SelectTrigger className="h-6 text-[10px]"><SelectValue placeholder="Column" /></SelectTrigger>
                        <SelectContent>{colNames.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                      </Select>
                    )}

                    {step.type === 'renameColumn' && (
                      <Input value={String(step.newName || '')} onChange={(e) => updateStep(step.id, 'newName', e.target.value)} placeholder="New name" className="h-6 text-[10px]" />
                    )}
                    {step.type === 'filterRows' && (
                      <div className="flex gap-1">
                        <Select value={step.operator || 'eq'} onValueChange={(v) => updateStep(step.id, 'operator', v)}>
                          <SelectTrigger className="h-6 text-[10px] w-16"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[['eq','='],['neq','≠'],['gt','>'],['lt','<'],['contains','∋'],['notNull','≠null']].map(([v, l]) => (
                              <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input value={String(step.value || '')} onChange={(e) => updateStep(step.id, 'value', e.target.value)} placeholder="Value" className="h-6 text-[10px] flex-1" />
                      </div>
                    )}
                    {step.type === 'sortRows' && (
                      <Select value={step.direction || 'asc'} onValueChange={(v) => updateStep(step.id, 'direction', v)}>
                        <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc" className="text-xs">Ascending</SelectItem>
                          <SelectItem value="desc" className="text-xs">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {step.type === 'fillNull' && (
                      <Input value={String(step.value || '')} onChange={(e) => updateStep(step.id, 'value', e.target.value)} placeholder="Fill value" className="h-6 text-[10px]" />
                    )}
                    {step.type === 'changeCase' && (
                      <Select value={step.caseType || 'lower'} onValueChange={(v) => updateStep(step.id, 'caseType', v)}>
                        <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upper" className="text-xs">UPPERCASE</SelectItem>
                          <SelectItem value="lower" className="text-xs">lowercase</SelectItem>
                          <SelectItem value="title" className="text-xs">Title Case</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {step.type === 'addCalculatedColumn' && (
                      <>
                        <Input value={String(step.newName || '')} onChange={(e) => updateStep(step.id, 'newName', e.target.value)} placeholder="Column name" className="h-6 text-[10px]" />
                        <Input value={String(step.expression || '')} onChange={(e) => updateStep(step.id, 'expression', e.target.value)} placeholder="e.g. Sales * 0.1" className="h-6 text-[10px]" />
                      </>
                    )}
                    {step.type === 'changeType' && (
                      <Select value={step.targetType || 'text'} onValueChange={(v) => updateStep(step.id, 'targetType', v)}>
                        <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['text','number','date','boolean'].map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t space-y-2">
            <Button variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={handlePreview} loading={previewing} disabled={!selectedDataset || steps.length === 0}>
              <Play className="w-3.5 h-3.5" /> Preview
            </Button>
            <Button className="w-full h-8 text-xs gap-1.5" onClick={handleApply} loading={applying} disabled={!selectedDataset || steps.length === 0}>
              <Save className="w-3.5 h-3.5" /> Apply Changes
            </Button>
          </div>
        </div>

        {/* Right: preview table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b flex items-center gap-2">
            <p className="text-sm font-medium">Data Preview</p>
            {selectedDataset && <Badge variant="secondary" className="text-[10px]">{selectedDataset.name}</Badge>}
          </div>
          <div className="flex-1 overflow-auto">
            {!selectedDataset ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Database className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a dataset to preview</p>
                </div>
              </div>
            ) : loading ? (
              <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 border-b">
                  <tr>
                    {previewSchema.map((col) => (
                      <th key={col.name} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                      {previewSchema.map((col) => (
                        <td key={col.name} className="px-3 py-1.5 text-foreground/80 whitespace-nowrap">{String(row[col.name] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
