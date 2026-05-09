import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { uploadMultipart } from '../../api/client';

export interface UploadProgress {
  done: number;
  total: number;
}

export const useMultiFileUpload = (packageId: string | number) => {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadSingle = useCallback(
    (stage: string, file: File) => {
      const fd = new FormData();
      fd.append('stage', stage);
      fd.append('file', file);
      return uploadMultipart(`/api/packages/${packageId}/media`, fd);
    },
    [packageId],
  );

  const uploadMultiple = useCallback(
    async (stage: string, files: File[]) => {
      if (files.length === 0) return;
      setProgress({ done: 0, total: files.length });
      let failed = 0;
      for (let i = 0; i < files.length; i++) {
        try {
          await uploadSingle(stage, files[i]);
        } catch {
          failed++;
        }
        setProgress({ done: i + 1, total: files.length });
      }
      setProgress(null);
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId, 'media'] });
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
      if (failed === 0) {
        toast.success(`${files.length} photo${files.length !== 1 ? 's' : ''} uploaded`);
      } else {
        toast.warning(`${files.length - failed}/${files.length} photos uploaded, ${failed} failed`);
      }
    },
    [uploadSingle, packageId, qc],
  );

  return { uploadMultiple, progress, isUploading: progress !== null };
};
