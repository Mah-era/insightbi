import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workspace } from '@/types';

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setWorkspaces: (ws: Workspace[]) => void;
  setActiveWorkspace: (ws: Workspace) => void;
  addWorkspace: (ws: Workspace) => void;
  removeWorkspace: (id: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaces: [],
      activeWorkspace: null,
      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
      addWorkspace: (ws) => set((s) => ({ workspaces: [...s.workspaces, ws] })),
      removeWorkspace: (id) =>
        set((s) => ({
          workspaces: s.workspaces.filter((w) => w.id !== id),
          activeWorkspace: s.activeWorkspace?.id === id ? null : s.activeWorkspace,
        })),
    }),
    { name: 'insightbi_workspace', partialize: (s) => ({ activeWorkspace: s.activeWorkspace }) }
  )
);
