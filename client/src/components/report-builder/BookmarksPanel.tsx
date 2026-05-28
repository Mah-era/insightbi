import { useState } from 'react';
import { useReportBuilderStore } from '@/store/reportBuilderStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Bookmark, Trash2, Play, X } from 'lucide-react';

interface BookmarksPanelProps {
  onClose: () => void;
}

export function BookmarksPanel({ onClose }: BookmarksPanelProps) {
  const { bookmarks, saveBookmark, applyBookmark, deleteBookmark } = useReportBuilderStore();
  const [newName, setNewName] = useState('');

  const handleSave = () => {
    const name = newName.trim() || `Bookmark ${bookmarks.length + 1}`;
    saveBookmark(name);
    setNewName('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bookmarks</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3 border-b shrink-0">
        <div className="flex gap-1.5">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Bookmark name..."
            className="h-7 text-xs flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <Button size="sm" onClick={handleSave} className="h-7 text-xs px-2.5">
            Save
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Saves current filters and cross-filters</p>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1.5">
        {bookmarks.length === 0 ? (
          <div className="text-center py-6">
            <Bookmark className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground">No bookmarks saved yet</p>
          </div>
        ) : (
          bookmarks.map((bm) => (
            <div key={bm.id} className="flex items-center gap-1.5 p-2 rounded-md border bg-background hover:bg-muted/30 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{bm.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(bm.createdAt).toLocaleDateString()} ·{' '}
                  {bm.reportFilters.length} filter{bm.reportFilters.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => applyBookmark(bm.id)}
                  title="Apply bookmark"
                  className="p-1 rounded hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Play className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteBookmark(bm.id)}
                  title="Delete bookmark"
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
