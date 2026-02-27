import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Link as MuiLink,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, getJson, patchJson, postJson } from '../../api/client';
import { useAppDispatch } from '../../redux/hooks';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import DetailPageLayout from '../../components/layout-components/main-layout/DetailPageLayout';
import { MainPageAction } from '../../components/layout-components/main-layout/MainPageTitle';
import { PhotoGallery } from '../../components/media/PhotoGallery';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import GenericDrawer from '../../components/drawer/GenericDrawer';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';
import InformationWidget, { InformationWidgetFieldTypes, IInformationWidgetField } from '../../components/information-widget';
import Loader from '../../components/Loader';
import { BOOL_CHIPS, PKG_STATUS_CHIPS, SHIPMENT_STATUS_CHIPS } from '../../constants/statusColors';

interface Props {
  id: string;
}

// Allowed next transitions per shipment status, based on TransitionRuleService
const ALLOWED_TRANSITIONS: Record<string, { label: string; action: string; isCancel?: boolean; confirmMessage: string }[]> = {
  Draft: [
    { label: 'Schedule', action: 'schedule', confirmMessage: 'Schedule this shipment? It will be locked for departure preparation.' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this shipment? This cannot be undone.' },
  ],
  Scheduled: [
    { label: 'Ready To Depart', action: 'ready-to-depart', confirmMessage: 'Mark this shipment as Ready To Depart?' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this shipment? This cannot be undone.' },
  ],
  ReadyToDepart: [{ label: 'Depart', action: 'depart', confirmMessage: 'Mark this shipment as Departed? Ensure all packages have departure photos.' }],
  Departed: [{ label: 'Arrive', action: 'arrive', confirmMessage: 'Mark this shipment as Arrived?' }],
  Arrived: [{ label: 'Close', action: 'close', confirmMessage: 'Close this shipment? This is final.' }],
  Closed: [],
  Cancelled: [],
};

const SHIPMENT_INFO_FIELDS: IInformationWidgetField[] = [
  { type: InformationWidgetFieldTypes.Text, name: 'refCode', title: 'Ref Code', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'tiiuCode', title: 'TIIU Code', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'originWarehouse', title: 'Origin', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'destinationWarehouse', title: 'Destination', width: 'third' },
  { type: InformationWidgetFieldTypes.Date, name: 'plannedDepartureDate', title: 'Planned Departure', width: 'third' },
  { type: InformationWidgetFieldTypes.Date, name: 'plannedArrivalDate', title: 'Planned Arrival', width: 'third' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'actualDepartureAt', title: 'Actual Departure', width: 'third' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'actualArrivalAt', title: 'Actual Arrival', width: 'third' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'createdAt', title: 'Created At', width: 'third' },
];

const CAN_ADD_PACKAGE = new Set(['Draft', 'Scheduled']);
const CAN_EDIT_SHIPMENT = new Set(['Draft', 'Scheduled']);

const ShipmentDetailPage = ({ id }: Props) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateError | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [addPkgOpen, setAddPkgOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/shipments', id],
    queryFn: () => getJson<any>(`/api/shipments/${id}`),
  });

  const mediaQuery = useQuery<any[]>({
    queryKey: ['/api/shipments', id, 'media'],
    queryFn: () => getJson<any[]>(`/api/shipments/${id}/media`),
  });

  const packagesQuery = useQuery<any[]>({
    queryKey: ['/api/packages'],
    queryFn: () => getJson<any[]>('/api/packages'),
  });

  const customersQuery = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const warehousesQuery = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    queryFn: () => getJson<any[]>('/api/warehouses'),
  });

  const customersMap = (customersQuery.data ?? []).reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

  const customersItems = (customersQuery.data ?? []).reduce((acc: Record<string, string>, c: any) => {
    acc[String(c.id)] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

  const warehousesMap = (warehousesQuery.data ?? []).reduce((acc: Record<number, string>, w: any) => {
    acc[w.id] = `${w.name} (${w.code})`;
    return acc;
  }, {});

  const addPackageFields: Record<string, DynamicFieldTypes> = {
    customerId: {
      type: DynamicField.SELECT,
      name: 'customerId',
      title: 'Customer',
      required: true,
      disabled: false,
      items: customersItems,
      value: '',
    },
    provisionMethod: {
      type: DynamicField.SELECT,
      name: 'provisionMethod',
      title: 'Provision Method',
      required: true,
      disabled: false,
      items: { CustomerProvided: 'Customer Provided', ProcuredForCustomer: 'Procured For Customer' },
      value: 'CustomerProvided',
    },
  };

  const createPackage = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      postJson<any>(`/api/shipments/${id}/packages`, {
        customerId: Number(payload.customerId),
        provisionMethod: payload.provisionMethod,
        supplyOrderId: null,
      }),
    onSuccess: (result: any) => {
      toast.success('Package created');
      qc.invalidateQueries({ queryKey: ['/api/packages'] });
      setAddPkgOpen(false);
      navigate(`/ops/packages/${result.id}`);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Failed to create package');
    },
  });

  const shipmentPackages = (packagesQuery.data ?? []).filter(
    (p) => String(p.shipmentId) === String(id),
  );

  const packageTableData = shipmentPackages.reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = {
      ...item,
      customer: customersMap[item.customerId] ?? `#${item.customerId}`,
      hasDeparturePhotos: String(item.hasDeparturePhotos),
      hasArrivalPhotos: String(item.hasArrivalPhotos),
    };
    return acc;
  }, {});

  const packageHeadersWithNav: EnhanceTableHeaderTypes[] = [
    {
      id: 'id',
      label: 'Package ID',
      type: EnhancedTableColumnType.Clickable,
      numeric: false,
      disablePadding: false,
      onClick: (_tableId: string, row: Record<string, any>) => navigate(`/ops/packages/${row.id}`),
    },
    { id: 'customer', label: 'Customer', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: PKG_STATUS_CHIPS,
      chipLabels: {},
    },
    {
      id: 'hasDeparturePhotos',
      label: 'Departure Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: BOOL_CHIPS,
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'hasArrivalPhotos',
      label: 'Arrival Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: BOOL_CHIPS,
      chipLabels: { true: 'Yes', false: 'No' },
    },
  ];

  const move = useMutation({
    mutationFn: (action: string) => postJson(`/api/shipments/${id}/${action}`),
    onSuccess: () => {
      setGate(null);
      toast.success('Shipment updated');
      qc.invalidateQueries({ queryKey: ['/api/shipments', id] });
    },
    onError: (e: any) => {
      const payload = e?.response?.data ?? {};
      if (payload.code === 'PHOTO_GATE_FAILED') {
        setGate(payload as GateError);
      }
      toast.error(payload.message ?? 'Transition failed');
    },
  });

  const updateShipment = useMutation({
    mutationFn: (values: Record<string, any>) =>
      patchJson(`/api/shipments/${id}`, {
        tiiuCode: values.tiiuCode || null,
        plannedDepartureDate: values.plannedDepartureDate || null,
        plannedArrivalDate: values.plannedArrivalDate || null,
      }),
    onSuccess: () => {
      toast.success('Shipment info updated');
      qc.invalidateQueries({ queryKey: ['/api/shipments', id] });
      setEditDrawerOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Update failed');
    },
  });

  const syncTracking = useMutation({
    mutationFn: (code: string) => postJson(`/api/shipments/${id}/tracking/sync`, { code }),
    onSuccess: () => { toast.success('Tracking synced'); qc.invalidateQueries({ queryKey: ['/api/shipments', id] }); },
    onError: () => toast.error('Tracking sync failed'),
  });

  const sendBulk = useMutation({
    mutationFn: (kind: 'status' | 'departure' | 'arrival') => {
      if (kind === 'status') return postJson(`/api/shipments/${id}/whatsapp/status/bulk`);
      return postJson(`/api/shipments/${id}/whatsapp/photos/${kind}/bulk`);
    },
    onSuccess: () => toast.success('Bulk campaign created'),
    onError: () => toast.error('Bulk send failed'),
  });

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !data) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Shipment not found.</Alert></Box>;
  }

  const shipmentDisplayData = {
    ...data,
    originWarehouse: warehousesMap[data.originWarehouseId] ?? `#${data.originWarehouseId}`,
    destinationWarehouse: warehousesMap[data.destinationWarehouseId] ?? `#${data.destinationWarehouseId}`,
  };

  const editInfoActions = CAN_EDIT_SHIPMENT.has(data.status)
    ? [{ key: 'edit', title: 'Edit Info', onClick: () => setEditDrawerOpen(true) }]
    : [];

  const editFields: Record<string, DynamicFieldTypes> = {
    tiiuCode: {
      type: DynamicField.TEXT,
      name: 'tiiuCode',
      title: 'TIIU Code',
      required: false,
      disabled: false,
      value: data.tiiuCode ?? '',
    },
    plannedDepartureDate: {
      type: DynamicField.DATE,
      name: 'plannedDepartureDate',
      title: 'Planned Departure Date',
      required: true,
      disabled: false,
      value: data.plannedDepartureDate ?? null,
    },
    plannedArrivalDate: {
      type: DynamicField.DATE,
      name: 'plannedArrivalDate',
      title: 'Planned Arrival Date',
      required: true,
      disabled: false,
      value: data.plannedArrivalDate ?? null,
    },
  };

  // Build title actions from transitions — all with confirmation
  const titleActions: MainPageAction[] = (ALLOWED_TRANSITIONS[data.status] ?? []).map(
    ({ label, action, isCancel, confirmMessage }) => ({
      label,
      disabled: move.isPending,
      ...(isCancel
        ? { backgroundColor: '#d32f2f', color: '#fff' }
        : {}),
      onClick: () =>
        dispatch(
          OpenConfirmation({
            open: true,
            title: label,
            message: confirmMessage,
            onSubmit: () => move.mutate(action),
          }),
        ),
    }),
  );

  const statusChip = (
    <Chip
      label={data.status}
      size="small"
      sx={{
        backgroundColor: SHIPMENT_STATUS_CHIPS[data.status]?.backgroundColor ?? '#e0e0e0',
        color: SHIPMENT_STATUS_CHIPS[data.status]?.color ?? '#333',
      }}
    />
  );

  return (
    <>
      <Box sx={{ px: 3, pt: 2 }}>
        <Button variant="text" size="small" startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/ops/shipments')} sx={{ color: 'text.secondary' }}>
          All Shipments
        </Button>
      </Box>
      <DetailPageLayout
        title={`Shipment ${data.refCode}`}
        chips={statusChip}
        actions={titleActions}
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

        <InformationWidget title="Shipment Info" fields={SHIPMENT_INFO_FIELDS} data={shipmentDisplayData} actions={editInfoActions} />

        {(data.maxWeightKg > 0 || data.maxCbm > 0) && (
          <MainPageSection title="Container Capacity">
            {data.maxWeightKg > 0 && (() => {
              const pct = Math.min((data.totalWeightKg / data.maxWeightKg) * 100, 100);
              return (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Weight: {data.totalWeightKg} / {data.maxWeightKg} kg ({pct.toFixed(1)}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={pct >= 90 ? 'error' : pct >= 80 ? 'warning' : 'primary'}
                  />
                </Box>
              );
            })()}
            {data.maxCbm > 0 && (() => {
              const pct = Math.min((data.totalCbm / data.maxCbm) * 100, 100);
              return (
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    CBM: {data.totalCbm} / {data.maxCbm} ({pct.toFixed(1)}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={pct >= 90 ? 'error' : pct >= 80 ? 'warning' : 'primary'}
                  />
                </Box>
              );
            })()}
          </MainPageSection>
        )}

        <MainPageSection title="External Tracking Sync">
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <TextField size="small" label="Tracking code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
            <Button variant="outlined" onClick={() => syncTracking.mutate(trackingCode)} disabled={syncTracking.isPending || !trackingCode.trim()}>Sync Tracking</Button>
            <Typography variant="body2">Current: {data.externalTrackingCode ?? '-'} / ETA: {data.externalEstimatedArrivalAt ? new Date(data.externalEstimatedArrivalAt).toLocaleString() : '-'}</Typography>
          </Stack>
        </MainPageSection>

        <MainPageSection title="WhatsApp Bulk Actions">
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => sendBulk.mutate('status')} disabled={sendBulk.isPending}>
              Status Bulk
            </Button>
            <Button variant="outlined" onClick={() => sendBulk.mutate('departure')} disabled={sendBulk.isPending}>
              Departure Bulk
            </Button>
            <Button variant="outlined" onClick={() => sendBulk.mutate('arrival')} disabled={sendBulk.isPending}>
              Arrival Bulk
            </Button>
          </Stack>
        </MainPageSection>

        <MainPageSection title="Packages">
          {CAN_ADD_PACKAGE.has(data.status) && (
            <Box sx={{ mb: 2 }}>
              <Button variant="contained" size="small" onClick={() => setAddPkgOpen(true)}>
                + Add Package
              </Button>
            </Box>
          )}
          <EnhancedTable
            title="Packages in Shipment"
            header={packageHeadersWithNav}
            data={packageTableData}
            defaultOrder="id"
          />
        </MainPageSection>

        <MainPageSection title="Photos">
          <PhotoGallery media={mediaQuery.data ?? []} />
        </MainPageSection>
      </DetailPageLayout>

      <GenericDialog
        open={addPkgOpen}
        title="Add Package to Shipment"
        onClose={() => setAddPkgOpen(false)}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={addPackageFields}
          onSubmit={async (values) => {
            try {
              await createPackage.mutateAsync(values);
              return true;
            } catch {
              return false;
            }
          }}
        />
      </GenericDialog>

      <GenericDrawer
        open={editDrawerOpen}
        title="Edit Shipment Info"
        onClose={() => setEditDrawerOpen(false)}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={editFields}
          onSubmit={async (values) => {
            try {
              await updateShipment.mutateAsync(values);
              return true;
            } catch {
              return false;
            }
          }}
        />
      </GenericDrawer>
    </>
  );
};

export default ShipmentDetailPage;
