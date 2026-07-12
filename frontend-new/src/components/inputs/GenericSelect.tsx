import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

interface GenericSelectProps extends BaseInputProps<string> {
  items: Record<string, string>;
  // When true a leading "— None —" option is rendered (sets value to '').
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function GenericSelect({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  required,
  placeholder,
  className,
  items,
  allowEmpty = false,
  emptyLabel = '— None —',
}: GenericSelectProps) {
  const entries = useMemo(() => Object.entries(items), [items]);
  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <Select
        value={value || undefined}
        onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}
        disabled={disabled}
      >
        <SelectTrigger
          id={name}
          aria-invalid={!!error}
          className={cn('w-full', error && 'border-destructive focus-visible:ring-destructive')}
        >
          <SelectValue placeholder={placeholder ?? 'Select…'} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="__empty__">{emptyLabel}</SelectItem>}
          {entries.map(([k, label]) => (
            <SelectItem key={k} value={k}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldLabel>
  );
}
