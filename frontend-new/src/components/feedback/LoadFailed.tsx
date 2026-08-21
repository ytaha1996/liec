import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface LoadFailedProps {
  what?: string;
  onRetry?: () => void;
}

// Standard initial-load failure surface — used by pages when
// useInitializeFunction reports an error so users never stare at an
// empty table wondering where the data went.
export function LoadFailed({ what = 'data', onRetry }: LoadFailedProps) {
  return (
    <div className="p-4 sm:p-6">
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
          <span>Failed to load {what}. Check your connection and try again.</span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
