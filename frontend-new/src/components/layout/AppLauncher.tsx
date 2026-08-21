import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { buildApplications, type AppGroup, type AppModule } from '@/application';
import { useUserRole } from '@/helpers/rbac';

interface AppLauncherProps {
  open: boolean;
  onClose: () => void;
}

function ModuleTile({
  module,
  accent,
  onPick,
  active,
}: {
  module: AppModule;
  accent: string;
  onPick: (route: string) => void;
  active: boolean;
}) {
  const Icon = module.icon;
  return (
    <button
      type="button"
      onClick={() => onPick(module.route)}
      className={cn(
        'group relative flex flex-col items-start gap-2 rounded-xl border bg-card p-3 sm:p-4',
        'text-left transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-transparent',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'ring-2 ring-offset-2 ring-offset-background',
      )}
      style={
        active
          ? { boxShadow: `0 0 0 2px ${accent}` }
          : undefined
      }
    >
      <div
        className="flex size-10 sm:size-11 items-center justify-center rounded-lg text-white shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: accent }}
      >
        <Icon className="size-5 sm:size-6" />
      </div>
      <div className="min-w-0 w-full">
        <p className="font-semibold text-sm sm:text-base leading-tight truncate">{module.title}</p>
        {module.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{module.description}</p>
        )}
      </div>
    </button>
  );
}

export function AppLauncher({ open, onClose }: AppLauncherProps) {
  const role = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');

  // Reset search when closing so it doesn't linger between opens.
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const groups = useMemo(() => buildApplications(role), [role]);

  const filtered = useMemo<AppGroup[]>(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((g) => ({
        ...g,
        modules: g.modules.filter(
          (m) =>
            m.title.toLowerCase().includes(needle) ||
            m.description?.toLowerCase().includes(needle) ||
            g.title.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.modules.length > 0);
  }, [groups, search]);

  const totalMatches = filtered.reduce((n, g) => n + g.modules.length, 0);

  const pick = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          // Full screen on mobile, generous centred dialog on tablet+ so the
          // 3- and 4-col tile grids breathe.
          'w-screen h-screen max-w-none p-0 gap-0 sm:max-w-4xl md:max-w-5xl sm:h-auto sm:max-h-[88vh]',
          'sm:rounded-2xl overflow-hidden flex flex-col',
          // Hide the default close button from shadcn's Dialog — we render our own.
          '[&>button[type=button]]:hidden',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b">
          <LayoutGrid className="size-5 text-primary shrink-0" />
          <DialogTitle className="text-base sm:text-lg shrink-0">App Launcher</DialogTitle>
          <div className="flex-1 relative max-w-sm ml-auto">
            <Search className="absolute left-2.5 top-2.5 size-4 opacity-50" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules…"
              className="pl-8 h-9 bg-muted/40"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 bg-muted/20">
          {totalMatches === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
              <Search className="size-8 mb-2 opacity-40" />
              <p className="text-sm">No modules match "{search}"</p>
            </div>
          ) : (
            filtered.map((group) => (
              <section key={group.name}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-muted-foreground">
                    {group.title}
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {group.modules.map((m) => (
                    <ModuleTile
                      key={m.name}
                      module={m}
                      accent={group.color}
                      onPick={pick}
                      active={location.pathname.startsWith(m.route)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
