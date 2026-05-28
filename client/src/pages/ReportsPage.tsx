import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Plus, Trash2, Copy, Edit, FileText } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { reportAPI } from '@/services/api';
import { Report } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

export function ReportsPage() {
  const { activeWorkspace } = useWorkspaceStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) { setLoading(false); return; }
    setLoading(true);
    reportAPI.list(activeWorkspace.id).then((res) => setReports(res.data.data)).finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  const createReport = async () => {
    if (!name || !activeWorkspace) return;
    setCreating(true);
    try {
      const res = await reportAPI.create({ workspaceId: activeWorkspace.id, name, description });
      setReports((r) => [res.data.data, ...r]);
      setShowCreate(false);
      setName(''); setDescription('');
      toast({ title: 'Report created!', description: `"${name}" is ready to build.` });
    } catch {
      toast({ title: 'Failed to create report', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const deleteReport = async (id: string, reportName: string) => {
    if (!confirm(`Delete "${reportName}"?`)) return;
    try {
      await reportAPI.delete(id);
      setReports((r) => r.filter((rp) => rp.id !== id));
      toast({ title: 'Report deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const duplicateReport = async (id: string) => {
    try {
      const res = await reportAPI.duplicate(id);
      setReports((r) => [res.data.data, ...r]);
      toast({ title: 'Report duplicated' });
    } catch {
      toast({ title: 'Duplicate failed', variant: 'destructive' });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Reports" actions={
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Report
        </Button>
      } />

      <div className="flex-1 p-6">
        {loading ? (
          <div className="grid grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-base font-medium text-muted-foreground mb-1">No reports yet</p>
            <p className="text-sm text-muted-foreground/60 mb-4">Create your first report to start building dashboards</p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-4 h-4" /> New Report</Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {reports.map((rp) => (
              <Card key={rp.id} className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden">
                {/* Preview area */}
                <div className="h-32 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 border-b flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{rp.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{rp.description || 'No description'}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">{formatDate(rp.updatedAt)}</p>
                  <div className="flex items-center gap-1.5">
                    <Link to={`/reports/${rp.id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1">
                        <Edit className="w-3 h-3" /> Edit
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateReport(rp.id)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteReport(rp.id, rp.name)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Report</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Report Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Sales Dashboard Q1" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createReport} loading={creating} disabled={!name}>Create Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
