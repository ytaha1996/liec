import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_TEAL } from '@/constants/statusColors';

export interface MainPageAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  destructive?: boolean;
}

interface MainPageTitleProps {
  title: string;
  subtitle?: string;
  action?: { title: string; onClick: () => void; disabled?: boolean };
  actions?: MainPageAction[];
  chips?: ReactNode;
}

export function MainPageTitle({ title, subtitle, action, actions = [], chips }: MainPageTitleProps) {
  const primary = actions.filter((a) => a.variant !== 'secondary');
  const secondary = actions.filter((a) => a.variant === 'secondary');
  const totalVisible = primary.length + (action ? 1 : 0);
  const stack = totalVisible >= 2;

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-xl sm:text-2xl font-bold leading-tight"
              style={{ color: BRAND_TEAL }}
            >
              {title}
            </h1>
            {chips}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {(action || primary.length > 0 || secondary.length > 0) && (
          <div
            className={cn(
              'flex gap-2 w-full sm:w-auto',
              stack ? 'flex-col sm:flex-row' : 'flex-row',
              stack && 'items-stretch sm:items-center',
            )}
          >
            {action && (
              <Button
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(stack && 'w-full sm:w-auto')}
              >
                {action.title}
              </Button>
            )}
            {primary.map((a, i) => (
              <Button
                key={`primary-${i}`}
                onClick={a.onClick}
                disabled={a.disabled}
                variant={a.destructive ? 'destructive' : 'default'}
                className={cn(stack && 'w-full sm:w-auto')}
              >
                {a.label}
              </Button>
            ))}
            {secondary.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className={cn(stack && 'w-full sm:w-auto')}>
                    <MoreHorizontal className="mr-1 size-4" />
                    More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {secondary.map((s, i) => (
                    <DropdownMenuItem
                      key={`s-${i}`}
                      disabled={s.disabled}
                      onClick={s.onClick}
                      className={s.destructive ? 'text-destructive' : ''}
                    >
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
