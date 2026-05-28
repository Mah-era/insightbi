import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Lock } from 'lucide-react';
import { publicDataAPI } from '@/services/api';
import { Report, Widget } from '@/types';
import { ChartWidget } from '@/components/charts/ChartWidget';

export function EmbedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    publicDataAPI.getEmbedReport(token)
      .then((res) => { setReport(res.data.data.report); })
      .catch((err: { response?: { status?: number } }) => {
        if (err.response?.status === 410) {
          setError('This embed token has expired.');
        } else if (err.response?.status === 404) {
          setError('This embed link has been revoked or does not exist.');
        } else {
          setError('Unable to load the embedded report.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-7 h-7 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-xs mx-auto p-8">
          <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Embedded Report Unavailable</p>
          <p className="text-xs text-muted-foreground">{error || 'Report not found.'}</p>
        </div>
      </div>
    );
  }

  const widgets: Widget[] = report.layoutJson?.widgets || [];
  const gridItems = widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, static: true }));

  return (
    <div className="bg-background" style={{ minHeight: '100vh' }}>
      {/* Compact embed header */}
      <div className="border-b px-4 h-9 flex items-center gap-2 bg-muted/20">
        <span className="text-sm font-medium text-foreground truncate">{report.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          Embedded · Read Only
        </span>
      </div>

      <div className="p-4">
        {widgets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No widgets in this report.</p>
          </div>
        ) : (
          <GridLayout
            className="layout"
            layout={gridItems}
            cols={12}
            rowHeight={60}
            width={Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - 32, 1200)}
            margin={[8, 8]}
            isDraggable={false}
            isResizable={false}
          >
            {widgets.map((widget: Widget) => (
              <div key={widget.id} className="bg-background rounded-lg border overflow-hidden">
                <ChartWidget
                  widget={widget}
                  readOnly
                  embedToken={token}
                />
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
