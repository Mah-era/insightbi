import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Database, Upload, Trash2, Eye, Plus, FileText } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { datasetAPI } from '@/services/api';
import { Dataset } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from '@/hooks/useToast';

export function DatasetsPage() {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspaceStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const loadDatasets = useCallback(async () => {
    if (!activeWorkspace) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await datasetAPI.list(activeWorkspace.id);
      setDatasets(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => { loadDatasets(); }, [loadDatasets]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    multiple: false,
    onDrop: (files) => {
      if (files[0]) {
        setPendingFile(files[0]);
        setUploadName(files[0].name.replace(/\.[^.]+$/, ''));
        setShowUpload(true);
      }
    },
  });

  const handleUpload = async () => {
    if (!pendingFile || !activeWorkspace) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', pendingFile);
      fd.append('workspaceId', activeWorkspace.id);
      fd.append('name', uploadName || pendingFile.name);
      await datasetAPI.upload(fd);
      toast({ title: 'Dataset uploaded!', description: `${uploadName} is ready to use.`, variant: 'default' });
      setShowUpload(false);
      setPendingFile(null);
      loadDatasets();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed';
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete dataset "${name}"? This cannot be undone.`)) return;
    try {
      await datasetAPI.delete(id);
      setDatasets((d) => d.filter((ds) => ds.id !== id));
      toast({ title: 'Dataset deleted', variant: 'default' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const typeColor: Record<string, string> = { text: 'secondary', number: 'success', date: 'warning', boolean: 'outline' };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Datasets" actions={
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowUpload(true)}>
          <Plus className="w-3.5 h-3.5" /> Upload Dataset
        </Button>
      } />

      <div className="flex-1 p-6">
        {/* Workspace selector */}
        <div className="flex items-center gap-3 mb-6">
          <Label className="text-sm shrink-0">Workspace:</Label>
          <Select value={activeWorkspace?.id || ''} onValueChange={(id) => {
            const ws = workspaces.find((w) => w.id === id);
            if (ws) setActiveWorkspace(ws);
          }}>
            <SelectTrigger className="w-56 h-8 text-sm">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((w) => <SelectItem key={w.id} value={w.id} className="text-sm">{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Drop your CSV or Excel file here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse (max 50MB)</p>
        </div>

        {/* Dataset list */}
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-16">
            <Database className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-base font-medium text-muted-foreground mb-1">No datasets yet</p>
            <p className="text-sm text-muted-foreground/60">Upload your first CSV or Excel file to get started</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {datasets.map((ds) => (
              <Card key={ds.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                      <Database className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{ds.name}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{ds.fileType.includes('csv') ? 'CSV' : 'Excel'}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{ds.rowCount.toLocaleString()} rows</span>
                        <span>·</span>
                        <span>{ds.columnCount} columns</span>
                        <span>·</span>
                        <span>{formatDate(ds.createdAt)}</span>
                      </div>
                      {/* Column type chips */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(ds.schemaJson || []).slice(0, 6).map((col) => (
                          <Badge key={col.name} variant={(typeColor[col.type] as 'secondary' | 'success' | 'warning' | 'outline') || 'secondary'} className="text-[9px] h-4 px-1.5">
                            {col.name}: {col.type}
                          </Badge>
                        ))}
                        {ds.columnCount > 6 && <Badge variant="outline" className="text-[9px] h-4 px-1.5">+{ds.columnCount - 6} more</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link to={`/datasets/${ds.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </Button>
                      </Link>
                      <Link to={`/transform/${ds.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <FileText className="w-3.5 h-3.5 mr-1.5" /> Transform
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(ds.id, ds.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Dataset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {pendingFile && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{pendingFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Dataset Name</Label>
              <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="My Dataset" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpload} loading={uploading} disabled={!pendingFile || !activeWorkspace}>
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
