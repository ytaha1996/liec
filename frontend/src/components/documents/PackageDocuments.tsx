import { ChangeEvent, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { api, getJson, uploadMultipart, parseApiError } from '../../api/client';
import { useUserRole, canManageShipments } from '../../helpers/rbac';
import { useAppDispatch } from '../../redux/hooks';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import MainPageSection from '../layout-components/main-layout/MainPageSection';
import { formatDateTime } from '../../helpers/formatting-utils';

interface PackageDocument {
  id: number;
  fileName: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  notes?: string | null;
  uploadedByAdminUserId?: number | null;
  uploadedAt: string;
}

interface Props {
  packageId: string | number;
}

const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024; // 20 MB — matches backend cap
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
// `accept` attribute hint for the OS file picker. The runtime guard below is
// the source of truth — `accept` is a hint, not enforcement.
const ACCEPT_HINT = [
  ...ALLOWED_DOCUMENT_EXTENSIONS,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
].join(',');

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const PackageDocuments = ({ packageId }: Props) => {
  const qc = useQueryClient();
  const role = useUserRole();
  const dispatch = useAppDispatch();
  const canWrite = canManageShipments(role);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: documents = [] } = useQuery<PackageDocument[]>({
    queryKey: ['/api/packages', packageId, 'documents'],
    queryFn: () => getJson<PackageDocument[]>(`/api/packages/${packageId}/documents`),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return uploadMultipart<PackageDocument>(`/api/packages/${packageId}/documents`, fd);
    },
    onSuccess: () => {
      toast.success('Document uploaded');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId, 'documents'] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Upload failed'),
  });

  const remove = useMutation({
    mutationFn: (docId: number) => api.delete(`/api/packages/${packageId}/documents/${docId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Document deleted');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId, 'documents'] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Delete failed'),
  });

  const onFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? '').toLowerCase();
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      toast.error('Only PDF, Word, Excel, and PowerPoint files are allowed.');
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(`File must be 20 MB or smaller (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      return;
    }
    upload.mutate(file);
  };

  const confirmDelete = (doc: PackageDocument) => {
    dispatch(OpenConfirmation({
      open: true,
      title: 'Delete document',
      message: `Delete "${doc.fileName}"? This cannot be undone.`,
      onSubmit: () => remove.mutate(doc.id),
    }));
  };

  return (
    <MainPageSection title="Documents">
      {canWrite && (
        <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={upload.isPending}
          >
            Upload Document
          </Button>
          <input ref={fileInputRef} hidden type="file" accept={ACCEPT_HINT} onChange={onFilePicked} />
          <Typography variant="caption" color="text.secondary">
            PDF, Word, Excel, PowerPoint — max 20 MB
          </Typography>
          {upload.isPending && (
            <Typography variant="body2" color="text.secondary">Uploading…</Typography>
          )}
        </Stack>
      )}

      {documents.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
          No documents uploaded yet.
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>File</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Uploaded</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.fileName}</TableCell>
                <TableCell>{formatSize(doc.sizeBytes)}</TableCell>
                <TableCell>{formatDateTime(doc.uploadedAt)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    title="Download"
                    onClick={() => window.open(doc.publicUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                  {canWrite && (
                    <IconButton
                      size="small"
                      color="error"
                      title="Delete"
                      onClick={() => confirmDelete(doc)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </MainPageSection>
  );
};

export default PackageDocuments;
