import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  TextField,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import { toast } from 'react-toastify';
import { api, getJson, postJson } from '../../api/client';
import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageTitleWrapper from '../../components/PageTitleWrapper';

interface Props {
  id: string;
}

const buildConsentFields = (initial?: Record<string, any>): Record<string, DynamicFieldTypes> => ({
  optInStatusUpdates: {
    type: DynamicField.CHECKBOX,
    name: 'optInStatusUpdates',
    title: 'Opt-in Status Updates',
    required: false,
    disabled: false,
    value: initial?.optInStatusUpdates ?? false,
  },
  optInDeparturePhotos: {
    type: DynamicField.CHECKBOX,
    name: 'optInDeparturePhotos',
    title: 'Opt-in Departure Photos',
    required: false,
    disabled: false,
    value: initial?.optInDeparturePhotos ?? false,
  },
  optInArrivalPhotos: {
    type: DynamicField.CHECKBOX,
    name: 'optInArrivalPhotos',
    title: 'Opt-in Arrival Photos',
    required: false,
    disabled: false,
    value: initial?.optInArrivalPhotos ?? false,
  },
});

const CustomerDetailPage = ({ id }: Props) => {
  const qc = useQueryClient();
  const [shipmentId, setShipmentId] = useState('');

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/customers', id],
    queryFn: () => getJson<any>(`/api/customers/${id}`),
  });

  const patchConsent = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      api.patch(`/api/customers/${id}/whatsapp-consent`, payload).then((r) => r.data),
    onSuccess: () => {
      toast.success('Consent updated');
      qc.invalidateQueries({ queryKey: ['/api/customers', id] });
    },
    onError: () => toast.error('Consent update failed'),
  });

  const sendWhatsApp = useMutation({
    mutationFn: (kind: 'status' | 'departure' | 'arrival') => {
      if (!shipmentId.trim()) throw new Error('Shipment ID is required');
      if (kind === 'status') {
        return postJson(`/api/customers/${id}/whatsapp/status?shipmentId=${shipmentId}`);
      }
      return postJson(`/api/customers/${id}/whatsapp/photos/${kind}?shipmentId=${shipmentId}`);
    },
    onSuccess: () => toast.success('WhatsApp message sent'),
    onError: (e: any) => toast.error(e?.message ?? 'Send failed'),
  });

  const handleConsentSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await patchConsent.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Customer not found.</Alert>
      </Box>
    );
  }

  const consent = data.whatsAppConsent ?? {};

  return (
    <Box>
      <PageTitleWrapper>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: '#00A6A6' }}>
            {data.name}
          </Typography>
          <Chip label={data.customerRef} color="primary" variant="outlined" />
          <Chip
            label={data.isActive ? 'Active' : 'Inactive'}
            color={data.isActive ? 'success' : 'default'}
            size="small"
          />
        </Stack>
      </PageTitleWrapper>

      <Box sx={{ px: 3, pb: 3 }}>
        <MainPageSection title="Info">
          <Card variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                  <Typography>{data.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Customer Ref</Typography>
                  <Typography>{data.customerRef}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Primary Phone</Typography>
                  <Typography>{data.primaryPhone}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography>{data.email ?? '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Is Active</Typography>
                  <Chip
                    label={data.isActive ? 'Active' : 'Inactive'}
                    color={data.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    WhatsApp Consent Flags
                  </Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Chip
                      label={`Status: ${consent.optInStatusUpdates ? 'Yes' : 'No'}`}
                      color={consent.optInStatusUpdates ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={`Departure Photos: ${consent.optInDeparturePhotos ? 'Yes' : 'No'}`}
                      color={consent.optInDeparturePhotos ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip
                      label={`Arrival Photos: ${consent.optInArrivalPhotos ? 'Yes' : 'No'}`}
                      color={consent.optInArrivalPhotos ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </MainPageSection>

        <MainPageSection title="WhatsApp Consent">
          <DynamicFormWidget
            title=""
            drawerMode
            fields={buildConsentFields(consent)}
            onSubmit={handleConsentSubmit}
          />
        </MainPageSection>

        <MainPageSection title="Individual WhatsApp">
          <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              label="Shipment ID"
              size="small"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              sx={{ minWidth: 160 }}
            />
            <Button
              variant="outlined"
              onClick={() => sendWhatsApp.mutate('status')}
              disabled={sendWhatsApp.isPending}
            >
              Status
            </Button>
            <Button
              variant="outlined"
              onClick={() => sendWhatsApp.mutate('departure')}
              disabled={sendWhatsApp.isPending}
            >
              Departure Photos
            </Button>
            <Button
              variant="outlined"
              onClick={() => sendWhatsApp.mutate('arrival')}
              disabled={sendWhatsApp.isPending}
            >
              Arrival Photos
            </Button>
          </Stack>
        </MainPageSection>
      </Box>
    </Box>
  );
};

export default CustomerDetailPage;
