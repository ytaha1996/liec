import { ChangeEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Link as MuiLink,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, api, getJson, postJson, putJson, uploadMultipart } from '../../api/client';
import { useAppDispatch } from '../../redux/hooks';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import EditIcon from '@mui/icons-material/Edit';
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

const buildItemFields = (initial?: Record<string, any>): Record<string, DynamicFieldTypes> => ({
  goodId: {
    type: DynamicField.NUMBER,
    name: 'goodId',
    title: 'Good ID',
    required: true,
    disabled: false,
    value: initial?.goodId ?? '',
  },
  quantity: {
    type: DynamicField.NUMBER,
    name: 'quantity',
    title: 'Quantity',
    required: true,
    disabled: false,
    value: initial?.quantity ?? '',
  },
  weightKg: {
    type: DynamicField.NUMBER,
    name: 'weightKg',
    title: 'Weight (Kg)',
    required: true,
    disabled: false,
    value: initial?.weightKg ?? '',
  },
  volumeM3: {
    type: DynamicField.NUMBER,
    name: 'volumeM3',
    title: 'Volume (M3)',
    required: true,
    disabled: false,
    value: initial?.volumeM3 ?? '',
  },
});

const PackageDetailPage = ({ id }: Props) => {
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateError | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(null);
  const [photoStage, setPhotoStage] = useState('Receiving');
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideType, setOverrideType] = useState<'RatePerKg' | 'RatePerM3' | 'TotalCharge'>('RatePerKg');
  const [overrideValue, setOverrideValue] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/packages', id],
    queryFn: () => getJson<any>(`/api/packages/${id}`),
  });

  const mediaQuery = useQuery<any[]>({
    queryKey: ['/api/packages', id, 'media'],
    queryFn: () => getJson<any[]>(`/api/packages/${id}/media`),
  });

  const overridesQuery = useQuery<any[]>({
    queryKey: ['/api/packages', id, 'pricing-overrides'],
    queryFn: () => getJson<any[]>(`/api/packages/${id}/pricing-overrides`),
  });

  const applyOverride = useMutation({
    mutationFn: (payload: { overrideType: string; newValue: number; reason: string }) =>
      postJson(`/api/packages/${id}/pricing-override`, payload),
    onSuccess: () => {
      toast.success('Pricing override applied');
      qc.invalidateQueries({ queryKey: ['/api/packages', id] });
      qc.invalidateQueries({ queryKey: ['/api/packages', id, 'pricing-overrides'] });
      setOverrideDialogOpen(false);
      setOverrideValue('');
      setOverrideReason('');
    },
    onError: (e: any) => {
      const payload = e?.response?.data ?? {};
      toast.error(payload.message ?? 'Override failed');
    },
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

  const putItem = useMutation({
    mutationFn: ({ itemId, values }: { itemId: number; values: Record<string, any> }) =>
      putJson(`/api/packages/${id}/items/${itemId}`, {
        goodId: Number(values.goodId),
        quantity: Number(values.quantity),
        weightKg: Number(values.weightKg),
        volumeM3: Number(values.volumeM3),
      }),
    onSuccess: () => {
      toast.success('Item updated');
      qc.invalidateQueries({ queryKey: ['/api/packages', id] });
      setAddItemOpen(false);
      setEditingItem(null);
    },
    onError: () => toast.error('Update failed'),
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
      if (editingItem) await putItem.mutateAsync({ itemId: editingItem.id, values });
      else await addItem.mutateAsync(values);
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
          icon: <EditIcon fontSize="small" />,
          label: 'Edit',
          onClick: (tableId: string) => {
            const item = itemsTableData[tableId];
            if (item) { setEditingItem(item); setAddItemOpen(true); }
          },
          hidden: () => false,
        },
        {
          icon: null,
          label: 'Delete',
          onClick: (tableId: string) => {
            const item = itemsTableData[tableId];
            if (item) dispatch(OpenConfirmation({
              open: true,
              title: 'Delete Item',
              message: 'Delete this item? Package pricing will be recalculated.',
              onSubmit: () => deleteItem.mutate(item.id),
            }));
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(gate.missing ?? []).map((m) => (
                    <TableRow key={`${m.packageId}-${m.stage}`}>
                      <TableCell>
                        <MuiLink component={RouterLink} to={`/packages/${m.packageId}`}>
                          #{m.packageId}
                        </MuiLink>
                      </TableCell>
                      <TableCell>{m.stage}</TableCell>
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
                color={action === 'cancel' ? 'error' : 'primary'}
                onClick={() =>
                  action === 'cancel'
                    ? dispatch(OpenConfirmation({
                        open: true,
                        title: 'Cancel Package',
                        message: 'Are you sure you want to cancel this package? This cannot be undone.',
                        onSubmit: () => transition.mutate('cancel'),
                      }))
                    : transition.mutate(action)
                }
                disabled={transition.isPending}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </MainPageSection>

        <MainPageSection title={`Pricing Snapshot${pkg.hasPricingOverride ? ' (Override Active)' : ''}`}>
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
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography>{pkg.appliedRatePerKg ?? '-'}</Typography>
                    <Button size="small" variant="text" onClick={() => { setOverrideType('RatePerKg'); setOverrideDialogOpen(true); }}>Override</Button>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Rate Per M3</Typography>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography>{pkg.appliedRatePerM3 ?? '-'}</Typography>
                    <Button size="small" variant="text" onClick={() => { setOverrideType('RatePerM3'); setOverrideDialogOpen(true); }}>Override</Button>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Charge Amount</Typography>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <Typography>{pkg.chargeAmount ?? '-'}</Typography>
                    <Button size="small" variant="text" onClick={() => { setOverrideType('TotalCharge'); setOverrideDialogOpen(true); }}>Override</Button>
                  </Stack>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Currency</Typography>
                  <Typography>{pkg.currency ?? '-'}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          {(overridesQuery.data ?? []).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Override History</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Original</TableCell>
                    <TableCell>New</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(overridesQuery.data ?? []).map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell>{o.overrideType}</TableCell>
                      <TableCell>{o.originalValue}</TableCell>
                      <TableCell>{o.newValue}</TableCell>
                      <TableCell>{o.reason}</TableCell>
                      <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </MainPageSection>

        <MainPageSection title="Items">
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" size="small" onClick={() => { setEditingItem(null); setAddItemOpen(true); }}>
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
        title={editingItem ? 'Edit Item' : 'Add Item'}
        onClose={() => { setAddItemOpen(false); setEditingItem(null); }}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildItemFields(editingItem ?? undefined)}
          onSubmit={handleAddItemSubmit}
        />
      </GenericDialog>

      <GenericDialog
        open={overrideDialogOpen}
        title="Override Pricing"
        onClose={() => { setOverrideDialogOpen(false); setOverrideValue(''); setOverrideReason(''); }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Override Type</Typography>
            <Select
              fullWidth
              size="small"
              value={overrideType}
              onChange={(e) => setOverrideType(e.target.value as any)}
            >
              <MenuItem value="RatePerKg">Rate Per Kg</MenuItem>
              <MenuItem value="RatePerM3">Rate Per M3</MenuItem>
              <MenuItem value="TotalCharge">Total Charge</MenuItem>
            </Select>
          </Box>
          <TextField
            label="New Value"
            type="number"
            fullWidth
            size="small"
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
          />
          <TextField
            label="Reason (required)"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />
          <Stack direction="row" justifyContent="flex-end" gap={1}>
            <Button onClick={() => { setOverrideDialogOpen(false); setOverrideValue(''); setOverrideReason(''); }}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!overrideValue || !overrideReason || applyOverride.isPending}
              onClick={() => applyOverride.mutate({ overrideType, newValue: Number(overrideValue), reason: overrideReason })}
            >
              Apply Override
            </Button>
          </Stack>
        </Box>
      </GenericDialog>
    </Box>
  );
};

export default PackageDetailPage;
