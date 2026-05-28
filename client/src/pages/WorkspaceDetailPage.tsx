import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Database, FileText, UserPlus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workspaceAPI } from '@/services/api';
import { toast } from '@/hooks/useToast';

export function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<unknown>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');

  useEffect(() => {
    if (!id) return;
    workspaceAPI.get(id).then((res) => setWorkspace(res.data.data));
  }, [id]);

  const invite = async () => {
    if (!id) return;
    try {
      await workspaceAPI.inviteMember(id, { email, role });
      toast({ title: 'Member invited!' });
      setShowInvite(false);
      setEmail('');
    } catch (err: unknown) {
      toast({ title: (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed', variant: 'destructive' });
    }
  };

  const ws = workspace as { id: string; name: string; description?: string; owner?: { name: string }; members?: Array<{ id: string; role: string; user: { name: string; email: string } }>; _count?: { datasets: number; reports: number } } | null;

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title={ws?.name || 'Workspace'} actions={
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowInvite(true)}>
          <UserPlus className="w-3.5 h-3.5" /> Invite Member
        </Button>
      } />
      <div className="flex-1 p-6 space-y-6">
        {ws && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Datasets</p><p className="text-2xl font-bold">{ws._count?.datasets || 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Reports</p><p className="text-2xl font-bold">{ws._count?.reports || 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Members</p><p className="text-2xl font-bold">{ws.members?.length || 1}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Members</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(ws.members || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{m.user.name}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </div>
                    <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'} className="text-xs">{m.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer</SelectItem>
                  <SelectItem value="EDITOR">Editor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button className="flex-1" onClick={invite} disabled={!email}>Invite</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
