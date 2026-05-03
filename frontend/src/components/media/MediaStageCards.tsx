import { ChangeEvent, DragEvent, useCallback, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, { done: number; total: number }>>({});
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const uploadSingleFile = useCallback(
    (stage: string, file: File) => {
      const fd = new FormData();
      fd.append('stage', stage);
      fd.append('file', file);
      return uploadMultipart(`/api/packages/${packageId}/media`, fd);
    },
    [packageId],
  );

  const uploadMultipleFiles = useCallback(
    async (stage: string, files: File[]) => {
      if (files.length === 0) return;
      setUploadProgress((prev) => ({ ...prev, [stage]: { done: 0, total: files.length } }));
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        try {
          await uploadSingleFile(stage, files[i]);
        } catch {
          failed++;
        }
        setUploadProgress((prev) => ({ ...prev, [stage]: { done: i + 1, total: files.length } }));
      }
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[stage];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId, 'media'] });
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
      if (failed === 0) {
        toast.success(`${files.length} photo${files.length !== 1 ? 's' : ''} uploaded`);
      } else {
        toast.warning(`${files.length - failed}/${files.length} photos uploaded, ${failed} failed`);
      }
    },
    [uploadSingleFile, packageId, qc],
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
          const progress = uploadProgress[stage];
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

                {/* Drop zone */}
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

                {progress && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Uploading {progress.done}/{progress.total}...
                    </Typography>
                    <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} sx={{ mt: 0.5 }} />
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
