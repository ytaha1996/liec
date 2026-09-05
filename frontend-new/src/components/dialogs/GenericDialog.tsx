import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface GenericDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  // 'md' (default) is comfortable on phones via fullScreen and ~520px on
  // tablet+; 'lg' grows to ~720px. 'full' stays full-screen everywhere.
  size?: 'sm' | 'md' | 'lg' | 'full';
}

// Pixel widths: sm=512, md=672, lg=896. The previous `md` (512px) was too
// narrow for form-heavy dialogs (two-column rows clipped); bumped to 672px
// which comfortably fits a 2-column DynamicFormWidget grid.
const widthClass: Record<NonNullable<GenericDialogProps['size']>, string> = {
  sm: 'sm:max-w-lg',
  md: 'sm:max-w-2xl',
  lg: 'sm:max-w-4xl',
  full: 'sm:max-w-[95vw]',
};

export function GenericDialog({
  open,
  onClose,
  title,
  description,
  headerAction,
  children,
  size = 'md',
}: GenericDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          // Full-screen on phones; centred constrained dialog on tablet+.
          'w-screen h-screen max-w-none sm:h-auto sm:max-h-[90vh]',
          'sm:rounded-lg overflow-hidden p-0 flex flex-col',
          widthClass[size],
        )}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base sm:text-lg">{title}</DialogTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {headerAction}
        </DialogHeader>
        <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-1">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
