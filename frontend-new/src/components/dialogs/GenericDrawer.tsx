import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface GenericDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  // Side defaults to right; mobile always goes full-width.
  side?: 'left' | 'right';
}

export function GenericDrawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
}: GenericDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side={side} className={cn('w-full sm:max-w-md p-0 flex flex-col')}>
        <SheetHeader className="border-b px-4 sm:px-6 py-3">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
