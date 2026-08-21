import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

export function GenericTagsInput({
  name,
  title,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
  placeholder = 'Type and press Enter…',
  className,
}: BaseInputProps<string[]>) {
  const [draft, setDraft] = useState('');
  const tags = value ?? [];

  const commit = (raw: string) => {
    const v = raw.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <div
        className={cn(
          'min-h-9 px-2 py-1.5 border rounded-md flex flex-wrap items-center gap-1',
          error ? 'border-destructive' : 'border-input',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
          disabled && 'opacity-60 pointer-events-none',
        )}
      >
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            {t}
            <X
              className="size-3 cursor-pointer"
              onClick={() => onChange(tags.filter((x) => x !== t))}
            />
          </Badge>
        ))}
        <Input
          id={name}
          type="text"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft) commit(draft);
            onBlur?.();
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] border-0 shadow-none focus-visible:ring-0 px-1 py-0 h-7"
        />
      </div>
    </FieldLabel>
  );
}
