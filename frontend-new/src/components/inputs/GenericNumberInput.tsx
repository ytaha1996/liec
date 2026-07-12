import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

interface GenericNumberInputProps extends BaseInputProps<number | string | null | undefined> {
  min?: number;
  max?: number;
  step?: number;
}

export function GenericNumberInput({
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
  min,
  max,
  step,
}: GenericNumberInputProps) {
  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <Input
        id={name}
        name={name}
        type="number"
        inputMode="decimal"
        value={value == null ? '' : String(value)}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? '' : e.target.valueAsNumber)}
        onFocus={(e) => e.target.select()}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
    </FieldLabel>
  );
}
