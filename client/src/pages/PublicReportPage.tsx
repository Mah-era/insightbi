import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Zap, Lock } from 'lucide-react';
import { publicDataAPI } from '@/services/api';
import { Report, Widget } from '@/types';
import { ChartWidget } from '@/components/charts/ChartWidget';

export function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    publicDataAPI.getReport(token)
      .then((res) => { setReport(res.data.data.report); })
      .catch((err: { response?: { status?: number } }) => {
        if (err.response?.status === 410) {
          setError('This share link has expired.');
        } else {
          setError('This report is not available or sharing has been disabled.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-xs mx-auto">
          <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-base font-medium text-foreground mb-1">Report Unavailable</p>
          <p className="text-sm text-muted-foreground">{error || 'Report not found.'}</p>
        </div>
      </div>
    );
  }

  const widgets: Widget[] = report.layoutJson?.widgets || [];
  const gridItems = widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, static: true }));

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal read-only header */}
      <div className="border-b px-6 h-12 flex items-center gap-2 bg-background/95 backdrop-blur sticky top-0 z-10">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">InsightBI</span>
        <span className="text-muted-foreground/40 text-sm">·</span>
        <span className="text-sm font-medium truncate">{report.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          Read Only
        </span>
      </div>

      <div className="p-6">
        {report.description && (
          <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
        )}

        {widgets.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground text-sm">This report has no widgets.</p>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={gridItems}
            cols={12}
            rowHeight={60}
            width={Math.min(window.innerWidth - 80, 1200)}
            margin={[8, 8]}
            isDraggable={false}
            isResizable={false}
          >
            {widgets.map((widget: Widget) => (
              <div key={widget.id} className="bg-background rounded-lg border overflow-hidden">
                <ChartWidget
                  widget={widget}
                  readOnly
                  publicToken={token}
                />
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      <div className="text-center py-4 border-t">
        <p className="text-[11px] text-muted-foreground/50">
          Powered by <span className="font-medium">InsightBI</span>
        </p>
      </div>
    </div>
  );
}
