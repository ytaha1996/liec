import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import { postJson } from '../../api/client';

const GroupHelperExportPage = () => {
  const exportMut = useMutation({
    mutationFn: (format: 'csv' | 'vcf') =>
      postJson<{ publicUrl: string }>('/api/exports/group-helper', { format }),
    onSuccess: (r: any) => {
      window.open(r.publicUrl, '_blank');
      toast.success('Export generated');
    },
    onError: () => toast.error('Export failed'),
  });

  return (
    <Box>
      <MainPageTitle title="Group Helper Export" />
      <Box sx={{ px: 3, pb: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Generate WhatsApp group helper contacts for opted-in customers.
        </Typography>
        <Alert severity="warning" sx={{ mb: 2 }}>
          WhatsApp groups reveal phone numbers to all members. Use this export carefully.
        </Alert>
        <Stack direction="row" gap={2}>
          <Button variant="outlined" onClick={() => exportMut.mutate('csv')} disabled={exportMut.isPending}>
            Export CSV
          </Button>
          <Button variant="outlined" onClick={() => exportMut.mutate('vcf')} disabled={exportMut.isPending}>
            Export VCF
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default GroupHelperExportPage;
