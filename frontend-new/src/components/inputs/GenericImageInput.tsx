import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

type ImageValue = File | string | null | undefined;

const preview = (v: ImageValue): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return URL.createObjectURL(v);
};

export function GenericImageInput({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  required,
  className,
}: BaseInputProps<ImageValue>) {
  const ref = useRef<HTMLInputElement | null>(null);
  const src = preview(value);

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <div
        className={cn(
          'border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center gap-2 transition-colors',
          'hover:border-primary',
          error ? 'border-destructive' : 'border-border',
          disabled && 'opacity-60 pointer-events-none',
        )}
      >
        <input
          ref={ref}
          id={name}
          name={name}
          type="file"
          accept="image/*"
          disabled={disabled}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        {src ? (
          <div className="relative">
            <img
              src={src}
              alt="preview"
              className="max-h-40 max-w-full rounded-md object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 size-7 rounded-full"
              onClick={() => onChange(null)}
              aria-label="Remove image"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => ref.current?.click()}
            disabled={disabled}
          >
            <Upload className="mr-2 size-4" />
            Upload image
          </Button>
        )}
      </div>
    </FieldLabel>
  );
}
