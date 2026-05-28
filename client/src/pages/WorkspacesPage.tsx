import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Plus, Users, Database, FileText, Trash2, Settings } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { workspaceAPI } from '@/services/api';
import { Workspace } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

export function WorkspacesPage() {
  const { workspaces, setWorkspaces, setActiveWorkspace, addWorkspace, removeWorkspace } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    workspaceAPI.list().then((res) => {
      setWorkspaces(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const createWorkspace = async () => {
    setCreating(true);
    try {
      const res = await workspaceAPI.create({ name, description });
      addWorkspace(res.data.data);
      setShowCreate(false);
      setName(''); setDescription('');
      toast({ title: 'Workspace created!' });
    } catch {
      toast({ title: 'Failed to create workspace', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkspace = async (id: string, wsName: string) => {
    if (!confirm(`Delete workspace "${wsName}" and all its data?`)) return;
    try {
      await workspaceAPI.delete(id);
      removeWorkspace(id);
      toast({ title: 'Workspace deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Workspaces" actions={
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" /> New Workspace
        </Button>
      } />
      <div className="flex-1 p-6">
        {loading ? (
          <div className="grid grid-cols-3 gap-4">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-base font-medium text-muted-foreground mb-4">No workspaces yet</p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="w-4 h-4" /> Create Workspace</Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {workspaces.map((ws: Workspace) => (
              <Card key={ws.id} className="hover:shadow-lg transition-all group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setActiveWorkspace(ws)}>
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteWorkspace(ws.id, ws.name)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Link to={`/workspaces/${ws.id}`} onClick={() => setActiveWorkspace(ws)}>
                    <h3 className="font-semibold text-sm hover:text-primary transition-colors">{ws.name}</h3>
                    {ws.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ws.description}</p>}
                  </Link>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {ws._count?.datasets || 0}</span>
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {ws._count?.reports || 0}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ws._count?.members || 1}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{formatDate(ws.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Workspace</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Workspace" autoFocus /></div>
            <div className="space-y-1.5"><Label>Description (optional)</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createWorkspace} loading={creating} disabled={!name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
