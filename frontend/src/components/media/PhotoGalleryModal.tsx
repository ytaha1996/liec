import { ChangeEvent, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';
import { getJson } from '../../api/client';
import MediaGallery from './MediaGallery';
import { useMultiFileUpload } from './useMultiFileUpload';
import { useUserRole, canUploadPhotos } from '../../helpers/rbac';

interface PhotoGalleryModalProps {
  open: boolean;
  onClose: () => void;
  packageId: number;
  title?: string;
}

const STAGES = ['Receiving', 'Departure', 'Arrival', 'Other'];

const PhotoGalleryModal = ({ open, onClose, packageId, title }: PhotoGalleryModalProps) => {
  const [uploadStage, setUploadStage] = useState<string>('Receiving');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { uploadMultiple, progress, isUploading } = useMultiFileUpload(packageId);
  const role = useUserRole();
  const canUpload = canUploadPhotos(role);

  const { data: media = [] } = useQuery<any[]>({
    queryKey: ['/api/packages', packageId, 'media'],
    queryFn: () => getJson<any[]>(`/api/packages/${packageId}/media`),
    enabled: open && !!packageId,
  });

  const onFilesPicked = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) uploadMultiple(uploadStage, files);
    e.target.value = '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title ?? `Package #${packageId} Photos`}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {canUpload && (
          <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 2 }}>
            <Select
              size="small"
              value={uploadStage}
              onChange={(e) => setUploadStage(e.target.value)}
              disabled={isUploading}
              sx={{ minWidth: 140 }}
            >
              {STAGES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Upload Photos
            </Button>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/*"
              multiple
              onChange={onFilesPicked}
            />
            {progress && (
              <Typography variant="body2" color="text.secondary">
                Uploading {progress.done}/{progress.total}...
              </Typography>
            )}
          </Stack>
        )}
        <MediaGallery media={media} packageId={packageId} />
      </DialogContent>
    </Dialog>
  );
};

export default PhotoGalleryModal;
