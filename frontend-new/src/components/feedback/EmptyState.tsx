import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  message?: string;
  hint?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  message = 'No data found.',
  hint,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="text-muted-foreground mb-2">
        {icon ?? <Inbox className="size-10" strokeWidth={1.4} />}
      </div>
      <p className="text-sm sm:text-base font-medium">{message}</p>
      {hint && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{hint}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
