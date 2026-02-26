import { ChangeEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, api, getJson, postJson, uploadMultipart } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import { PhotoGallery } from '../../components/media/PhotoGallery';

interface Props {
  id: string;
}

const PKG_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft: { color: '#333', backgroundColor: '#e0e0e0' },
  Scheduled: { color: '#fff', backgroundColor: '#0288d1' },
  ReadyToDepart: { color: '#fff', backgroundColor: '#ed6c02' },
  Departed: { color: '#fff', backgroundColor: '#1565c0' },
  Arrived: { color: '#fff', backgroundColor: '#2e7d32' },
  Closed: { color: '#fff', backgroundColor: '#616161' },
  Cancelled: { color: '#fff', backgroundColor: '#c62828' },
};

const TRANSITION_ACTIONS: { label: string; action: string }[] = [
  { label: 'Receive', action: 'receive' },
  { label: 'Pack', action: 'pack' },
  { label: 'Ready To Ship', action: 'ready-to-ship' },
  { label: 'Ship', action: 'ship' },
  { label: 'Arrive Destination', action: 'arrive-destination' },
  { label: 'Ready For Handout', action: 'ready-for-handout' },
  { label: 'Handout', action: 'handout' },
  { label: 'Cancel', action: 'cancel' },
];

const PHOTO_STAGES = ['Receiving', 'Departure', 'Arrival', 'Other'];

const buildItemFields = (): Record<string, DynamicFieldTypes> => ({
  goodId: {
    type: DynamicField.NUMBER,
    name: 'goodId',
    title: 'Good ID',
    required: true,
    disabled: false,
    value: '',
  },
  quantity: {
    type: DynamicField.NUMBER,
    name: 'quantity',
    title: 'Quantity',
    required: true,
    disabled: false,
    value: '',
  },
  weightKg: {
    type: DynamicField.NUMBER,
    name: 'weightKg',
    title: 'Weight (Kg)',
    required: true,
    disabled: false,
    value: '',
  },
  volumeM3: {
    type: DynamicField.NUMBER,
    name: 'volumeM3',
    title: 'Volume (M3)',
    required: true,
    disabled: false,
    value: '',
  },
});

const PackageDetailPage = ({ id }: Props) => {
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateError | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [photoStage, setPhotoStage] = useState('Receiving');

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/packages', id],
    queryFn: () => getJson<any>(`/api/packages/${id}`),
  });

  const mediaQuery = useQuery<any[]>({
    queryKey: ['/api/packages', id, 'media'],
    queryFn: () => getJson<any[]>(`/api/packages/${id}/media`),
  });

  const transition = useMutation({
    mutationFn: (action: string) => postJson(`/api/packages/${id}/${action}`),
    onSuccess: () => {
      setGate(null);
      toast.success('Package updated');
      qc.invalidateQueries({ queryKey: ['/api/packages', id] });
    },
    onError: (e: any) => {
      const payload = e?.response?.data ?? {};
      if (payload.code === 'PHOTO_GATE_FAILED') {
        setGate(payload as GateError);
      }
      toast.error(payload.message ?? 'Transition failed');
    },
  });

  const addItem = useMutation({
    mutationFn: (values: Record<string, any>) =>
      postJson(`/api/packages/${id}/items`, {
        goodId: Number(values.goodId),
        quantity: Number(values.quantity),
        weightKg: Number(values.weightKg),
        volumeM3: Number(values.volumeM3),
      }),
    onSuccess: () => {
      toast.success('Item added');
      qc.invalidateQueries({ queryKey: ['/api/packages', id] });
      setAddItemOpen(false);
    },
    onError: () => toast.error('Add item failed'),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: number) => api.delete(`/api/packages/${id}/items/${itemId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Item deleted');
      qc.invalidateQueries({ queryKey: ['/api/packages', id] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('stage', photoStage);
      fd.append('file', file);
      return uploadMultipart(`/api/packages/${id}/media`, fd);
    },
    onSuccess: () => {
      toast.success('Photo uploaded');
      qc.invalidateQueries({ queryKey: ['/api/packages', id, 'media'] });
      qc.invalidateQueries({ queryKey: ['/api/packages', id] });
    },
    onError: () => toast.error('Upload failed'),
  });

  const handleAddItemSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await addItem.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  const items: any[] = data?.items ?? [];
  const itemsTableData = items.reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const itemHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'goodId', label: 'Good ID', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'quantity', label: 'Quantity', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'weightKg', label: 'Weight (Kg)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'volumeM3', label: 'Volume (M3)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'lineCharge', label: 'Line Charge', type: EnhancedTableColumnType.CURRENCY, numeric: true, disablePadding: false },
    {
      id: 'itemActions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      numeric: false,
      disablePadding: false,
      actions: [
        {
          icon: null,
          label: 'Delete',
          onClick: (tableId: string) => {
            const item = itemsTableData[tableId];
            if (item) deleteItem.mutate(item.id);
          },
          hidden: () => false,
        },
      ],
    },
  ];

  if (isLoading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  if (isError || !data) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Package not found.</Alert></Box>;
  }

  const pkg = data.package ?? data;

  return (
    <Box>
      <PageTitleWrapper>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: '#00A6A6' }}>
            Package #{id}
          </Typography>
          {pkg.status && (
            <Chip
              label={pkg.status}
              size="small"
              sx={{
                backgroundColor: PKG_STATUS_CHIPS[pkg.status]?.backgroundColor ?? '#e0e0e0',
                color: PKG_STATUS_CHIPS[pkg.status]?.color ?? '#333',
              }}
            />
          )}
        </Stack>
      </PageTitleWrapper>

      <Box sx={{ px: 3, pb: 3 }}>
        <MainPageSection title="Status Transitions">
          {gate?.code === 'PHOTO_GATE_FAILED' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {gate.message}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Package</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Link</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(gate.missing ?? []).map((m) => (
                    <TableRow key={`${m.packageId}-${m.stage}`}>
                      <TableCell>{m.packageId}</TableCell>
                      <TableCell>{m.stage}</TableCell>
                      <TableCell>
                        <Button component={Link} to={`/packages/${m.packageId}`} size="small">Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Alert>
          )}
          <Stack direction="row" gap={1} flexWrap="wrap">
            {TRANSITION_ACTIONS.map(({ label, action }) => (
              <Button
                key={action}
                variant="outlined"
                onClick={() => transition.mutate(action)}
                disabled={transition.isPending}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </MainPageSection>

        <MainPageSection title="Pricing Snapshot">
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Weight (Kg)</Typography>
                  <Typography>{pkg.totalWeightKg ?? '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total Volume (M3)</Typography>
                  <Typography>{pkg.totalVolumeM3 ?? '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Rate Per Kg</Typography>
                  <Typography>{pkg.appliedRatePerKg ?? '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Rate Per M3</Typography>
                  <Typography>{pkg.appliedRatePerM3 ?? '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Charge Amount</Typography>
                  <Typography>{pkg.chargeAmount ?? '-'}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Currency</Typography>
                  <Typography>{pkg.currency ?? '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </MainPageSection>

        <MainPageSection title="Items">
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" size="small" onClick={() => setAddItemOpen(true)}>
              Add Item
            </Button>
          </Box>
          <EnhancedTable
            title="Package Items"
            header={itemHeaders}
            data={itemsTableData}
            defaultOrder="goodId"
          />
        </MainPageSection>

        <MainPageSection title="Upload Photo">
          <Stack direction="row" gap={2} alignItems="center" flexWrap="wrap">
            <TextField
              select
              label="Stage"
              size="small"
              value={photoStage}
              onChange={(e) => setPhotoStage(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {PHOTO_STAGES.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
            <Button component="label" variant="outlined">
              Upload Photo
              <input
                hidden
                type="file"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (file) upload.mutate(file);
                }}
              />
            </Button>
          </Stack>
        </MainPageSection>

        <MainPageSection title="Photo Gallery">
          <PhotoGallery media={mediaQuery.data ?? []} />
        </MainPageSection>
      </Box>

      <GenericDialog
        open={addItemOpen}
        title="Add Item"
        onClose={() => setAddItemOpen(false)}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildItemFields()}
          onSubmit={handleAddItemSubmit}
        />
      </GenericDialog>
    </Box>
  );
};

export default PackageDetailPage;
