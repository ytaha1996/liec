import { ChangeEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { toast } from 'react-toastify';
import { uploadMultipart } from '../../api/client';
import { MEDIA_STAGE_CHIPS } from '../../constants/statusColors';
import MediaViewerModal from './MediaViewerModal';

interface MediaItem {
  id: number;
  publicUrl: string;
  stage: string;
  capturedAt?: string;
  operatorName?: string;
  notes?: string;
}

interface MediaStageCardsProps {
  packageId: string;
  media: MediaItem[];
}

const STAGES = ['Receiving', 'Departure', 'Arrival', 'Other'];

const MediaStageCards = ({ packageId, media }: MediaStageCardsProps) => {
  const qc = useQueryClient();
  const [viewerStage, setViewerStage] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: ({ stage, file }: { stage: string; file: File }) => {
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

  const countByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = media.filter((m) => m.stage === stage).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
        {STAGES.map((stage) => {
          const sc = MEDIA_STAGE_CHIPS[stage] ?? MEDIA_STAGE_CHIPS['Other'];
          const count = countByStage[stage];
          return (
            <Card key={stage} variant="outlined" sx={{ borderLeft: `4px solid ${sc.backgroundColor}` }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Chip label={stage} size="small" sx={{ backgroundColor: sc.backgroundColor, color: sc.color, fontWeight: 600 }} />
                  <Typography variant="h5" fontWeight={700}>{count}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {count === 0 ? 'No photos' : `${count} photo${count !== 1 ? 's' : ''}`}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    component="label"
                  >
                    Upload
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) upload.mutate({ stage, file });
                        e.target.value = '';
                      }}
                    />
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<VisibilityIcon />}
                    disabled={count === 0}
                    onClick={() => setViewerStage(stage)}
                  >
                    View
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {viewerStage && (
        <MediaViewerModal
          open
          onClose={() => setViewerStage(null)}
          packageId={packageId}
          stage={viewerStage}
          media={media.filter((m) => m.stage === viewerStage)}
        />
      )}
    </>
  );
};

export default MediaStageCards;
