import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Database, FileText, BarChart3, Shield, Activity, Layers, ExternalLink } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { adminAPI } from '@/services/api';
import { ActivityLog, User } from '@/types';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/useToast';

const ACTION_COLORS: Record<string, string> = {
  USER_REGISTERED: 'success', USER_LOGIN: 'secondary', DATASET_UPLOADED: 'default',
  REPORT_CREATED: 'warning', REPORT_UPDATED: 'secondary', DATASET_DELETED: 'destructive',
  WORKSPACE_CREATED: 'outline',
};

type WS  = { id: string; name: string; createdAt: string; owner?: { name: string; email: string }; _count?: { datasets: number; reports: number; members: number } };
type RPT = { id: string; name: string; createdAt: string; workspace?: { name: string }; createdBy?: { name: string; email: string } };
type DS  = { id: string; name: string; rowCount: number; columnCount: number; createdAt: string; workspace?: { name: string; owner?: { name: string; email: string } } };

export function AdminPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ userCount: number; workspaceCount: number; datasetCount: number; reportCount: number; recentLogs: ActivityLog[] } | null>(null);
  const [users, setUsers] = useState<(User & { _count: { ownedWorkspaces: number; reports: number } })[]>([]);
  const [allLogs, setAllLogs] = useState<ActivityLog[]>([]);
  const [allWorkspaces, setAllWorkspaces] = useState<WS[]>([]);
  const [allReports, setAllReports] = useState<RPT[]>([]);
  const [allDatasets, setAllDatasets] = useState<DS[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.stats(),
      adminAPI.users(),
      adminAPI.activity(1),
      adminAPI.workspaces(),
      adminAPI.reports(),
      adminAPI.datasets(),
    ]).then(([sRes, uRes, aRes, wsRes, rRes, dsRes]) => {
      setStats(sRes.data.data);
      setUsers(uRes.data.data.users || uRes.data.data);
      setAllLogs(aRes.data.data.logs || []);
      setAllWorkspaces(wsRes.data.data || []);
      setAllReports(rRes.data.data || []);
      setAllDatasets(dsRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const updateRole = async (id: string, role: string) => {
    try {
      await adminAPI.updateUserRole(id, role);
      setUsers((u) => u.map((usr) => usr.id === id ? { ...usr, role: role as User['role'] } : usr));
      toast({ title: 'Role updated' });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-base font-medium text-muted-foreground">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Admin Panel" />
      <div className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />) : (
            [
              { label: 'Total Users', value: stats?.userCount, icon: Users, color: 'blue' },
              { label: 'Workspaces', value: stats?.workspaceCount, icon: BarChart3, color: 'violet' },
              { label: 'Datasets', value: stats?.datasetCount, icon: Database, color: 'emerald' },
              { label: 'Reports', value: stats?.reportCount, icon: FileText, color: 'amber' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-0.5">{value ?? 0}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg bg-${color}-50 dark:bg-${color}-950/50 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-${color}-500`} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Tabs defaultValue="users">
          <TabsList className="mb-4 flex-wrap gap-1">
            <TabsTrigger value="users"      className="gap-1.5 text-xs"><Users      className="w-3.5 h-3.5" /> Users ({users.length})</TabsTrigger>
            <TabsTrigger value="workspaces" className="gap-1.5 text-xs"><Layers     className="w-3.5 h-3.5" /> Workspaces ({allWorkspaces.length})</TabsTrigger>
            <TabsTrigger value="reports"    className="gap-1.5 text-xs"><FileText   className="w-3.5 h-3.5" /> Reports ({allReports.length})</TabsTrigger>
            <TabsTrigger value="datasets"   className="gap-1.5 text-xs"><Database   className="w-3.5 h-3.5" /> Datasets ({allDatasets.length})</TabsTrigger>
            <TabsTrigger value="activity"   className="gap-1.5 text-xs"><Activity   className="w-3.5 h-3.5" /> All Activity</TabsTrigger>
          </TabsList>

          {/* ── USERS TAB ── */}
          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle className="text-sm">All Users</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">User</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Role</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Workspaces</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reports</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{u.name}</p>
                            <p className="text-muted-foreground">{u.email}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <Select value={u.role} onValueChange={(v) => updateRole(u.id, v)} disabled={u.id === user?.id}>
                              <SelectTrigger className="h-6 text-[10px] w-20"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['ADMIN', 'EDITOR', 'VIEWER'].map((r) => (
                                  <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{u._count?.ownedWorkspaces || 0}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{u._count?.reports || 0}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatDate(u.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── WORKSPACES TAB ── */}
          <TabsContent value="workspaces">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Workspaces</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">View-only — admin cannot modify other users' workspaces</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Workspace</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Owner</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Datasets</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Reports</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Members</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allWorkspaces.map((ws) => (
                        <tr
                          key={ws.id}
                          className="border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/workspaces/${ws.id}`)}
                        >
                          <td className="px-3 py-2.5 font-medium">
                            <span className="flex items-center gap-1.5 group">
                              {ws.name}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{ws.owner?.name || '—'}</p>
                            <p className="text-muted-foreground">{ws.owner?.email || ''}</p>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{ws._count?.datasets ?? '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{ws._count?.reports ?? '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{ws._count?.members ?? '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatDate(ws.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── REPORTS TAB ── */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Reports</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">View-only — admin cannot edit other users' reports</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Report</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Created By</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Workspace</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReports.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/reports/${r.id}/edit`)}
                        >
                          <td className="px-3 py-2.5 font-medium">
                            <span className="flex items-center gap-1.5 group">
                              {r.name}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{r.createdBy?.name || '—'}</p>
                            <p className="text-muted-foreground">{r.createdBy?.email || ''}</p>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{r.workspace?.name || '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatDate(r.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DATASETS TAB ── */}
          <TabsContent value="datasets">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Datasets</CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">View-only — admin cannot delete other users' datasets</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-muted/80 border-b">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Dataset</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Owner</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Workspace</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Rows</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Cols</th>
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDatasets.map((d) => (
                        <tr
                          key={d.id}
                          className="border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/datasets/${d.id}`)}
                        >
                          <td className="px-3 py-2.5 font-medium">
                            <span className="flex items-center gap-1.5 group">
                              {d.name}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{d.workspace?.owner?.name || '—'}</p>
                            <p className="text-muted-foreground">{d.workspace?.owner?.email || ''}</p>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{d.workspace?.name || '—'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{d.rowCount?.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{d.columnCount}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatDate(d.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ALL ACTIVITY TAB ── */}
          <TabsContent value="activity">
            <Card>
              <CardHeader><CardTitle className="text-sm">All Users Activity ({allLogs.length} recent)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[60vh] divide-y divide-border/40">
                  {allLogs.map((log) => (
                    <div key={log.id} className="px-3 py-2.5 flex items-start gap-3">
                      <Badge variant={(ACTION_COLORS[log.action] as 'success' | 'secondary' | 'default' | 'warning' | 'destructive' | 'outline') || 'secondary'} className="text-[9px] shrink-0 mt-0.5">{log.action.replace(/_/g, ' ')}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium">{log.user?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">({log.user?.email || ''})</p>
                        </div>
                        {log.workspaceId && <p className="text-[10px] text-muted-foreground">Workspace: {(log as unknown as { workspace?: { name: string } }).workspace?.name || log.workspaceId}</p>}
                      </div>
                      <p className="text-[10px] text-muted-foreground shrink-0">{formatDate(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
