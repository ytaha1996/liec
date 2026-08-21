import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

interface GenericMultiSelectProps extends BaseInputProps<string[]> {
  items: Record<string, string>;
}

export function GenericMultiSelect({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  required,
  placeholder = 'Select…',
  className,
  items,
}: GenericMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = value ?? [];
  const entries = useMemo(() => Object.entries(items), [items]);

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={name}
            variant="outline"
            role="combobox"
            disabled={disabled}
            aria-invalid={!!error}
            className={cn(
              'w-full justify-between font-normal h-auto min-h-9 py-1',
              error && 'border-destructive',
            )}
          >
            <div className="flex flex-wrap gap-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selected.map((k) => (
                  <Badge key={k} variant="secondary" className="gap-1">
                    {items[k] ?? k}
                    <X
                      className="size-3 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(k);
                      }}
                    />
                  </Badge>
                ))
              )}
            </div>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-(--radix-popover-trigger-width)" align="start">
          <Command>
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {entries.map(([k, label]) => (
                  <CommandItem key={k} value={label} onSelect={() => toggle(k)}>
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        selected.includes(k) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldLabel>
  );
}
