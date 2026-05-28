import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Database, BarChart3, Share2, Settings,
  ChevronRight, Shuffle, GitBranch, FileText, Home, Shield, LogOut, Zap, Link2, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { toast } from '@/hooks/useToast';

const NAV_ITEMS = [
  { label: 'Home', icon: Home, to: '/dashboard' },
  { label: 'Workspaces', icon: LayoutDashboard, to: '/workspaces' },
  { label: 'Datasets', icon: Database, to: '/datasets' },
  { label: 'Connections', icon: Link2, to: '/connections' },
  { label: 'Transform Data', icon: Shuffle, to: '/transform' },
  { label: 'Data Model', icon: GitBranch, to: '/data-model' },
  { label: 'Reports', icon: FileText, to: '/reports' },
  { label: 'Dashboards', icon: BarChart3, to: '/dashboards' },
  { label: 'Shared With Me', icon: Share2, to: '/shared' },
  { label: 'Activity', icon: History, to: '/activity' },
];

const BOTTOM_ITEMS = [
  { label: 'Admin', icon: Shield, to: '/admin', adminOnly: true },
  { label: 'Settings', icon: Settings, to: '/settings' },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { activeWorkspace } = useWorkspaceStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast({ title: 'Signed out', description: 'See you next time!' });
    navigate('/login');
  };

  const initials = user?.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'IB';

  return (
    <aside className="flex flex-col w-[220px] min-w-[220px] h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sidebar-foreground font-bold text-base tracking-tight">InsightBI</span>
      </div>

      {/* Workspace indicator */}
      {activeWorkspace && (
        <div className="px-3 py-2 border-b border-sidebar-border">
          <button
            onClick={() => navigate('/workspaces')}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-left"
          >
            <div className="w-5 h-5 rounded bg-sidebar-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-sidebar-primary">
                {activeWorkspace.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-sidebar-foreground/80 truncate flex-1">{activeWorkspace.name}</span>
            <ChevronRight className="w-3 h-3 text-sidebar-foreground/40 shrink-0" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-0.5">
          {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-white font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 mt-4 space-y-0.5">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            System
          </div>
          {BOTTOM_ITEMS.map(({ label, icon: Icon, to, adminOnly }) => {
            if (adminOnly && user?.role !== 'ADMIN') return null;
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-white font-medium'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            );
          })}
        </div>
      </ScrollArea>

      {/* User area */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0" onClick={handleLogout}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
