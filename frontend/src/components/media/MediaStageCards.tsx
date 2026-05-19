import { ChangeEvent, DragEvent, useCallback, useRef, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { MEDIA_STAGE_CHIPS } from '../../constants/statusColors';
import MediaViewerModal from './MediaViewerModal';
import { useMultiFileUpload } from './useMultiFileUpload';
import { useUserRole, canUploadPhotos } from '../../helpers/rbac';

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
  const role = useUserRole();
  const canUpload = canUploadPhotos(role);
  const [viewerStage, setViewerStage] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const { uploadMultiple, progress } = useMultiFileUpload(packageId);

  const uploadMultipleFiles = useCallback(
    async (stage: string, files: File[]) => {
      setActiveStage(stage);
      try {
        await uploadMultiple(stage, files);
      } finally {
        setActiveStage(null);
      }
    },
    [uploadMultiple],
  );

  const handleDrop = useCallback(
    (stage: string) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverStage(null);
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (droppedFiles.length > 0) uploadMultipleFiles(stage, droppedFiles);
    },
    [uploadMultipleFiles],
  );

  const handleDragOver = useCallback(
    (stage: string) => (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverStage(stage);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleFileInput = useCallback(
    (stage: string) => (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) uploadMultipleFiles(stage, files);
      e.target.value = '';
    },
    [uploadMultipleFiles],
  );

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
          const stageProgress = activeStage === stage ? progress : null;
          const isDragOver = dragOverStage === stage;
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

                {/* Drop zone — only render for roles that can upload */}
                {canUpload && (
                  <Box
                    onDrop={handleDrop(stage)}
                    onDragOver={handleDragOver(stage)}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRefs.current[stage]?.click()}
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragOver ? 'primary.main' : 'grey.400',
                      backgroundColor: isDragOver ? 'action.hover' : 'transparent',
                      borderRadius: 1,
                      p: 1.5,
                      mb: 1.5,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' },
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 28, color: isDragOver ? 'primary.main' : 'grey.500', mb: 0.5 }} />
                    <Typography variant="caption" display="block" color="text.secondary">
                      Drop photos here or click to upload
                    </Typography>
                    <input
                      ref={(el) => { fileInputRefs.current[stage] = el; }}
                      hidden
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileInput(stage)}
                    />
                  </Box>
                )}

                {stageProgress && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Uploading {stageProgress.done}/{stageProgress.total}...
                    </Typography>
                    <LinearProgress variant="determinate" value={(stageProgress.done / stageProgress.total) * 100} sx={{ mt: 0.5 }} />
                  </Box>
                )}

                <Stack direction="row" spacing={1}>
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
