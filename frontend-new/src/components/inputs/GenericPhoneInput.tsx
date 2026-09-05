import { parsePhoneNumberFromString, AsYouType } from 'libphonenumber-js';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

export function GenericPhoneInput({
  name,
  title,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
  placeholder = '+961…',
  className,
}: BaseInputProps<string>) {
  // Light formatting hint with AsYouType so users can see the grouping take
  // shape while typing. Final canonical form happens on blur.
  const formatted = value ? new AsYouType().input(value) : '';

  const normalizeOnBlur = () => {
    if (value) {
      const parsed = parsePhoneNumberFromString(value);
      if (parsed?.isValid()) onChange(parsed.number);
    }
    onBlur?.();
  };

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <Input
        id={name}
        name={name}
        type="tel"
        inputMode="tel"
        value={formatted}
        onChange={(e) => onChange(e.target.value)}
        onBlur={normalizeOnBlur}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
    </FieldLabel>
  );
}
