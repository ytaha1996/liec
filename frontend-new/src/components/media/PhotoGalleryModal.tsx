import { useState } from 'react';
import { Trash2, ZoomIn } from 'lucide-react';
import { GenericDialog } from '@/components/dialogs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MEDIA_STAGE_CHIPS } from '@/constants/statusColors';
import { toast } from 'sonner';
import { deleteJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import type { MediaItem } from './MediaStageCards';
import { MediaViewerModal } from './MediaViewerModal';

interface PhotoGalleryModalProps {
  open: boolean;
  onClose: () => void;
  packageId: number | string;
  media: MediaItem[];
  initialStage?: string;
  onChanged: () => void;
  canDelete: boolean;
}

export function PhotoGalleryModal({
  open,
  onClose,
  packageId,
  media,
  initialStage,
  onChanged,
  canDelete,
}: PhotoGalleryModalProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const filtered = initialStage ? media.filter((m) => m.stage === initialStage) : media;

  const remove = async (id: number) => {
    try {
      await deleteJson(`/api/packages/${packageId}/media/${id}`);
      toast.success('Photo deleted');
      onChanged();
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  return (
    <>
      <GenericDialog
        open={open}
        onClose={onClose}
        title={`Photos — ${initialStage ?? 'All'}`}
        size="lg"
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No photos in this stage.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((m) => {
              const palette = MEDIA_STAGE_CHIPS[m.stage];
              return (
                <div key={m.id} className="border rounded-md overflow-hidden">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={m.publicUrl}
                      alt={m.stage}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors text-white opacity-0 hover:opacity-100"
                      onClick={() => {
                        setViewerSrc(m.publicUrl);
                        setViewerOpen(true);
                      }}
                      aria-label="Zoom"
                    >
                      <ZoomIn className="size-6" />
                    </button>
                  </div>
                  <div className="p-2 flex items-center justify-between gap-2">
                    <Badge
                      style={{
                        color: palette?.color,
                        backgroundColor: palette?.backgroundColor,
                      }}
                      className="text-[10px]"
                    >
                      {m.stage}
                    </Badge>
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive"
                        onClick={() => remove(m.id)}
                        aria-label="Delete photo"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GenericDialog>
      <MediaViewerModal
        open={viewerOpen}
        src={viewerSrc}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
