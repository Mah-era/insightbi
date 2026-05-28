import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, FileText, BarChart3, Plus, ArrowRight, TrendingUp, Users, Activity } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { datasetAPI, reportAPI } from '@/services/api';
import { Dataset, Report } from '@/types';
import { formatDate } from '@/lib/utils';

export function HomePage() {
  const { user } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspace) { setLoading(false); return; }
    Promise.all([
      datasetAPI.list(activeWorkspace.id),
      reportAPI.list(activeWorkspace.id),
    ]).then(([dsRes, rpRes]) => {
      setDatasets(dsRes.data.data.slice(0, 4));
      setReports(rpRes.data.data.slice(0, 4));
    }).finally(() => setLoading(false));
  }, [activeWorkspace?.id]);

  const stats = [
    { label: 'Datasets', value: datasets.length, icon: Database, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/50' },
    { label: 'Reports', value: reports.length, icon: FileText, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/50' },
    { label: 'Dashboards', value: reports.length, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
    { label: 'Team Members', value: activeWorkspace?._count?.members || 1, icon: Users, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Home" actions={
        <Link to="/datasets">
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Upload Dataset
          </Button>
        </Link>
      } />

      <div className="flex-1 p-6 space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-semibold">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeWorkspace ? `Working in ${activeWorkspace.name}` : 'Select a workspace to get started'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    {loading ? <Skeleton className="h-8 w-12 mt-1" /> : (
                      <p className="text-2xl font-bold mt-0.5">{value}</p>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Datasets */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Datasets</CardTitle>
                <Link to="/datasets" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : datasets.length === 0 ? (
                <EmptyState icon={Database} text="No datasets yet" action={{ label: 'Upload Dataset', to: '/datasets' }} />
              ) : (
                datasets.map((ds) => (
                  <Link key={ds.id} to={`/datasets/${ds.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary">{ds.name}</p>
                      <p className="text-xs text-muted-foreground">{ds.rowCount.toLocaleString()} rows · {ds.columnCount} cols</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(ds.createdAt)}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Reports</CardTitle>
                <Link to="/reports" className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : reports.length === 0 ? (
                <EmptyState icon={FileText} text="No reports yet" action={{ label: 'Create Report', to: '/reports' }} />
              ) : (
                reports.map((rp) => (
                  <Link key={rp.id} to={`/reports/${rp.id}/edit`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary">{rp.name}</p>
                      <p className="text-xs text-muted-foreground">{rp.description || 'No description'}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(rp.updatedAt)}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Database, label: 'Upload Dataset', to: '/datasets', color: 'blue' },
              { icon: FileText, label: 'New Report', to: '/reports', color: 'violet' },
              { icon: TrendingUp, label: 'Transform Data', to: '/transform', color: 'emerald' },
              { icon: Activity, label: 'Data Model', to: '/data-model', color: 'amber' },
            ].map(({ icon: Icon, label, to, color }) => (
              <Link key={to} to={to} className={`flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-${color}-300 hover:bg-${color}-50/50 dark:hover:bg-${color}-950/20 transition-all group text-center`}>
                <div className={`w-10 h-10 rounded-lg bg-${color}-50 dark:bg-${color}-950/50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 text-${color}-500`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function EmptyState({ icon: Icon, text, action }: { icon: React.ElementType; text: string; action: { label: string; to: string } }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Icon className="w-8 h-8 text-muted-foreground/30 mb-2" />
      <p className="text-sm text-muted-foreground mb-3">{text}</p>
      <Link to={action.to}><Button size="sm" variant="outline" className="text-xs">{action.label}</Button></Link>
    </div>
  );
}
