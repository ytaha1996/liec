import { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FieldLabel } from './FieldLabel';
import type { BaseInputProps } from './common';

type ImageItem = File | string;

interface GenericImageListInputProps extends BaseInputProps<ImageItem[]> {
  maxImages?: number;
}

const previewOf = (v: ImageItem): string => (typeof v === 'string' ? v : URL.createObjectURL(v));

export function GenericImageListInput({
  name,
  title,
  value,
  onChange,
  error,
  disabled,
  required,
  className,
  maxImages,
}: GenericImageListInputProps) {
  const ref = useRef<HTMLInputElement | null>(null);
  const items = value ?? [];
  const atCap = maxImages != null && items.length >= maxImages;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    const next = maxImages ? [...items, ...incoming].slice(0, maxImages) : [...items, ...incoming];
    onChange(next);
  };

  return (
    <FieldLabel name={name} title={title} required={required} error={error} className={className}>
      <div className="space-y-2">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item, idx) => (
            <div key={idx} className="relative aspect-square">
              <img
                src={previewOf(item)}
                alt={`image-${idx}`}
                className={cn(
                  'h-full w-full rounded-md object-cover border',
                  error && 'border-destructive',
                )}
              />
              {!disabled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 size-6 rounded-full"
                  onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  aria-label="Remove"
                >
                  <X className="size-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <input
          ref={ref}
          id={name}
          name={name}
          type="file"
          multiple
          accept="image/*"
          disabled={disabled || atCap}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => ref.current?.click()}
          disabled={disabled || atCap}
        >
          <Upload className="mr-2 size-4" />
          Add images {maxImages ? `(${items.length}/${maxImages})` : ''}
        </Button>
      </div>
    </FieldLabel>
  );
}
