import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/badge';
import { activityAPI } from '@/services/api';
import { ActivityLog } from '@/types';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACTION_COLORS: Record<string, string> = {
  USER_LOGIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  USER_REGISTERED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  DATASET_UPLOADED: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  REPORT_CREATED: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  REPORT_UPDATED: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  REPORT_DELETED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityAPI.mine()
      .then((res) => setLogs(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="My Activity" />
      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History className="w-10 h-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your actions will appear here</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
              >
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0.5 shrink-0 ${ACTION_COLORS[log.action] || 'bg-muted text-muted-foreground'}`}
                >
                  {log.action.replace(/_/g, ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground flex-1 truncate">
                  {log.workspace?.name || '—'}
                </span>
                <span className="text-xs text-muted-foreground/60 shrink-0">
                  {relativeTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
