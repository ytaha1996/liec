import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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

interface LightboxState {
  stageItems: MediaItem[];
  index: number;
}

interface MediaGalleryProps {
  media: MediaItem[];
}

const stageChip = (stage: string) => MEDIA_STAGE_CHIPS[stage] ?? MEDIA_STAGE_CHIPS['Other'];

const MediaGallery = ({ media }: MediaGalleryProps) => {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  const byStage = media.reduce((acc, item) => {
    if (!acc[item.stage]) acc[item.stage] = [];
    acc[item.stage].push(item);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  const currentItem = lightbox ? lightbox.stageItems[lightbox.index] : null;

  const goPrev = () => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.stageItems.length) % lightbox.stageItems.length });
  };

  const goNext = () => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.stageItems.length });
  };

  if (media.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No photos uploaded yet.
      </Typography>
    );
  }

  return (
    <Box>
      {Object.entries(byStage).map(([stage, items]) => {
        const sc = stageChip(stage);
        return (
          <Box key={stage} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Chip label={stage} size="small" sx={{ backgroundColor: sc.backgroundColor, color: sc.color, fontWeight: 600 }} />
              <Typography variant="body2" color="text.secondary">
                {items.length} photo{items.length !== 1 ? 's' : ''}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
              {items.map((item, idx) => (
                <Card
                  key={item.id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                    '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
                  }}
                  onClick={() => setLightbox({ stageItems: items, index: idx })}
                >
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={item.publicUrl}
                      alt={stage}
                      sx={{ aspectRatio: '1', objectFit: 'cover' }}
                    />
                    <Chip
                      label={stage}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        backgroundColor: `${sc.backgroundColor}CC`,
                        color: sc.color,
                        fontSize: '0.65rem',
                        height: 20,
                      }}
                    />
                  </Box>
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" display="block" color="text.secondary" noWrap>
                      {item.capturedAt ? formatDateTime(item.capturedAt) : '—'}
                    </Typography>
                    {item.operatorName && (
                      <Typography variant="caption" display="block" noWrap title={item.operatorName}>
                        {item.operatorName}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        );
      })}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth={false} PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.92)', m: 1 } }}>
        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton
            onClick={() => setLightbox(null)}
            sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', bgcolor: 'rgba(255,255,255,0.1)', zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1, px: 1 }}>
            <IconButton
              onClick={goPrev}
              disabled={(lightbox?.stageItems.length ?? 0) <= 1}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}
            >
              <ChevronLeftIcon />
            </IconButton>

            {currentItem && (
              <Box
                component="img"
                src={currentItem.publicUrl}
                alt={currentItem.stage}
                sx={{ maxWidth: '80vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
              />
            )}

            <IconButton
              onClick={goNext}
              disabled={(lightbox?.stageItems.length ?? 0) <= 1}
              sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {currentItem && (
            <Box sx={{ py: 1.5, px: 3, textAlign: 'center', color: '#fff' }}>
              <Chip
                label={currentItem.stage}
                size="small"
                sx={{ backgroundColor: stageChip(currentItem.stage).backgroundColor, color: stageChip(currentItem.stage).color, mb: 0.5 }}
              />
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {currentItem.capturedAt ? formatDateTime(currentItem.capturedAt) : '—'}
              </Typography>
              {currentItem.operatorName && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>{currentItem.operatorName}</Typography>
              )}
              {currentItem.notes && (
                <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5 }}>{currentItem.notes}</Typography>
              )}
              <Typography variant="caption" sx={{ opacity: 0.5, display: 'block', mt: 0.5 }}>
                {lightbox!.index + 1} / {lightbox!.stageItems.length}
              </Typography>
            </Box>
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default MediaGallery;
