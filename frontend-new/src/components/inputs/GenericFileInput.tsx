import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import { getMimeTypes, type FileType } from '@/helpers/file-utils';
import type { BaseInputProps } from './common';

interface GenericFileInputProps extends BaseInputProps<File | string | null | undefined> {
  allowedTypes?: FileType[];
  maxSizeInMbs?: number;
}

const filename = (v: File | string | null | undefined): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.name;
};

export function GenericFileInput({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  required,
  className,
  allowedTypes,
  maxSizeInMbs,
}: GenericFileInputProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  const accept = allowedTypes ? getMimeTypes(allowedTypes).join(',') : undefined;
  const label = filename(value);

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          id={name}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => ref.current?.click()}
        >
          <Upload className="mr-2 size-4" />
          {label ? 'Replace' : 'Choose file…'}
        </Button>
        {label && (
          <span className={cn('text-sm truncate flex-1', error && 'text-destructive')}>
            {label}
          </span>
        )}
        {label && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(null)}
            aria-label="Remove file"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {maxSizeInMbs && (
        <p className="text-xs text-muted-foreground -mt-1">Max {maxSizeInMbs} MB</p>
      )}
    </FieldLabel>
  );
}
