import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, LogOut, User, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { BRAND_TEAL } from '@/constants/statusColors';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { LogoutUser } from '@/redux/user/userReducer';
import { buildApplications, currentAppFromPath } from '@/application';
import { useUserRole } from '@/helpers/rbac';
import { CommandPalette } from '@/components/misc/CommandPalette';
import { AppLauncher } from './AppLauncher';

interface HeaderProps {
  appName?: string;
}

export function Header({ appName = 'LIEC Shipping' }: HeaderProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.user);
  const role = useUserRole();
  const initials = user?.user?.username?.charAt(0).toUpperCase() || 'U';

  // Ctrl/Cmd+K opens the global command palette.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const groups = useMemo(() => buildApplications(role), [role]);
  const currentApp = useMemo(
    () => currentAppFromPath(groups, location.pathname),
    [groups, location.pathname],
  );

  const handleLogout = () => {
    dispatch(LogoutUser());
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 text-white" style={{ backgroundColor: BRAND_TEAL }}>
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 h-14 sm:h-16 md:h-20 flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger — shows current app's modules. */}
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-white hover:bg-white/15 hover:text-white"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="p-4 border-b">
                <SheetTitle>{currentApp?.title ?? 'Navigation'}</SheetTitle>
              </div>
              <nav className="flex flex-col gap-1 p-2">
                {(currentApp?.modules ?? []).map((m) => {
                  const Icon = m.icon;
                  return (
                    <NavLink
                      key={m.route}
                      to={m.route}
                      onClick={() => setNavOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-accent',
                          isActive && 'bg-primary text-primary-foreground hover:bg-primary',
                        )
                      }
                    >
                      <Icon className="size-4" />
                      {m.title}
                    </NavLink>
                  );
                })}
              </nav>
              <div className="border-t p-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setNavOpen(false);
                    setLauncherOpen(true);
                  }}
                >
                  <LayoutGrid className="mr-2 size-4" />
                  Switch app
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* App launcher trigger (always visible) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLauncherOpen(true)}
            aria-label="Open app launcher"
            className="text-white hover:bg-white/15 hover:text-white shrink-0"
          >
            <LayoutGrid className="size-5" />
          </Button>

          {/* App name */}
          <NavLink
            to="/"
            className="font-bold tracking-wide text-base sm:text-lg shrink-0 inline-block truncate max-w-[40vw] sm:max-w-none"
          >
            {appName}
          </NavLink>

          {/* Current app indicator */}
          {currentApp && (
            <span className="hidden md:inline-flex items-center gap-1.5 ml-1 px-2 py-1 rounded-md bg-white/10 text-xs font-medium">
              {currentApp.title}
            </span>
          )}

          {/* Desktop nav — only the current app's modules */}
          <nav className="hidden md:flex items-center gap-0.5 ml-4 overflow-x-auto">
            {(currentApp?.modules ?? []).map((m) => {
              const Icon = m.icon;
              return (
                <NavLink
                  key={m.route}
                  to={m.route}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm hover:bg-white/15 transition-colors whitespace-nowrap',
                      isActive && 'bg-white/20',
                    )
                  }
                >
                  <Icon className="size-4 opacity-80" />
                  {m.title}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Right cluster */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search (Ctrl+K)"
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <Search className="size-5" />
          </Button>
          {user.role && (
            <Badge
              variant="outline"
              className="hidden sm:inline-flex bg-transparent text-white border-white/40"
            >
              {user.role}
            </Badge>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-white">
                <Avatar className="size-8 sm:size-10 bg-white text-primary">
                  <AvatarFallback className="bg-white text-primary font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-sm">
                <p className="font-medium truncate">{user.user.username || 'User'}</p>
                {user.user.email && (
                  <p className="text-xs text-muted-foreground truncate">{user.user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 size-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 size-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
