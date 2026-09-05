import { useRef } from 'react';
import { Upload, Image as ImageIcon, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MEDIA_STAGE_CHIPS } from '@/constants/statusColors';
import { useMultiFileUpload } from './useMultiFileUpload';

export interface MediaItem {
  id: number;
  stage: string;
  publicUrl: string;
  operatorName?: string;
}

interface MediaStageCardsProps {
  packageId: number | string;
  media: MediaItem[];
  onUploaded: () => void;
  onOpenGallery: (stage: string) => void;
  canUpload: boolean;
}

const STAGES: { key: string; label: string }[] = [
  { key: 'Receiving', label: 'Receiving' },
  { key: 'Departure', label: 'Departure' },
  { key: 'Arrival', label: 'Arrival' },
  { key: 'Other', label: 'Other' },
];

export function MediaStageCards({ packageId, media, onUploaded, onOpenGallery, canUpload }: MediaStageCardsProps) {
  const { uploadMultiple, progress, isUploading } = useMultiFileUpload(packageId, onUploaded);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {STAGES.map(({ key, label }) => {
        const items = media.filter((m) => m.stage === key);
        const palette = MEDIA_STAGE_CHIPS[key];
        return (
          <Card key={key} className="overflow-hidden">
            <div
              className="px-3 py-2 text-sm font-semibold flex items-center justify-between"
              style={{ color: palette?.color, backgroundColor: palette?.backgroundColor }}
            >
              <span>{label}</span>
              <Badge variant="secondary" className="bg-white/30 text-current">
                {items.length}
              </Badge>
            </div>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-center h-24 bg-muted rounded-md">
                {items.length === 0 ? (
                  <ImageIcon className="size-8 opacity-40" />
                ) : (
                  <img
                    src={items[0].publicUrl}
                    alt={label}
                    className="h-full object-contain"
                  />
                )}
              </div>
              <div className="flex gap-2">
                {canUpload && (
                  <>
                    <input
                      ref={(el) => {
                        inputs.current[key] = el;
                      }}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        uploadMultiple(key, files);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={isUploading}
                      onClick={() => inputs.current[key]?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  disabled={items.length === 0}
                  onClick={() => onOpenGallery(key)}
                >
                  <Eye className="size-4 mr-1" /> View
                </Button>
              </div>
              {progress && (
                <p className="text-xs text-muted-foreground text-center">
                  {progress.done}/{progress.total}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
