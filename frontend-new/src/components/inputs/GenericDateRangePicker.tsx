import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

type Range = { from?: string | null; to?: string | null } | null;

interface GenericDateRangePickerProps extends BaseInputProps<Range> {
  minDate?: Date;
  maxDate?: Date;
}

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = parseISO(v);
  return isValid(d) ? d : undefined;
};

export function GenericDateRangePicker({
  name,
  title,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
  placeholder = 'Pick a date range',
  className,
  minDate,
  maxDate,
}: GenericDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const from = toDate(value?.from);
  const to = toDate(value?.to);
  const label =
    from && to
      ? `${format(from, 'dd-MM-yyyy')} – ${format(to, 'dd-MM-yyyy')}`
      : from
      ? `${format(from, 'dd-MM-yyyy')} – …`
      : placeholder;

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) onBlur?.();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={name}
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start font-normal',
              !from && 'text-muted-foreground',
              error && 'border-destructive',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start" sideOffset={6}>
          <Calendar
            mode="range"
            selected={from || to ? { from, to } : undefined}
            onSelect={(r) =>
              onChange({
                from: r?.from ? format(r.from, 'yyyy-MM-dd') : null,
                to: r?.to ? format(r.to, 'yyyy-MM-dd') : null,
              })
            }
            disabled={(d) => (minDate ? d < minDate : false) || (maxDate ? d > maxDate : false)}
            // One month on phones, two side-by-side on tablet+ so the popover
            // doesn't overflow narrow viewports.
            numberOfMonths={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2}
            className="p-4 [--cell-size:2.75rem] sm:[--cell-size:2.5rem] text-base"
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </FieldLabel>
  );
}
