import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MainPageTitle } from '@/components/layout';
import { postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function GroupHelperExportPage() {
  usePageTitle('Group Helper Export');
  const [pending, setPending] = useState(false);

  const exportFormat = async (format: 'csv' | 'vcf') => {
    setPending(true);
    try {
      const r = await postJson<{ publicUrl: string }>('/api/exports/group-helper', { format });
      window.open(r.publicUrl, '_blank');
      toast.success('Export generated');
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <MainPageTitle title="Group Helper Export" />
      <div className="px-4 sm:px-6 pb-6 space-y-4">
        <p>Generate WhatsApp group helper contacts for opted-in customers.</p>
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Caution</AlertTitle>
          <AlertDescription>
            WhatsApp groups reveal phone numbers to all members. Use this export carefully.
          </AlertDescription>
        </Alert>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" disabled={pending} onClick={() => exportFormat('csv')}>
            <FileDown className="mr-2 size-4" /> Export CSV
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => exportFormat('vcf')}>
            <FileDown className="mr-2 size-4" /> Export VCF
          </Button>
        </div>
      </div>
    </>
  );
}
