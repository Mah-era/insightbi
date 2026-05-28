import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Zap } from 'lucide-react';
import { reportAPI } from '@/services/api';
import { Report, Widget } from '@/types';
import { ChartWidget } from '@/components/charts/ChartWidget';

export function PrintReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    reportAPI.get(id).then((res) => {
      setReport(res.data.data);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading && report) {
      // Auto-print after a short delay to allow charts to render
      const t = setTimeout(() => window.print(), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, report]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report) return <div className="p-8 text-muted-foreground">Report not found</div>;

  const widgets: Widget[] = report.layoutJson?.widgets || [];
  const gridItems = widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h, static: true }));

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { margin: 0.5in; }
        }
      `}</style>
      <div className="p-6 bg-white min-h-screen">
        {/* Print header */}
        <div className="no-print mb-4 p-3 bg-blue-50 rounded text-sm text-blue-700 flex items-center justify-between">
          <span>Print preview — the print dialog will open automatically.</span>
          <button onClick={() => window.print()} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Print / Save PDF</button>
        </div>
        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg">InsightBI</span>
          <span className="text-muted-foreground">·</span>
          <h1 className="text-lg font-semibold">{report.name}</h1>
          <span className="ml-auto text-xs text-muted-foreground">{new Date().toLocaleDateString()}</span>
        </div>
        {report.description && <p className="text-sm text-muted-foreground mb-4">{report.description}</p>}
        {widgets.length === 0 ? (
          <p className="text-muted-foreground">No widgets in this report.</p>
        ) : (
          <GridLayout
            className="layout"
            layout={gridItems}
            cols={12}
            rowHeight={60}
            width={900}
            margin={[8, 8]}
            isDraggable={false}
            isResizable={false}
          >
            {widgets.map((widget: Widget) => (
              <div key={widget.id} className="bg-white rounded border overflow-hidden">
                <ChartWidget widget={widget} />
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </>
  );
}
