import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getJson } from '../../api/client';
import MediaGallery from './MediaGallery';

interface PhotoGalleryModalProps {
  open: boolean;
  onClose: () => void;
  packageId: number;
  title?: string;
}

const PhotoGalleryModal = ({ open, onClose, packageId, title }: PhotoGalleryModalProps) => {
  const { data: media = [] } = useQuery<any[]>({
    queryKey: ['/api/packages', packageId, 'media'],
    queryFn: () => getJson<any[]>(`/api/packages/${packageId}/media`),
    enabled: open && !!packageId,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title ?? `Package #${packageId} Photos`}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <MediaGallery media={media} />
      </DialogContent>
    </Dialog>
  );
};

export default PhotoGalleryModal;
