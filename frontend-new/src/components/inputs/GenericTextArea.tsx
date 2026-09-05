import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

interface GenericTextAreaProps extends BaseInputProps<string> {
  rows?: number;
}

export function GenericTextArea({
  name,
  title,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
  placeholder,
  className,
  rows = 4,
}: GenericTextAreaProps) {
  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <Textarea
        id={name}
        name={name}
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
    </FieldLabel>
  );
}
