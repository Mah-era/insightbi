import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, Database, Globe, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { connectionAPI } from '@/services/api';
import { DataConnection } from '@/types';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { toast } from '@/hooks/useToast';

type WizardStep = 'type' | 'config' | 'test' | 'save';

const TYPE_LABELS: Record<string, string> = { postgresql: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite', rest: 'REST API' };
const TYPE_ICONS: Record<string, typeof Database> = { postgresql: Database, mysql: Database, sqlite: Database, rest: Globe };

export function ConnectionsPage() {
  const { activeWorkspace } = useWorkspaceStore();
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState<WizardStep>('type');
  const [connType, setConnType] = useState<string>('rest');
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [password, setPassword] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!activeWorkspace) return;
    connectionAPI.list(activeWorkspace.id).then((res) => setConnections(res.data.data)).catch(() => {});
  };

  useEffect(load, [activeWorkspace?.id]);

  const resetWizard = () => {
    setStep('type'); setConnType('rest'); setName(''); setConfig({}); setPassword(''); setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await connectionAPI.test({ type: connType, ...config, password });
      setTestResult(res.data.data);
    } catch {
      setTestResult({ success: false, message: 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!activeWorkspace || !name) return;
    setSaving(true);
    try {
      await connectionAPI.create({ workspaceId: activeWorkspace.id, name, type: connType, config, password });
      toast({ title: 'Connection saved!' });
      setShowWizard(false);
      resetWizard();
      load();
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await connectionAPI.delete(id);
    load();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Data Connections</h1>
          <p className="text-sm text-muted-foreground">Connect to external databases and APIs</p>
        </div>
        <Button onClick={() => { resetWizard(); setShowWizard(true); }} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Connection
        </Button>
      </div>

      {connections.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl py-16 text-center">
          <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No connections yet</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Connect PostgreSQL, MySQL, REST APIs, and more</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((conn) => {
            const Icon = TYPE_ICONS[conn.type] || Database;
            return (
              <div key={conn.id} className="border rounded-xl p-4 flex items-center gap-4 bg-background">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{conn.name}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[conn.type] || conn.type} · {conn.mode}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(conn.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Wizard dialog */}
      <Dialog open={showWizard} onOpenChange={(o) => { if (!o) { setShowWizard(false); resetWizard(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Connection — {step === 'type' ? 'Choose Type' : step === 'config' ? 'Configure' : step === 'test' ? 'Test' : 'Save'}</DialogTitle></DialogHeader>

          {step === 'type' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(['postgresql', 'mysql', 'sqlite', 'rest'] as const).map((t) => {
                  const Icon = TYPE_ICONS[t];
                  return (
                    <button key={t} onClick={() => setConnType(t)} className={`border rounded-lg p-4 flex flex-col items-center gap-2 transition-colors ${connType === t ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                      <Icon className="w-6 h-6 text-primary" />
                      <span className="text-sm font-medium">{TYPE_LABELS[t]}</span>
                    </button>
                  );
                })}
              </div>
              <Button className="w-full" onClick={() => setStep('config')}>Continue</Button>
            </div>
          )}

          {step === 'config' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Connection Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My connection" />
              </div>
              {connType === 'rest' && (
                <div className="space-y-1.5">
                  <Label>API URL</Label>
                  <Input value={config.url || ''} onChange={(e) => setConfig({ ...config, url: e.target.value })} placeholder="https://api.example.com/data" />
                </div>
              )}
              {['postgresql', 'mysql'].includes(connType) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Host</Label>
                      <Input value={config.host || ''} onChange={(e) => setConfig({ ...config, host: e.target.value })} placeholder="localhost" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Port</Label>
                      <Input value={config.port || ''} onChange={(e) => setConfig({ ...config, port: e.target.value })} placeholder={connType === 'postgresql' ? '5432' : '3306'} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Database</Label>
                    <Input value={config.database || ''} onChange={(e) => setConfig({ ...config, database: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Username</Label>
                      <Input value={config.username || ''} onChange={(e) => setConfig({ ...config, username: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('type')}>Back</Button>
                <Button className="flex-1" onClick={() => setStep('test')}>Test Connection</Button>
              </div>
            </div>
          )}

          {step === 'test' && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-1">
                <p className="text-sm font-medium">{TYPE_LABELS[connType]}</p>
                {connType === 'rest' && <p className="text-xs text-muted-foreground">{config.url}</p>}
                {['postgresql', 'mysql'].includes(connType) && <p className="text-xs text-muted-foreground">{config.host}:{config.port}/{config.database}</p>}
              </div>
              <Button className="w-full gap-2" onClick={handleTest} disabled={testing}>
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Testing...' : 'Run Test'}
              </Button>
              {testResult && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('config')}>Back</Button>
                <Button className="flex-1" onClick={() => setStep('save')} disabled={!testResult?.success}>Save</Button>
              </div>
            </div>
          )}

          {step === 'save' && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-1 bg-muted/30">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[connType]}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Mode</Label>
                <Select defaultValue="IMPORT">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMPORT">Import (copy data)</SelectItem>
                    <SelectItem value="DIRECT_QUERY">Direct Query (live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('test')}>Back</Button>
                <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Connection'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
