import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { datasetAPI } from '@/services/api';
import { Dataset, ColumnSchema } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

const TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  number: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  date: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  boolean: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
};

export function DatasetPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    datasetAPI.get(id).then((res) => setDataset(res.data.data));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    datasetAPI.preview(id, page, 50).then((res) => {
      setRows(res.data.data.rows);
      setTotalPages(res.data.data.pagination.pages);
    }).finally(() => setLoading(false));
  }, [id, page]);

  const handleExport = async () => {
    if (!id || !dataset) return;
    try {
      const res = await datasetAPI.exportCsv(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${dataset.name}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export started' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const columns = dataset?.schemaJson || [];

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header
        title={dataset?.name || 'Dataset Preview'}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/datasets"><Button variant="outline" size="sm" className="gap-1.5 text-xs"><ArrowLeft className="w-3.5 h-3.5" /> Back</Button></Link>
            <Link to={`/transform/${id}`}><Button variant="outline" size="sm" className="gap-1.5 text-xs"><Shuffle className="w-3.5 h-3.5" /> Transform</Button></Link>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleExport}><Download className="w-3.5 h-3.5" /> Export CSV</Button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Metadata */}
        {dataset && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Rows', value: dataset.rowCount.toLocaleString() },
              { label: 'Columns', value: dataset.columnCount },
              { label: 'File Type', value: dataset.fileType.includes('csv') ? 'CSV' : 'Excel' },
              { label: 'Created', value: formatDate(dataset.createdAt) },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-base font-semibold mt-0.5">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Column schema */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Column Schema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {columns.map((col: ColumnSchema) => (
                <div key={col.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-muted/30">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[col.type] || ''}`}>{col.type}</span>
                  <span className="text-xs font-medium">{col.name}</span>
                  {col.nullable && <span className="text-[9px] text-muted-foreground">nullable</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data table */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm">Preview — Page {page} of {totalPages}</CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {loading ? (
              <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80 border-b">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-12">#</th>
                      {columns.map((col: ColumnSchema) => (
                        <th key={col.name} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[8px] px-1 py-0.5 rounded font-semibold ${TYPE_COLORS[col.type]}`}>{col.type[0].toUpperCase()}</span>
                            {col.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-1.5 text-muted-foreground">{(page - 1) * 50 + i + 1}</td>
                        {columns.map((col: ColumnSchema) => (
                          <td key={col.name} className="px-3 py-1.5 text-foreground/80 whitespace-nowrap max-w-[200px] truncate">
                            {String(row[col.name] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
