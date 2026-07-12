import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

interface GenericCheckboxListProps extends BaseInputProps<string[]> {
  items: Record<string, string>;
  columns?: 1 | 2 | 3;
}

export function GenericCheckboxList({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  required,
  className,
  items,
  columns = 1,
}: GenericCheckboxListProps) {
  const selected = value ?? [];
  const toggle = (k: string) =>
    onChange(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);

  const colCls =
    columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1';

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <div className={cn('grid gap-2', colCls)}>
        {Object.entries(items).map(([k, label]) => (
          <div key={k} className="flex items-center gap-2">
            <Checkbox
              id={`${name}-${k}`}
              checked={selected.includes(k)}
              onCheckedChange={() => toggle(k)}
              disabled={disabled}
            />
            <Label htmlFor={`${name}-${k}`} className="cursor-pointer font-normal">
              {label}
            </Label>
          </div>
        ))}
      </div>
    </FieldLabel>
  );
}
