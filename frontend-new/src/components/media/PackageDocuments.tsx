import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Trash2, Upload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MainPageSection } from '@/components/layout';
import { EmptyState } from '@/components/feedback';
import { getJson, deleteJson, uploadMultipart } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';

// Mirror of backend constraints (PackagesController documents endpoints):
// max 20 MB, PDF / Word / Excel / PowerPoint only.
const MAX_SIZE_MB = 20;
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

interface PackageDocument {
  id: number;
  fileName: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
  notes?: string | null;
  uploadedAt: string;
}

interface PackageDocumentsProps {
  packageId: string;
  canWrite: boolean;
}

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export function PackageDocuments({ packageId, canWrite }: PackageDocumentsProps) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const docs = useLoader<PackageDocument[]>(() =>
    getJson<PackageDocument[]>(`/api/packages/${packageId}/documents`),
  );
  useInitializeFunction([docs.reload], [packageId]);

  const upload = async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File exceeds ${MAX_SIZE_MB} MB.`);
      return;
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error('Only PDF, Word, Excel and PowerPoint files are allowed.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await uploadMultipart(`/api/packages/${packageId}/documents`, fd);
      toast.success('Document uploaded');
      await docs.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setUploading(false);
    }
  };

  const remove = (doc: PackageDocument) => {
    dispatch(
      OpenConfirmation({
        title: 'Delete Document',
        message: `Delete "${doc.fileName}"? This cannot be undone.`,
        destructive: true,
        confirmText: 'Delete',
        onSubmit: async () => {
          try {
            await deleteJson(`/api/packages/${packageId}/documents/${doc.id}`);
            toast.success('Document deleted');
            await docs.reload();
          } catch (e) {
            toast.error(parseApiError(e).message);
          }
        },
      }),
    );
  };

  return (
    <MainPageSection
      title="Documents"
      actions={
        canWrite ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_MIME.join(',')}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = '';
              }}
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Upload className="mr-1 size-4" />
              )}
              Upload
            </Button>
          </>
        ) : null
      }
    >
      <p className="text-xs text-muted-foreground mb-3">
        PDF, Word, Excel or PowerPoint — max {MAX_SIZE_MB} MB.
      </p>
      {(docs.data ?? []).length === 0 ? (
        <EmptyState message="No documents yet." icon={<FileText className="size-10" strokeWidth={1.4} />} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(docs.data ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[40vw] sm:max-w-xs">{d.fileName}</span>
                </TableCell>
                <TableCell>{formatSize(d.sizeBytes)}</TableCell>
                <TableCell>{new Date(d.uploadedAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" asChild aria-label="Download">
                    <a href={d.publicUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="size-4" />
                    </a>
                  </Button>
                  {canWrite && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => remove(d)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </MainPageSection>
  );
}
