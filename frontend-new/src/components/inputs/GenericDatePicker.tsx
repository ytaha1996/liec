import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

// `value` is the ISO date string (`YYYY-MM-DD`) so it round-trips cleanly
// through JSON and the backend.
interface GenericDatePickerProps extends BaseInputProps<string | null | undefined> {
  minDate?: Date;
  maxDate?: Date;
}

const toDate = (v: string | null | undefined): Date | undefined => {
  if (!v) return undefined;
  const d = parseISO(v);
  return isValid(d) ? d : undefined;
};

export function GenericDatePicker({
  name,
  title,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
  placeholder = 'Pick a date',
  className,
  minDate,
  maxDate,
}: GenericDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);

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
            aria-invalid={!!error}
            className={cn(
              'w-full justify-start font-normal',
              !selected && 'text-muted-foreground',
              error && 'border-destructive',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {selected ? format(selected, 'dd-MM-yyyy') : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start" sideOffset={6}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              onChange(d ? format(d, 'yyyy-MM-dd') : null);
              setOpen(false);
            }}
            disabled={(d) => (minDate ? d < minDate : false) || (maxDate ? d > maxDate : false)}
            captionLayout="dropdown"
            // Bigger cells + outer padding so the picker doesn't feel cramped
            // on either touch or pointer. ~44px cells on phones (Apple HIG
            // touch target), ~40px on desktop.
            className="p-4 [--cell-size:2.75rem] sm:[--cell-size:2.5rem] text-base"
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </FieldLabel>
  );
}
