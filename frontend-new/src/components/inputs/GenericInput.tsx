import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

interface GenericInputProps extends BaseInputProps<string> {
  type?: 'text' | 'email' | 'url' | 'password';
}

export function GenericInput({
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
  type = 'text',
}: GenericInputProps) {
  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <Input
        id={name}
        name={name}
        type={type}
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
