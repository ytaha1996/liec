import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<typeof Button>;

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, disabled, className, ...rest }, ref) => (
    <Button
      ref={ref}
      disabled={disabled || loading}
      className={cn(className)}
      {...rest}
    >
      {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  ),
);
LoadingButton.displayName = 'LoadingButton';
