import { Bell, Moon, Sun, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useThemeStore } from '@/store/themeStore';

interface HeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="h-14 border-b bg-background flex items-center px-6 gap-4 shrink-0">
      {title && (
        <h1 className="text-base font-semibold text-foreground mr-2">{title}</h1>
      )}

      <div className="relative flex-1 max-w-sm hidden md:flex">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus-visible:border-input" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {actions}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
