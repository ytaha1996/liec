import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FieldLabelProps {
  name: string;
  title?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  // Hide the error message slot — useful in compact layouts that surface
  // errors elsewhere (e.g. a form summary at the top).
  hideError?: boolean;
}

// Shared wrapper that renders the label + the input + a fixed-height error
// slot so vertical rhythm stays stable when a row goes from valid → invalid.
export function FieldLabel({
  name,
  title,
  required,
  error,
  children,
  className,
  hideError,
}: FieldLabelProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {title ? (
        <Label htmlFor={name} className={cn(error && 'text-destructive')}>
          {title}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
      ) : null}
      {children}
      {!hideError && (
        <p
          className={cn(
            'text-xs min-h-[1rem] leading-4',
            error ? 'text-destructive' : 'text-transparent',
          )}
        >
          {error || ' '}
        </p>
      )}
    </div>
  );
}
