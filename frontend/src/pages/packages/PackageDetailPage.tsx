import { ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageActionsSection, { PageAction } from '../../components/layout-components/main-layout/PageActionsSection';
import DetailPageLayout from '../../components/layout-components/main-layout/DetailPageLayout';
import { PhotoGallery } from '../../components/media/PhotoGallery';
import InformationWidget, { InformationWidgetFieldTypes, IInformationWidgetField } from '../../components/information-widget';
import PricingOverrideHistory from '../../components/pricing/PricingOverrideHistory';
import Loader from '../../components/Loader';
import { PKG_STATUS_CHIPS } from '../../constants/statusColors';

interface Props {
  id: string;
}

// Allowed next transitions per package status, based on TransitionRuleService
const ALLOWED_TRANSITIONS: Record<string, { label: string; action: string; isCancel?: boolean }[]> = {
  Draft: [
    { label: 'Receive', action: 'receive' },
    { label: 'Cancel', action: 'cancel', isCancel: true },
  ],
  Received: [
    { label: 'Pack', action: 'pack' },
    { label: 'Cancel', action: 'cancel', isCancel: true },
  ],
  Packed: [
    { label: 'Ready To Ship', action: 'ready-to-ship' },
    { label: 'Cancel', action: 'cancel', isCancel: true },
  ],
  ReadyToShip: [
    { label: 'Ship', action: 'ship' },
    { label: 'Cancel', action: 'cancel', isCancel: true },
  ],
  Shipped: [{ label: 'Arrive Destination', action: 'arrive-destination' }],
  ArrivedAtDestination: [{ label: 'Ready For Handout', action: 'ready-for-handout' }],
  ReadyForHandout: [{ label: 'Handout', action: 'handout' }],
  HandedOut: [],
  Cancelled: [],
};

const PKG_INFO_FIELDS: IInformationWidgetField[] = [
  { type: InformationWidgetFieldTypes.Text, name: 'shipmentId', title: 'Shipment ID', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'customer', title: 'Customer', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'provisionMethod', title: 'Provision Method', width: 'third' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'createdAt', title: 'Created At', width: 'third' },
];

const PHOTO_STAGES = ['Receiving', 'Departure', 'Arrival', 'Other'];

const buildItemFields = (initial: Record<string, any> | undefined, goodsItems: Record<string, string>): Record<string, DynamicFieldTypes> => ({
  goodTypeId: {
    type: DynamicField.SELECT,
    name: 'goodTypeId',
    title: 'Good Type',
    required: true,
    disabled: false,
    items: goodsItems,
    value: String(initial?.goodTypeId ?? ''),
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
  const navigate = useNavigate();
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

  const goodsQuery = useQuery<any[]>({
    queryKey: ['/api/good-types'],
    queryFn: () => getJson<any[]>('/api/good-types'),
  });

  const customersQuery = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
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
        goodTypeId: Number(values.goodTypeId),
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
        goodTypeId: Number(values.goodTypeId),
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

  const goodsItems: Record<string, string> = (goodsQuery.data ?? []).reduce(
    (acc: Record<string, string>, g: any) => { acc[String(g.id)] = g.nameEn; return acc; }, {},
  );
  const goodsMap: Record<number, string> = (goodsQuery.data ?? []).reduce(
    (acc: Record<number, string>, g: any) => { acc[g.id] = g.nameEn; return acc; }, {},
  );
  const customersMap: Record<number, string> = (customersQuery.data ?? []).reduce(
    (acc: Record<number, string>, c: any) => { acc[c.id] = c.name; return acc; }, {},
  );

  const items: any[] = data?.items ?? [];
  const itemsTableData = items.reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = { ...item, goodName: item.goodTypeName || goodsMap[item.goodTypeId] || `#${item.goodTypeId}` };
    return acc;
  }, {});

  const itemHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'goodName', label: 'Good', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
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
    return <Loader />;
  }

  if (isError || !data) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Package not found.</Alert></Box>;
  }

  const pkg = data.package ?? data;
  const pkgDisplay = { ...pkg, customer: customersMap[pkg.customerId] ?? `#${pkg.customerId}` };

  const pricingFields: IInformationWidgetField[] = [
    { type: InformationWidgetFieldTypes.Text, name: 'totalWeightKg', title: 'Total Weight (Kg)', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'totalVolumeM3', title: 'Total Volume (M3)', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'currency', title: 'Currency', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'appliedRatePerKg', title: 'Rate Per Kg', width: 'third', action: { label: 'Override', onClick: () => { setOverrideType('RatePerKg'); setOverrideDialogOpen(true); } } },
    { type: InformationWidgetFieldTypes.Text, name: 'appliedRatePerM3', title: 'Rate Per M3', width: 'third', action: { label: 'Override', onClick: () => { setOverrideType('RatePerM3'); setOverrideDialogOpen(true); } } },
    { type: InformationWidgetFieldTypes.Text, name: 'chargeAmount', title: 'Charge Amount', width: 'third', action: { label: 'Override', onClick: () => { setOverrideType('TotalCharge'); setOverrideDialogOpen(true); } } },
  ];

  const transitionActions: PageAction[] = (ALLOWED_TRANSITIONS[pkg.status] ?? []).map(
    ({ label, action, isCancel }) => ({
      label,
      action,
      color: (isCancel ? 'error' : 'primary') as PageAction['color'],
      onClick: isCancel
        ? () =>
            dispatch(
              OpenConfirmation({
                open: true,
                title: 'Cancel Package',
                message: 'Are you sure you want to cancel this package? This cannot be undone.',
                onSubmit: () => transition.mutate('cancel'),
              }),
            )
        : () => transition.mutate(action),
    }),
  );

  return (
    <>
    <Box sx={{ px: 3, pt: 2 }}>
      <Button variant="text" size="small" startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/ops/packages')} sx={{ color: 'text.secondary' }}>
        All Packages
      </Button>
    </Box>
    <DetailPageLayout
      title={`Package #${id}`}
      chips={
        pkg.status && (
          <Chip
            label={pkg.status}
            size="small"
            sx={{
              backgroundColor: PKG_STATUS_CHIPS[pkg.status]?.backgroundColor ?? '#e0e0e0',
              color: PKG_STATUS_CHIPS[pkg.status]?.color ?? '#333',
            }}
          />
        )
      }
    >
        <InformationWidget title="Package Info" fields={PKG_INFO_FIELDS} data={pkgDisplay} />

        <PageActionsSection
          title="Status Transitions"
          actions={transitionActions}
          isPending={transition.isPending}
        >
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
                        <MuiLink component={RouterLink} to={`/ops/packages/${m.packageId}`}>
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
        </PageActionsSection>

        <InformationWidget
          title={`Pricing Snapshot${pkg.hasPricingOverride ? ' (Override Active)' : ''}`}
          fields={pricingFields}
          data={pkg}
        >
          <PricingOverrideHistory overrides={overridesQuery.data ?? []} />
        </InformationWidget>

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
            defaultOrder="goodName"
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
    </DetailPageLayout>

      <GenericDialog
        open={addItemOpen}
        title={editingItem ? 'Edit Item' : 'Add Item'}
        onClose={() => { setAddItemOpen(false); setEditingItem(null); }}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildItemFields(editingItem ?? undefined, goodsItems)}
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
    </>
  );
};

export default PackageDetailPage;
