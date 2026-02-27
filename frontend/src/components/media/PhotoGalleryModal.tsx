import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getJson } from '../../api/client';

interface PhotoGalleryModalProps {
  open: boolean;
  onClose: () => void;
  packageId: number;
  title?: string;
}

const PhotoGalleryModal = ({ open, onClose, packageId, title }: PhotoGalleryModalProps) => {
  const [fullImg, setFullImg] = useState<string | null>(null);

  const { data: media = [] } = useQuery<any[]>({
    queryKey: ['/api/packages', packageId, 'media'],
    queryFn: () => getJson<any[]>(`/api/packages/${packageId}/media`),
    enabled: open && !!packageId,
  });

  const byStage = media.reduce((a, m) => {
    (a[m.stage] ?? (a[m.stage] = [])).push(m);
    return a;
  }, {} as Record<string, any[]>);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title ?? `Package #${packageId} Photos`}
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {media.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No photos uploaded yet.</Typography>
          ) : (
            Object.entries(byStage).map(([stage, items]) => (
              <Box key={stage} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>{stage}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 1.5 }}>
                  {(items as any[]).map((m: any) => (
                    <Box
                      key={m.id}
                      component="img"
                      src={m.publicUrl}
                      alt={stage}
                      onClick={() => setFullImg(m.publicUrl)}
                      sx={{
                        width: '100%',
                        aspectRatio: '1',
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'transform 0.15s',
                        '&:hover': { transform: 'scale(1.03)' },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ))
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!fullImg} onClose={() => setFullImg(null)} maxWidth={false}>
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={() => setFullImg(null)} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
            <CloseIcon />
          </IconButton>
          {fullImg && (
            <Box component="img" src={fullImg} alt="Full size" sx={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default PhotoGalleryModal;
