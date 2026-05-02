import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Link as MuiLink,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, api, getJson, postJson, parseApiError } from '../../api/client';
import { useAppDispatch } from '../../redux/hooks';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhanceTableHeaderTypes, EnhancedTableColumnType } from '../../components/enhanced-table';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import DetailPageLayout from '../../components/layout-components/main-layout/DetailPageLayout';
import { MainPageAction } from '../../components/layout-components/main-layout/MainPageTitle';
import MediaStageCards from '../../components/media/MediaStageCards';
import InformationWidget, { InformationWidgetFieldTypes, IInformationWidgetField } from '../../components/information-widget';
import PricingOverrideHistory from '../../components/pricing/PricingOverrideHistory';
import Loader from '../../components/Loader';
import { PKG_STATUS_CHIPS } from '../../constants/statusColors';
import { PKG_STATUS_LABELS, SUPPLY_ORDER_STATUS_LABELS } from '../../constants/statusLabels';
import ItemDialog from './components/ItemDialog';
import BulkAddItemsDialog from './components/BulkAddItemsDialog';
import PricingOverrideDialog from './components/PricingOverrideDialog';
import EditPackageDialog from './components/EditPackageDialog';
import { useUserRole, canTransitionPackage, canEditPackageItems, canUploadPhotos, canOverridePricing } from '../../helpers/rbac';
import { formatAuditEntry } from '../../helpers/audit-utils';
import { UNIT_LABEL_EN } from '../../api/lookups';

interface Props {
  id: string;
}

const ALLOWED_TRANSITIONS: Record<string, { label: string; action: string; isCancel?: boolean; confirmMessage: string; requiredShipmentStatus?: string[] }[]> = {
  Draft: [
    { label: 'Receive', action: 'receive', confirmMessage: 'Receive this package into the warehouse?' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package? This cannot be undone.' },
  ],
  Received: [
    { label: 'Pack', action: 'pack', confirmMessage: 'Mark this package as Packed?' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package? This cannot be undone.' },
  ],
  Packed: [
    { label: 'Ready To Ship', action: 'ready-to-ship', confirmMessage: 'Mark this package as Ready To Ship?', requiredShipmentStatus: ['Scheduled', 'ReadyToDepart', 'Departed', 'Arrived', 'Closed'] },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package? This cannot be undone.' },
  ],
  ReadyToShip: [
    { label: 'Ship', action: 'ship', confirmMessage: 'Ship this package? Departure photos are required.', requiredShipmentStatus: ['Departed', 'Arrived', 'Closed'] },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package? This cannot be undone.' },
  ],
  Shipped: [{ label: 'Arrive Destination', action: 'arrive-destination', confirmMessage: 'Mark this package as Arrived at Destination?', requiredShipmentStatus: ['Arrived', 'Closed'] }],
  ArrivedAtDestination: [{ label: 'Ready For Handout', action: 'ready-for-handout', confirmMessage: 'Mark this package as Ready For Handout?', requiredShipmentStatus: ['Arrived', 'Closed'] }],
  ReadyForHandout: [{ label: 'Handout', action: 'handout', confirmMessage: 'Hand out this package? Arrival photos are required.', requiredShipmentStatus: ['Arrived', 'Closed'] }],
  HandedOut: [],
  Cancelled: [],
};

const PKG_INFO_FIELDS: IInformationWidgetField[] = [
  { type: InformationWidgetFieldTypes.Text, name: 'shipmentRef', title: 'Shipment', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'customer', title: 'Customer', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'provisionMethod', title: 'Provision Method', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'supplyOrderInfo', title: 'Supply Order', width: 'third' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'createdAt', title: 'Created At', width: 'third' },
  { type: InformationWidgetFieldTypes.Text, name: 'note', title: 'Note', width: 'full' },
];



const PackageDetailPage = ({ id }: Props) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const role = useUserRole();
  const [gate, setGate] = useState<GateError | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(null);

  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideType, setOverrideType] = useState<'RatePerKg' | 'RatePerCbm' | 'TotalCharge'>('RatePerKg');
  const [editPkgOpen, setEditPkgOpen] = useState(false);
  const [tab, setTab] = useState(0);

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

  const auditQuery = useQuery<any[]>({
    queryKey: ['/api/packages', id, 'audit-log'],
    queryFn: () => getJson<any[]>(`/api/packages/${id}/audit-log`),
  });

  const customersQuery = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const goodsQuery = useQuery<any[]>({
    queryKey: ['/api/good-types'],
    queryFn: () => getJson<any[]>('/api/good-types'),
  });

  const shipmentId = (data?.package ?? data)?.shipmentId;
  const shipmentQuery = useQuery<any>({
    queryKey: ['/api/shipments', shipmentId],
    queryFn: () => getJson<any>(`/api/shipments/${shipmentId}`),
    enabled: !!shipmentId,
  });
  const shipmentStatus: string | undefined = shipmentQuery.data?.status;

  const supplyOrderId = (data?.package ?? data)?.supplyOrderId;
  const soQuery = useQuery<any>({
    queryKey: ['/api/supply-orders', supplyOrderId],
    queryFn: () => getJson<any>(`/api/supply-orders/${supplyOrderId}`),
    enabled: !!supplyOrderId,
  });

  const warehousesQuery = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    queryFn: () => getJson<any[]>('/api/warehouses'),
  });
  const warehousesMap = (warehousesQuery.data ?? []).reduce(
    (acc: Record<number, string>, w: any) => { acc[w.id] = w.name; return acc; }, {},
  );

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

  const deleteItem = useMutation({
    mutationFn: (itemId: number) => api.delete(`/api/packages/${id}/items/${itemId}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Item deleted');
      qc.invalidateQueries({ queryKey: ['/api/packages', id] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Delete failed'),
  });


  const goodsMap: Record<number, string> = (goodsQuery.data ?? []).reduce(
    (acc: Record<number, string>, g: any) => { acc[g.id] = g.nameEn; return acc; }, {},
  );
  const customersMap: Record<number, string> = (customersQuery.data ?? []).reduce(
    (acc: Record<number, string>, c: any) => { acc[c.id] = c.name; return acc; }, {},
  );

  const items: any[] = data?.items ?? [];
  const itemsTableData = items.reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = {
      ...item,
      goodName: item.goodTypeName || goodsMap[item.goodTypeId] || `#${item.goodTypeId}`,
      unitLabel: UNIT_LABEL_EN[item.unit] ?? item.unit ?? '—',
      unitPriceDisplay: item.unitPrice == null
        ? '—'
        : `$ ${Number(item.unitPrice).toFixed(2)}`,
    };
    return acc;
  }, {});

  const itemHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'goodName', label: 'Good', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    { id: 'quantity', label: 'Quantity', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'unitLabel', label: 'Unit', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    { id: 'unitPriceDisplay', label: 'Unit Price', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    { id: 'note', label: 'Note', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
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
          hidden: () => !canEditPackageItems(role),
        },
        {
          icon: null,
          label: 'Delete',
          onClick: (tableId: string) => {
            const item = itemsTableData[tableId];
            if (item) dispatch(OpenConfirmation({
              open: true,
              title: 'Delete Item',
              message: 'Delete this item?',
              onSubmit: () => deleteItem.mutate(item.id),
            }));
          },
          hidden: () => !canEditPackageItems(role),
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
  const soData = soQuery.data;
  const pkgDisplay = {
    ...pkg,
    customer: customersMap[pkg.customerId] ?? `#${pkg.customerId}`,
    shipmentRef: shipmentQuery.data?.refCode ?? `#${shipmentId}`,
    provisionMethod: pkg.provisionMethod === 'ProcuredForCustomer' ? 'Procured For Customer' : 'Customer Provided',
    supplyOrderInfo: soData ? `#${soData.id} — ${SUPPLY_ORDER_STATUS_LABELS[soData.status] ?? soData.status}` : (pkg.supplyOrderId ? `#${pkg.supplyOrderId}` : '—'),
    weightTons: (pkg.weightKg / 1000).toFixed(3),
  };

  const shipmentDisplayData = shipmentQuery.data ? {
    ...shipmentQuery.data,
    originWarehouse: warehousesMap[shipmentQuery.data.originWarehouseId] ?? `#${shipmentQuery.data.originWarehouseId}`,
    destinationWarehouse: warehousesMap[shipmentQuery.data.destinationWarehouseId] ?? `#${shipmentQuery.data.destinationWarehouseId}`,
  } : {};

  const shipmentInfoFields: IInformationWidgetField[] = [
    { type: InformationWidgetFieldTypes.Text, name: 'refCode', title: 'Ref Code', width: 'third', action: { label: 'View Shipment', onClick: () => navigate(`/ops/shipments/${shipmentId}`) } },
    { type: InformationWidgetFieldTypes.Text, name: 'status', title: 'Status', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'originWarehouse', title: 'Origin', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'destinationWarehouse', title: 'Destination', width: 'third' },
    { type: InformationWidgetFieldTypes.Date, name: 'plannedDepartureDate', title: 'Planned Departure', width: 'third' },
    { type: InformationWidgetFieldTypes.Date, name: 'plannedArrivalDate', title: 'Planned Arrival', width: 'third' },
  ];

  const pricingFields: IInformationWidgetField[] = [
    { type: InformationWidgetFieldTypes.Text, name: 'cbm', title: 'CBM', width: 'third' },
    { type: InformationWidgetFieldTypes.Text, name: 'weightTons', title: 'Weight (t)', width: 'third' },
    // `Package.Currency` is the freight-charge currency from the active pricing config; it is
    // unrelated to PackageItem.UnitPrice (always USD). Hidden here to avoid confusing operators —
    // unit prices in the items table render as "$ X.XX" by contract.
    { type: InformationWidgetFieldTypes.Text, name: 'appliedRatePerCbm', title: 'Rate Per CBM', width: 'third', ...(canOverridePricing(role) ? { action: { label: 'Override', onClick: () => { setOverrideType('RatePerCbm'); setOverrideDialogOpen(true); } } } : {}) },
    { type: InformationWidgetFieldTypes.Text, name: 'appliedRatePerKg', title: 'Rate Per Kg', width: 'third', ...(canOverridePricing(role) ? { action: { label: 'Override', onClick: () => { setOverrideType('RatePerKg'); setOverrideDialogOpen(true); } } } : {}) },
    { type: InformationWidgetFieldTypes.Text, name: 'chargeAmount', title: 'Charge Amount', width: 'third', ...(canOverridePricing(role) ? { action: { label: 'Override', onClick: () => { setOverrideType('TotalCharge'); setOverrideDialogOpen(true); } } } : {}) },
  ];

  const titleActions: MainPageAction[] = (ALLOWED_TRANSITIONS[pkg.status] ?? []).filter(
    ({ action }) => canTransitionPackage(role, action),
  ).map(
    ({ label, action, isCancel, confirmMessage, requiredShipmentStatus }) => ({
      label,
      disabled: transition.isPending
        || (requiredShipmentStatus != null && (!shipmentStatus || !requiredShipmentStatus.includes(shipmentStatus))),
      ...(isCancel
        ? { backgroundColor: '#d32f2f', color: '#fff' }
        : {}),
      onClick: () =>
        dispatch(
          OpenConfirmation({
            open: true,
            title: label,
            message: confirmMessage,
            onSubmit: () => transition.mutate(action),
          }),
        ),
    }),
  );

  return (
    <>
    <Box sx={{ px: 3, pt: 2 }}>
      <Button variant="text" size="small" startIcon={<ArrowBackIcon />}
        onClick={() => navigate(shipmentId ? `/ops/shipments/${shipmentId}` : '/ops/packages')} sx={{ color: 'text.secondary' }}>
        {shipmentId ? 'Back to Shipment' : 'All Packages'}
      </Button>
    </Box>
    <DetailPageLayout
      title={`Package #${id}`}
      chips={
        pkg.status && (
          <Chip
            label={PKG_STATUS_LABELS[pkg.status] ?? pkg.status}
            size="small"
            sx={{
              backgroundColor: PKG_STATUS_CHIPS[pkg.status]?.backgroundColor ?? '#e0e0e0',
              color: PKG_STATUS_CHIPS[pkg.status]?.color ?? '#333',
            }}
          />
        )
      }
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

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Overview" />
            <Tab label="Items & Pricing" />
            <Tab label="Photos" />
            <Tab label="Activity" />
          </Tabs>
        </Box>

        {tab === 0 && (
          <>
            <InformationWidget title="Package Info" fields={PKG_INFO_FIELDS} data={pkgDisplay} />
            {shipmentQuery.data && (
              <InformationWidget title="Shipment Info" fields={shipmentInfoFields} data={shipmentDisplayData} />
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <MainPageSection title="Items">
              {canEditPackageItems(role) && (
                <Stack direction="row" gap={1} sx={{ mb: 2 }}>
                  <Button variant="contained" size="small" onClick={() => { setEditingItem(null); setAddItemOpen(true); }}>
                    Add Item
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => setBulkAddOpen(true)}>
                    Bulk Add
                  </Button>
                </Stack>
              )}
              <EnhancedTable title="Package Items" header={itemHeaders} data={itemsTableData} defaultOrder="goodName" />
            </MainPageSection>

            <InformationWidget
              title={`Pricing Snapshot${pkg.hasPricingOverride ? ' (Override Active)' : ''}`}
              fields={pricingFields}
              data={pkgDisplay}
            >
              {canEditPackageItems(role) && ['Draft', 'Received', 'Packed', 'ReadyToShip'].includes(pkg.status) && (
                <Box sx={{ mt: 1 }}>
                  <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => setEditPkgOpen(true)}>
                    Edit Weight / CBM / Note
                  </Button>
                </Box>
              )}
              <PricingOverrideHistory overrides={overridesQuery.data ?? []} />
            </InformationWidget>
          </>
        )}

        {tab === 2 && canUploadPhotos(role) && (
          <MainPageSection title="Photos">
            <MediaStageCards packageId={id} media={mediaQuery.data ?? []} />
          </MainPageSection>
        )}

        {tab === 3 && (
          <MainPageSection title="Activity Log">
            {(auditQuery.data ?? []).length > 0 ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Activity</TableCell>
                    <TableCell>Detail</TableCell>
                    <TableCell>When</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(auditQuery.data ?? []).map((log: any, idx: number) => {
                    const entry = formatAuditEntry(log);
                    return (
                      <TableRow key={log.id ?? idx}>
                        <TableCell>{entry.title}</TableCell>
                        <TableCell>{entry.detail || '—'}</TableCell>
                        <TableCell>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>No activity yet.</Box>
            )}
          </MainPageSection>
        )}
    </DetailPageLayout>

      <ItemDialog
        open={addItemOpen}
        onClose={() => { setAddItemOpen(false); setEditingItem(null); }}
        packageId={id}
        editingItem={editingItem}
      />

      <BulkAddItemsDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        packageId={id}
      />

      <PricingOverrideDialog
        open={overrideDialogOpen}
        onClose={() => setOverrideDialogOpen(false)}
        packageId={id}
        initialOverrideType={overrideType}
      />

      <EditPackageDialog
        open={editPkgOpen}
        onClose={() => setEditPkgOpen(false)}
        packageId={id}
        packageData={{ weightKg: pkg.weightKg, cbm: pkg.cbm, note: pkg.note }}
      />
    </>
  );
};

export default PackageDetailPage;
