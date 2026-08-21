import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { BaseInputProps } from './common';

interface GenericCheckboxProps extends BaseInputProps<boolean> {
  description?: string;
}

export function GenericCheckbox({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  className,
  description,
}: GenericCheckboxProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-start gap-2">
        <Checkbox
          id={name}
          checked={value ?? false}
          onCheckedChange={(v) => onChange(!!v)}
          disabled={disabled}
          aria-invalid={!!error}
          className={cn(error && 'border-destructive')}
        />
        <div className="flex flex-col">
          {title && (
            <Label htmlFor={name} className="cursor-pointer">
              {title}
            </Label>
          )}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
