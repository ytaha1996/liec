import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  size?: number;
  fullScreen?: boolean;
  label?: string;
}

export function Loader({ size = 24, fullScreen = false, label }: LoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-muted-foreground',
        fullScreen ? 'min-h-screen' : 'py-8',
      )}
    >
      <Loader2 className="animate-spin" style={{ width: size, height: size }} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
