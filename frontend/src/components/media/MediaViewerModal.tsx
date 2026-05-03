import { ChangeEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { toast } from 'react-toastify';
import { api, uploadMultipart } from '../../api/client';
import { useAppDispatch } from '../../redux/hooks';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import { formatDateTime } from '../../helpers/formatting-utils';
import { MEDIA_STAGE_CHIPS } from '../../constants/statusColors';

interface MediaItem {
  id: number;
  publicUrl: string;
  stage: string;
  capturedAt?: string;
  operatorName?: string;
  notes?: string;
}

interface MediaViewerModalProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  stage: string;
  media: MediaItem[];
}

const MediaViewerModal = ({ open, onClose, packageId, stage, media }: MediaViewerModalProps) => {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const sc = MEDIA_STAGE_CHIPS[stage] ?? MEDIA_STAGE_CHIPS['Other'];

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('stage', stage);
      fd.append('file', file);
      return uploadMultipart(`/api/packages/${packageId}/media`, fd);
    },
    onSuccess: () => {
      toast.success('Photo uploaded');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId, 'media'] });
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
    },
    onError: () => toast.error('Upload failed'),
  });

  const deleteMedia = useMutation({
    mutationFn: (mediaId: number) => api.delete(`/api/packages/${packageId}/media/${mediaId}`),
    onSuccess: () => {
      toast.success('Photo deleted');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId, 'media'] });
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Delete failed'),
  });

  const handleDelete = (item: MediaItem) => {
    dispatch(OpenConfirmation({
      open: true,
      title: 'Delete Photo',
      message: `Delete this ${stage} photo?`,
      onSubmit: () => deleteMedia.mutate(item.id),
    }));
  };

  const currentItem = lightboxIdx !== null ? media[lightboxIdx] : null;

  const goPrev = () => {
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx - 1 + media.length) % media.length);
  };

  const goNext = () => {
    if (lightboxIdx === null) return;
    setLightboxIdx((lightboxIdx + 1) % media.length);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip label={stage} size="small" sx={{ backgroundColor: sc.backgroundColor, color: sc.color, fontWeight: 600 }} />
            <Typography variant="body2" color="text.secondary">
              {media.length} photo{media.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button size="small" variant="outlined" startIcon={<UploadIcon />} component="label">
              Upload
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                  e.target.value = '';
                }}
              />
            </Button>
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {media.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>No photos yet.</Typography>
              <Button variant="contained" startIcon={<UploadIcon />} component="label">
                Upload First Photo
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) upload.mutate(file);
                    e.target.value = '';
                  }}
                />
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
              {media.map((item, idx) => (
                <Card
                  key={item.id}
                  sx={{
                    position: 'relative',
                    cursor: 'pointer',
                    '&:hover .media-overlay': { opacity: 1 },
                    transition: 'box-shadow 0.15s',
                    '&:hover': { boxShadow: 6 },
                  }}
                  onClick={() => setLightboxIdx(idx)}
                >
                  <CardMedia
                    component="img"
                    image={item.publicUrl}
                    alt={stage}
                    sx={{ aspectRatio: '1', objectFit: 'cover' }}
                  />
                  {/* Hover overlay with actions */}
                  <Box
                    className="media-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      bgcolor: 'rgba(0,0,0,0.5)',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}
                      onClick={(e) => { e.stopPropagation(); window.open(item.publicUrl, '_blank'); }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.9)', color: 'error.main', '&:hover': { bgcolor: '#fff' } }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {/* Metadata below */}
                  <Box sx={{ p: 0.75 }}>
                    <Typography variant="caption" display="block" color="text.secondary" noWrap>
                      {item.capturedAt ? formatDateTime(item.capturedAt) : '—'}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog
        open={lightboxIdx !== null}
        onClose={() => setLightboxIdx(null)}
        maxWidth={false}
        PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.92)', m: 1 } }}
      >
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton
            onClick={() => setLightboxIdx(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1, px: 1 }}>
            <IconButton onClick={goPrev} disabled={media.length <= 1} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ChevronLeftIcon />
            </IconButton>
            {currentItem && (
              <Box
                component="img"
                src={currentItem.publicUrl}
                alt={stage}
                sx={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
              />
            )}
            <IconButton onClick={goNext} disabled={media.length <= 1} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {currentItem && (
            <Box sx={{ py: 1.5, px: 3, textAlign: 'center', color: '#fff' }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {currentItem.capturedAt ? formatDateTime(currentItem.capturedAt) : '—'}
              </Typography>
              {currentItem.operatorName && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>{currentItem.operatorName}</Typography>
              )}
              {currentItem.notes && (
                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5 }}>{currentItem.notes}</Typography>
              )}
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1 }}>
                <IconButton
                  size="small"
                  sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}
                  onClick={() => window.open(currentItem.publicUrl, '_blank')}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{ color: '#ef5350', bgcolor: 'rgba(255,255,255,0.1)' }}
                  onClick={() => { setLightboxIdx(null); handleDelete(currentItem); }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mt: 0.5 }}>
                {lightboxIdx! + 1} / {media.length}
              </Typography>
            </Box>
          )}
        </Box>
      </Dialog>
    </>
  );
};

export default MediaViewerModal;
