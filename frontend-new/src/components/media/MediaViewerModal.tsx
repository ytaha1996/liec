import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaViewerModalProps {
  open: boolean;
  src: string | null;
  onClose: () => void;
}

export function MediaViewerModal({ open, src, onClose }: MediaViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 bg-black/95 border-0">
        {src && (
          <img
            src={src}
            alt="full size"
            className="w-full h-full max-h-[90vh] object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
