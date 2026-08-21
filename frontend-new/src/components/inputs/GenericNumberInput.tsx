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
        // Default to "any": the HTML default step=1 anchors at `min`, which
        // silently rejects decimals (e.g. min=0.01 makes 1.5 "invalid" — only
        // 1.01, 2.01… pass) and blocks form submission with a native bubble.
        step={step ?? 'any'}
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
