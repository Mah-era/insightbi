import '@xyflow/react/dist/style.css';
import { useEffect, useState, useCallback } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  Handle, Position, useNodesState, useEdgesState, addEdge,
  Node, Edge, Connection, BackgroundVariant,
} from '@xyflow/react';
import { Plus, Trash2, GitBranch } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { dataModelAPI } from '@/services/api';
import { Dataset, Relationship } from '@/types';
import { toast } from '@/hooks/useToast';

// ---- Custom ERD Node ----
type NodeData = {
  label: string;
  columns: Array<{ name: string; type: string }>;
};

function ErdNode({ data }: { data: NodeData }) {
  const typeBadge = (t: string) => {
    const map: Record<string, string> = { text: 'T', number: 'N', date: 'D', boolean: 'B' };
    const colors: Record<string, string> = {
      text: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      number: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
      date: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      boolean: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
    };
    return (
      <span className={`text-[8px] font-bold px-1 rounded ${colors[t] || 'bg-muted text-muted-foreground'}`}>
        {map[t] || t[0]?.toUpperCase() || '?'}
      </span>
    );
  };

  return (
    <div className="bg-background border border-border rounded-lg shadow-sm min-w-[160px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-blue-500" />
      <div className="bg-blue-600 px-3 py-1.5">
        <span className="text-white text-xs font-semibold truncate block">{data.label}</span>
      </div>
      <div className="px-2 py-1.5 space-y-0.5">
        {data.columns.slice(0, 8).map((col) => (
          <div key={col.name} className="flex items-center gap-1.5 py-0.5">
            {typeBadge(col.type)}
            <span className="text-[10px] text-foreground truncate">{col.name}</span>
          </div>
        ))}
        {data.columns.length > 8 && (
          <p className="text-[9px] text-muted-foreground px-1">+{data.columns.length - 8} more</p>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-blue-500" />
    </div>
  );
}

const NODE_TYPES = { erd: ErdNode };

// ---- Page ----
export function DataModelPage() {
  const { activeWorkspace } = useWorkspaceStore();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [rel, setRel] = useState({
    sourceDatasetId: '', sourceColumn: '',
    targetDatasetId: '', targetColumn: '',
    relationshipType: 'one-to-many',
  });

  // Build nodes/edges from datasets + relationships
  useEffect(() => {
    const COLS = 3;
    const COL_W = 220;
    const ROW_H = 240;

    const newNodes: Node[] = datasets.map((ds, i) => ({
      id: ds.id,
      type: 'erd',
      position: { x: (i % COLS) * COL_W, y: Math.floor(i / COLS) * ROW_H },
      data: { label: ds.name, columns: Array.isArray(ds.schemaJson) ? ds.schemaJson : [] },
    }));

    const newEdges: Edge[] = relationships.map((r) => ({
      id: r.id,
      source: r.sourceDatasetId,
      target: r.targetDatasetId,
      label: `${r.sourceColumn} → ${r.relationshipType} → ${r.targetColumn}`,
      labelStyle: { fontSize: 9, fill: '#6b7280' },
      labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.8 },
      animated: false,
      style: { stroke: '#3b82f6', strokeWidth: 1.5 },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [datasets, relationships]);

  useEffect(() => {
    if (!activeWorkspace) return;
    dataModelAPI.get(activeWorkspace.id).then((res) => {
      setDatasets(res.data.data.datasets);
      setRelationships(res.data.data.relationships);
    }).catch(() => {
      toast({ title: 'Failed to load data model', variant: 'destructive' });
    });
  }, [activeWorkspace?.id]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleEdgeClick = async (_: React.MouseEvent, edge: Edge) => {
    if (!confirm('Delete this relationship?')) return;
    try {
      await dataModelAPI.deleteRelationship(edge.id);
      setRelationships((r) => r.filter((rel) => rel.id !== edge.id));
      toast({ title: 'Relationship deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const createRelationship = async () => {
    try {
      const res = await dataModelAPI.createRelationship(rel);
      setRelationships((r) => [...r, res.data.data]);
      setShowAdd(false);
      setRel({ sourceDatasetId: '', sourceColumn: '', targetDatasetId: '', targetColumn: '', relationshipType: 'one-to-many' });
      toast({ title: 'Relationship created!' });
    } catch {
      toast({ title: 'Failed to create relationship', variant: 'destructive' });
    }
  };

  const srcCols = datasets.find((d) => d.id === rel.sourceDatasetId)?.schemaJson?.map((c) => c.name) || [];
  const tgtCols = datasets.find((d) => d.id === rel.targetDatasetId)?.schemaJson?.map((c) => c.name) || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Data Model"
        actions={
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Relationship
          </Button>
        }
      />

      <div style={{ height: 'calc(100vh - 64px)' }} className="flex-1">
        {datasets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <GitBranch className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-base font-medium text-muted-foreground mb-1">No datasets</p>
            <p className="text-sm text-muted-foreground/60">Upload datasets to see your data model here</p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgeClick={handleEdgeClick}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
            <Controls />
            <MiniMap nodeColor="#3b82f6" maskColor="rgba(0,0,0,0.05)" />
          </ReactFlow>
        )}
      </div>

      {/* Add Relationship Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Relationship</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Source Table</Label>
                <Select value={rel.sourceDatasetId} onValueChange={(v) => setRel((r) => ({ ...r, sourceDatasetId: v, sourceColumn: '' }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Table" /></SelectTrigger>
                  <SelectContent>{datasets.map((d) => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Source Column</Label>
                <Select value={rel.sourceColumn} onValueChange={(v) => setRel((r) => ({ ...r, sourceColumn: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                  <SelectContent>{srcCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Relationship Type</Label>
              <Select value={rel.relationshipType} onValueChange={(v) => setRel((r) => ({ ...r, relationshipType: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-to-one" className="text-xs">One-to-One</SelectItem>
                  <SelectItem value="one-to-many" className="text-xs">One-to-Many</SelectItem>
                  <SelectItem value="many-to-one" className="text-xs">Many-to-One</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Target Table</Label>
                <Select value={rel.targetDatasetId} onValueChange={(v) => setRel((r) => ({ ...r, targetDatasetId: v, targetColumn: '' }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Table" /></SelectTrigger>
                  <SelectContent>{datasets.map((d) => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Column</Label>
                <Select value={rel.targetColumn} onValueChange={(v) => setRel((r) => ({ ...r, targetColumn: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Column" /></SelectTrigger>
                  <SelectContent>{tgtCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={createRelationship}
              disabled={!rel.sourceDatasetId || !rel.targetDatasetId || !rel.sourceColumn || !rel.targetColumn}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
