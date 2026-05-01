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
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, getJson, postJson } from '../../api/client';
import { useAppDispatch } from '../../redux/hooks';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhanceTableHeaderTypes, EnhancedTableColumnType, ITableMenuAction } from '../../components/enhanced-table';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import DetailPageLayout from '../../components/layout-components/main-layout/DetailPageLayout';
import { MainPageAction } from '../../components/layout-components/main-layout/MainPageTitle';
import PhotoGalleryModal from '../../components/media/PhotoGalleryModal';
import InformationWidget, { InformationWidgetFieldTypes, IInformationWidgetField } from '../../components/information-widget';
import Loader from '../../components/Loader';
import { BOOL_CHIPS, PKG_STATUS_CHIPS, SHIPMENT_STATUS_CHIPS } from '../../constants/statusColors';
import { SHIPMENT_STATUS_LABELS, PKG_STATUS_LABELS } from '../../constants/statusLabels';
import AddPackageDialog from './components/AddPackageDialog';
import EditShipmentDrawer from './components/EditShipmentDrawer';
import ReadyToDepartPreviewDialog from './components/ReadyToDepartPreviewDialog';
import WhatsAppCampaignCards from './components/WhatsAppCampaignCards';
import { useUserRole, canManageShipments, canSendWhatsApp, canExport } from '../../helpers/rbac';

interface Props {
  id: string;
}

const ALLOWED_TRANSITIONS: Record<string, { label: string; action: string; isCancel?: boolean; confirmMessage: string; useRtdPreview?: boolean }[]> = {
  Draft: [
    { label: 'Schedule', action: 'schedule', confirmMessage: 'Schedule this shipment? It will be locked for departure preparation.' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this shipment? This cannot be undone.' },
  ],
  Scheduled: [
    { label: 'Ready To Depart', action: 'ready-to-depart', confirmMessage: '', useRtdPreview: true },
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
const EXPORTABLE_STATUSES = new Set(['ReadyToDepart', 'Departed', 'Arrived', 'Closed']);

const ShipmentDetailPage = ({ id }: Props) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const role = useUserRole();
  const [gate, setGate] = useState<GateError | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [addPkgOpen, setAddPkgOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [photosPkgId, setPhotosPkgId] = useState<number | null>(null);
  const [rtdPreview, setRtdPreview] = useState<any>(null);

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/shipments', id],
    queryFn: () => getJson<any>(`/api/shipments/${id}`),
  });

  const auditQuery = useQuery<any[]>({
    queryKey: ['/api/shipments', id, 'audit-log'],
    queryFn: () => getJson<any[]>(`/api/shipments/${id}/audit-log`),
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

  const warehousesMap = (warehousesQuery.data ?? []).reduce((acc: Record<number, string>, w: any) => {
    acc[w.id] = `${w.name} (${w.code})`;
    return acc;
  }, {});

  const shipmentPackages = (packagesQuery.data ?? []).filter(
    (p) => String(p.shipmentId) === String(id),
  );

  const packageTableData = shipmentPackages.reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = {
      ...item,
      customer: customersMap[item.customerId] ?? `#${item.customerId}`,
      hasDeparturePhotos: String(item.hasDeparturePhotos),
      hasArrivalPhotos: String(item.hasArrivalPhotos),
      chargeDisplay: item.chargeAmount > 0 ? `${Number(item.chargeAmount).toFixed(2)} ${item.currency}` : '—',
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
    { id: 'weightKg', label: 'Weight (Kg)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'cbm', label: 'CBM', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'chargeDisplay', label: 'Charge', type: EnhancedTableColumnType.TEXT, numeric: true, disablePadding: false },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: PKG_STATUS_CHIPS,
      chipLabels: PKG_STATUS_LABELS,
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
    {
      id: 'actions',
      label: '',
      type: EnhancedTableColumnType.Action,
      numeric: false,
      disablePadding: false,
      actions: [{
        icon: <PhotoLibraryIcon fontSize="small" />,
        label: 'View Photos',
        onClick: (rowId: string) => setPhotosPkgId(Number(rowId)),
        hidden: () => false,
      }],
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

  const syncTracking = useMutation({
    mutationFn: (code: string) => postJson(`/api/shipments/${id}/tracking/sync`, { code }),
    onSuccess: () => { toast.success('Tracking synced'); qc.invalidateQueries({ queryKey: ['/api/shipments', id] }); },
    onError: () => toast.error('Tracking sync failed'),
  });

  const uniqueCustomerCount = new Set(shipmentPackages.map((p: any) => p.customerId)).size;

  const exportBol = useMutation({
    mutationFn: () => postJson<{ publicUrl: string }>(`/api/exports/shipments/${id}/bol-report`),
    onSuccess: (res) => {
      if (res?.publicUrl) window.open(res.publicUrl, '_blank', 'noopener,noreferrer');
      toast.success('BOL report is ready');
    },
    onError: () => toast.error('BOL export failed'),
  });

  const exportCustomerInvoices = useMutation({
    mutationFn: () => postJson<{ publicUrl: string }>(`/api/exports/shipments/${id}/customer-invoices-excel`),
    onSuccess: (res) => {
      if (res?.publicUrl) window.open(res.publicUrl, '_blank', 'noopener,noreferrer');
      toast.success('Customer invoices excel is ready');
    },
    onError: () => toast.error('Customer invoices export failed'),
  });

  const exportCommercialDocs = useMutation({
    mutationFn: () => postJson<{ publicUrl: string }>(`/api/exports/shipments/${id}/commercial-documents`),
    onSuccess: (res) => {
      if (res?.publicUrl) window.open(res.publicUrl, '_blank', 'noopener,noreferrer');
      toast.success('Commercial Invoice + Packing List ready');
    },
    onError: () => toast.error('Commercial documents export failed'),
  });

  const bulkTransition = useMutation({
    mutationFn: (payload: { packageIds: number[]; action: string }) =>
      postJson(`/api/shipments/${id}/packages/bulk-transition`, payload),
    onSuccess: (_data, variables) => {
      toast.success(`${variables.packageIds.length} package(s) updated successfully`);
      qc.invalidateQueries({ queryKey: ['/api/packages'] });
      qc.invalidateQueries({ queryKey: ['/api/shipments', id] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Bulk transition failed');
    },
  });

  const CANCELLABLE = new Set(['Draft', 'Received', 'Packed', 'ReadyToShip']);
  const presentStatuses = new Set(Object.values(packageTableData).map((p: any) => p.status));

  const allBulkActions: ITableMenuAction[] = [
    {
      key: 'ready-to-ship',
      title: 'Mark Ready to Ship',
      disabled: (selected: string[]) =>
        selected.length === 0 || bulkTransition.isPending ||
        selected.some(sid => packageTableData[sid]?.status !== 'Packed'),
      onClick: (selected: string[]) => dispatch(OpenConfirmation({
        open: true, title: 'Mark Ready to Ship',
        message: `Mark ${selected.length} package(s) as Ready to Ship?`,
        onSubmit: () => bulkTransition.mutate({ packageIds: selected.map(Number), action: 'ready-to-ship' }),
      })),
    },
    {
      key: 'cancel',
      title: 'Cancel Packages',
      disabled: (selected: string[]) =>
        selected.length === 0 || bulkTransition.isPending ||
        selected.some(sid => !CANCELLABLE.has(packageTableData[sid]?.status)),
      onClick: (selected: string[]) => dispatch(OpenConfirmation({
        open: true, title: 'Cancel Packages',
        message: `Cancel ${selected.length} package(s)? This cannot be undone.`,
        onSubmit: () => bulkTransition.mutate({ packageIds: selected.map(Number), action: 'cancel' }),
      })),
    },
    {
      key: 'arrive-destination',
      title: 'Mark Arrived',
      disabled: (selected: string[]) =>
        selected.length === 0 || bulkTransition.isPending ||
        selected.some(sid => packageTableData[sid]?.status !== 'Shipped'),
      onClick: (selected: string[]) => dispatch(OpenConfirmation({
        open: true, title: 'Mark Arrived at Destination',
        message: `Mark ${selected.length} package(s) as Arrived at Destination?`,
        onSubmit: () => bulkTransition.mutate({ packageIds: selected.map(Number), action: 'arrive-destination' }),
      })),
    },
    {
      key: 'ready-for-handout',
      title: 'Mark Ready for Handout',
      disabled: (selected: string[]) =>
        selected.length === 0 || bulkTransition.isPending ||
        selected.some(sid => packageTableData[sid]?.status !== 'ArrivedAtDestination'),
      onClick: (selected: string[]) => dispatch(OpenConfirmation({
        open: true, title: 'Mark Ready for Handout',
        message: `Mark ${selected.length} package(s) as Ready for Handout?`,
        onSubmit: () => bulkTransition.mutate({ packageIds: selected.map(Number), action: 'ready-for-handout' }),
      })),
    },
  ];

  const ACTION_VISIBILITY: Record<string, (statuses: Set<string>) => boolean> = {
    'ready-to-ship': (s) => s.has('Packed'),
    'cancel': (s) => [...s].some(st => CANCELLABLE.has(st)),
    'arrive-destination': (s) => s.has('Shipped'),
    'ready-for-handout': (s) => s.has('ArrivedAtDestination'),
  };

  const packageActions = allBulkActions.filter(a => ACTION_VISIBILITY[a.key]?.(presentStatuses));

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

  const activePackages = shipmentPackages.filter((p: any) => p.status !== 'Cancelled');
  const totalCharge = activePackages.reduce((sum: number, p: any) => sum + (p.chargeAmount ?? 0), 0);
  const shipmentCurrency = activePackages[0]?.currency ?? 'EUR';
  const overrideCount = activePackages.filter((p: any) => p.hasPricingOverride).length;

  const financialFields: IInformationWidgetField[] = [
    { type: InformationWidgetFieldTypes.Text, name: 'packageCount', title: 'Total Packages', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'totalWeight', title: 'Total Weight (Kg)', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'totalCbm', title: 'Total CBM', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'totalCharges', title: 'Total Charges', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'currency', title: 'Currency', width: 'third' },
    ...(overrideCount > 0 ? [{ type: InformationWidgetFieldTypes.Text, name: 'overrides', title: 'Pricing Overrides', width: 'third' } as IInformationWidgetField] : []),
  ];

  const financialData = {
    packageCount: activePackages.length,
    totalWeight: data.totalWeightKg,
    totalCbm: data.totalCbm,
    totalCharges: totalCharge.toFixed(2),
    currency: shipmentCurrency,
    overrides: `${overrideCount} package${overrideCount !== 1 ? 's' : ''}`,
  };

  const editInfoActions = CAN_EDIT_SHIPMENT.has(data.status) && canManageShipments(role)
    ? [{ key: 'edit', title: 'Edit Info', onClick: () => setEditDrawerOpen(true) }]
    : [];

  const titleActions: MainPageAction[] = canManageShipments(role) ? (ALLOWED_TRANSITIONS[data.status] ?? []).map(
    ({ label, action, isCancel, confirmMessage, useRtdPreview }) => ({
      label,
      disabled: move.isPending,
      ...(isCancel
        ? { backgroundColor: '#d32f2f', color: '#fff' }
        : {}),
      onClick: useRtdPreview
        ? async () => {
            try {
              const preview = await getJson<any>(`/api/shipments/${id}/ready-to-depart/preview`);
              if (!preview.canProceed) { toast.error(preview.message); return; }
              setRtdPreview(preview);
            } catch { toast.error('Failed to load preview'); }
          }
        : () =>
            dispatch(
              OpenConfirmation({
                open: true,
                title: label,
                message: confirmMessage,
                onSubmit: () => move.mutate(action),
              }),
            ),
    }),
  ) : [];

  const statusChip = (
    <Chip
      label={SHIPMENT_STATUS_LABELS[data.status] ?? data.status}
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
            {data.maxCbm > 0 && (() => {
              const pct = Math.min((data.totalCbm / data.maxCbm) * 100, 100);
              return (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    CBM: {data.totalCbm} / {data.maxCbm} ({pct.toFixed(1)}%)
                  </Typography>
                  <LinearProgress variant="determinate" value={pct} color={pct >= 90 ? 'error' : pct >= 80 ? 'warning' : 'primary'} />
                </Box>
              );
            })()}
            {data.maxWeightKg > 0 && (() => {
              const pct = Math.min((data.totalWeightKg / data.maxWeightKg) * 100, 100);
              return (
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Weight: {(data.totalWeightKg / 1000).toFixed(3)} / {(data.maxWeightKg / 1000).toFixed(3)} t ({pct.toFixed(1)}%)
                  </Typography>
                  <LinearProgress variant="determinate" value={pct} color={pct >= 90 ? 'error' : pct >= 80 ? 'warning' : 'primary'} />
                </Box>
              );
            })()}
          </MainPageSection>
        )}

        {['Departed', 'Arrived', 'Closed'].includes(data.status) && (
          <InformationWidget title="Financial Summary" fields={financialFields} data={financialData} />
        )}

        <MainPageSection title="External Tracking Sync">
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <TextField size="small" label="Tracking code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
            <Button variant="outlined" onClick={() => syncTracking.mutate(trackingCode)} disabled={syncTracking.isPending || !trackingCode.trim()}>Sync Tracking</Button>
            <Typography variant="body2">Current: {data.externalTrackingCode ?? '-'} / ETA: {data.externalEstimatedArrivalAt ? new Date(data.externalEstimatedArrivalAt).toLocaleString() : '-'}</Typography>
          </Stack>
        </MainPageSection>

        {canSendWhatsApp(role) && <WhatsAppCampaignCards shipmentId={id} shipmentStatus={data.status} customerCount={uniqueCustomerCount} />}

        {canExport(role) && EXPORTABLE_STATUSES.has(data.status) && (
          <MainPageSection title="Shipment Reports">
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button variant="outlined" onClick={() => exportBol.mutate()} disabled={exportBol.isPending || exportCustomerInvoices.isPending || exportCommercialDocs.isPending}>BOL report</Button>
              <Button variant="outlined" onClick={() => exportCustomerInvoices.mutate()} disabled={exportBol.isPending || exportCustomerInvoices.isPending || exportCommercialDocs.isPending}>customer-invoices-excel</Button>
              <Button variant="outlined" onClick={() => exportCommercialDocs.mutate()} disabled={exportBol.isPending || exportCustomerInvoices.isPending || exportCommercialDocs.isPending}>Commercial Invoice + Packing List</Button>
            </Stack>
          </MainPageSection>
        )}

        {(auditQuery.data ?? []).length > 0 && (
          <MainPageSection title="Activity Log">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Old Value</TableCell>
                  <TableCell>New Value</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(auditQuery.data ?? []).map((log: any, idx: number) => (
                  <TableRow key={log.id ?? idx}>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.oldValue ?? '—'}</TableCell>
                    <TableCell>{log.newValue ?? '—'}</TableCell>
                    <TableCell>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MainPageSection>
        )}

        <MainPageSection title="Packages">
          {shipmentPackages.length > 0 && (() => {
            const statusCounts: Record<string, number> = {};
            shipmentPackages.filter((p: any) => p.status !== 'Cancelled').forEach((p: any) => {
              statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
            });
            const missingDep = shipmentPackages.filter((p: any) => !p.hasDeparturePhotos && p.status !== 'Cancelled' && p.status !== 'Draft');
            const missingArr = shipmentPackages.filter((p: any) => !p.hasArrivalPhotos && p.status !== 'Cancelled' && ['Shipped', 'ArrivedAtDestination', 'ReadyForHandout'].includes(p.status));
            return (
              <>
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Chip key={status} size="small" label={`${PKG_STATUS_LABELS[status] ?? status}: ${count}`}
                      sx={{ backgroundColor: PKG_STATUS_CHIPS[status]?.backgroundColor ?? '#e0e0e0', color: PKG_STATUS_CHIPS[status]?.color ?? '#333', fontWeight: 600 }} />
                  ))}
                </Stack>
                {missingDep.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 1.5 }}>
                    {missingDep.length} package(s) missing departure photos: {missingDep.map((p: any) => `#${p.id} (${customersMap[p.customerId] ?? p.customerId})`).join(', ')}
                  </Alert>
                )}
                {missingArr.length > 0 && (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    {missingArr.length} package(s) missing arrival photos: {missingArr.map((p: any) => `#${p.id} (${customersMap[p.customerId] ?? p.customerId})`).join(', ')}
                  </Alert>
                )}
              </>
            );
          })()}
          {canManageShipments(role) && CAN_ADD_PACKAGE.has(data.status) && (
            <Box sx={{ mb: 2 }}>
              <Button variant="contained" size="small" onClick={() => setAddPkgOpen(true)}>+ Add Package</Button>
            </Box>
          )}
          <EnhancedTable title="Packages in Shipment" header={packageHeadersWithNav} data={packageTableData} defaultOrder="id" actions={packageActions} />
        </MainPageSection>
      </DetailPageLayout>

      <AddPackageDialog open={addPkgOpen} onClose={() => setAddPkgOpen(false)} shipmentId={id} />

      <EditShipmentDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        shipmentId={id}
        shipmentData={{ tiiuCode: data.tiiuCode, plannedDepartureDate: data.plannedDepartureDate, plannedArrivalDate: data.plannedArrivalDate }}
      />

      {photosPkgId !== null && (
        <PhotoGalleryModal open onClose={() => setPhotosPkgId(null)} packageId={photosPkgId} />
      )}

      <ReadyToDepartPreviewDialog
        open={!!rtdPreview}
        onClose={() => setRtdPreview(null)}
        previewData={rtdPreview}
        onConfirm={() => { move.mutate('ready-to-depart'); setRtdPreview(null); }}
        isConfirming={move.isPending}
      />
    </>
  );
};

export default ShipmentDetailPage;
