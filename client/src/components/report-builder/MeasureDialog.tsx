import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { measureAPI } from '@/services/api';
import { Dataset, Measure } from '@/types';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface MeasureDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  workspaceId: string;
  datasets: Dataset[];
  editing?: Measure | null;
}

export function MeasureDialog({ open, onClose, onSaved, workspaceId, datasets, editing }: MeasureDialogProps) {
  const [name, setName] = useState('');
  const [expression, setExpression] = useState('');
  const [format, setFormat] = useState('number');
  const [datasetId, setDatasetId] = useState('');
  const [description, setDescription] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setExpression(editing.expression);
      setFormat(editing.format);
      setDatasetId(editing.datasetId || '');
      setDescription(editing.description || '');
    } else {
      setName(''); setExpression(''); setFormat('number'); setDatasetId(''); setDescription('');
    }
    setValidation(null); setPreview(null);
  }, [editing, open]);

  useEffect(() => {
    if (!expression) { setValidation(null); setPreview(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setValidating(true);
      try {
        const res = await measureAPI.validate({ expression, datasetId: datasetId || undefined });
        setValidation(res.data.data);
        if (res.data.data.valid && datasetId) {
          const pRes = await measureAPI.preview({ expression, datasetId });
          setPreview(pRes.data.data.result);
        } else {
          setPreview(null);
        }
      } catch {
        setValidation({ valid: false, errors: ['Validation failed'] });
      } finally {
        setValidating(false);
      }
    }, 500);
  }, [expression, datasetId]);

  const handleSave = async () => {
    if (!name || !expression || !workspaceId) return;
    setSaving(true);
    try {
      if (editing) {
        await measureAPI.update(editing.id, { name, expression, format, datasetId: datasetId || null, description });
      } else {
        await measureAPI.create({ workspaceId, name, expression, format, datasetId: datasetId || null, description });
      }
      onSaved();
      onClose();
    } catch {
      // error shown by toast elsewhere
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? 'Edit Measure' : 'New Measure'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Total Revenue" className="h-8 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expression</Label>
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="SUM(revenue) / COUNT(orders)"
              className="h-8 text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Supported: SUM(col), AVG(col), COUNT(col), MIN(col), MAX(col), DISTINCTCOUNT(col), +, -, *, /
            </p>
          </div>

          {/* Validation status */}
          {validating && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Validating...</div>}
          {validation && !validating && (
            <div className={`flex items-start gap-1.5 text-xs p-2 rounded ${validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {validation.valid ? <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" /> : <XCircle className="w-3 h-3 mt-0.5 shrink-0" />}
              <div>
                {validation.valid ? (
                  <span>Valid expression{preview !== null ? ` — Preview: ${preview.toFixed(2)}` : ''}</span>
                ) : (
                  <div>{validation.errors.map((e, i) => <p key={i}>{e}</p>)}</div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="number" className="text-xs">Number</SelectItem>
                  <SelectItem value="currency" className="text-xs">Currency</SelectItem>
                  <SelectItem value="percent" className="text-xs">Percent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dataset (optional)</Label>
              <Select value={datasetId} onValueChange={setDatasetId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs">None</SelectItem>
                  {datasets.map((d) => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this measure calculate?" className="h-8 text-xs" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 h-8 text-xs" onClick={handleSave} disabled={saving || !name || !expression}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
