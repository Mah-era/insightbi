import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2, BarChart3, Eye } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { shareAPI } from '@/services/api';
import { formatDate } from '@/lib/utils';

export function SharedPage() {
  const [shares, setShares] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    shareAPI.getShared().then((res) => setShares(res.data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Shared With Me" />
      <div className="flex-1 p-6">
        {loading ? (
          <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : shares.length === 0 ? (
          <div className="text-center py-20">
            <Share2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-base font-medium text-muted-foreground">Nothing shared with you yet</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Reports shared by team members will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(shares as Array<{ id: string; permission: string; report: { id: string; name: string; description?: string; createdBy?: { name: string }; updatedAt: string } }>).map((share) => (
              <Card key={share.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{share.report.name}</p>
                      <Badge variant={share.permission === 'EDIT' ? 'default' : 'secondary'} className="text-[9px]">{share.permission}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Shared by {share.report.createdBy?.name} · {formatDate(share.report.updatedAt)}
                    </p>
                  </div>
                  <Link to={`/reports/${share.report.id}/edit`}>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                      <Eye className="w-3.5 h-3.5" /> Open
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
