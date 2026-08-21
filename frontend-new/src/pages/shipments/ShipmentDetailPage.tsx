import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, Image as ImageIcon, FileDown, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumbs, StatusBadge } from '@/components/misc';
import { DetailPageLayout, MainPageSection, type MainPageAction } from '@/components/layout';
import { InformationWidget, InformationWidgetFieldTypes, type IInformationWidgetField } from '@/components/information-widget';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { Loader, EmptyState } from '@/components/feedback';
import { PhotoGalleryModal, type MediaItem } from '@/components/media';
import { getJson, postJson } from '@/api/client';
import { parseApiError, type GateError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canManageShipments, canSendWhatsApp, canExport, canViewActivityLog, canBulkTransitionPackages } from '@/helpers/rbac';
import { formatAuditEntry } from '@/helpers/audit-utils';
import { BOOL_CHIPS, PKG_STATUS_CHIPS, SHIPMENT_STATUS_CHIPS } from '@/constants/statusColors';
import { SHIPMENT_STATUS_LABELS, PKG_STATUS_LABELS } from '@/constants/statusLabels';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';
import { AddPackageDialog } from './components/AddPackageDialog';
import { EditShipmentDrawer } from './components/EditShipmentDrawer';
import { ReadyToDepartPreviewDialog } from './components/ReadyToDepartPreviewDialog';
import { WhatsAppCampaignCards } from './components/WhatsAppCampaignCards';
import { FxSnapshotsSection } from './components/FxSnapshotsSection';
import { EditPackageDialog } from '../packages/components/EditPackageDialog';

const ALLOWED_TRANSITIONS: Record<
  string,
  { label: string; action: string; isCancel?: boolean; confirmMessage: string; useRtdPreview?: boolean }[]
> = {
  Draft: [
    { label: 'Schedule', action: 'schedule', confirmMessage: 'Schedule this shipment? It will be locked for departure preparation.' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this shipment? Every package under it that has not shipped will be cancelled too. This cannot be undone.' },
  ],
  Scheduled: [
    { label: 'Ready To Depart', action: 'ready-to-depart', confirmMessage: '', useRtdPreview: true },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this shipment? Every package under it that has not shipped will be cancelled too. This cannot be undone.' },
  ],
  ReadyToDepart: [
    { label: 'Depart', action: 'depart', confirmMessage: 'Mark this shipment as Departed? Ensure all packages have departure photos.' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this shipment? Every package under it that has not shipped will be cancelled too. This cannot be undone.' },
  ],
  Departed: [{ label: 'Arrive', action: 'arrive', confirmMessage: 'Mark this shipment as Arrived?' }],
  Arrived: [{ label: 'Close', action: 'close', confirmMessage: 'Close this shipment? This is final.' }],
  Closed: [],
  Cancelled: [],
};

interface MoveResult {
  movedCount: number;
  demotedCount: number;
  targetShipmentId: number;
  targetRefCode: string;
  sourceCancelled: boolean;
}

const SHIPMENT_INFO_FIELDS: IInformationWidgetField[] = [
  { type: InformationWidgetFieldTypes.Text, name: 'refCode', title: 'Ref Code' },
  { type: InformationWidgetFieldTypes.Text, name: 'tiiuCode', title: 'TIIU Code' },
  { type: InformationWidgetFieldTypes.Text, name: 'originWarehouse', title: 'Origin' },
  { type: InformationWidgetFieldTypes.Text, name: 'destinationWarehouse', title: 'Destination' },
  { type: InformationWidgetFieldTypes.Date, name: 'plannedDepartureDate', title: 'Planned Departure' },
  { type: InformationWidgetFieldTypes.Date, name: 'plannedArrivalDate', title: 'Planned Arrival' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'actualDepartureAt', title: 'Actual Departure' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'actualArrivalAt', title: 'Actual Arrival' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'createdAt', title: 'Created At' },
];

const CAN_ADD_PACKAGE = new Set(['Draft', 'Scheduled']);
const CAN_EDIT_SHIPMENT = new Set(['Draft', 'Scheduled', 'ReadyToDepart']);
const EXPORTABLE_STATUSES = new Set(['ReadyToDepart', 'Departed', 'Arrived', 'Closed']);

interface ShipmentData {
  id: number;
  refCode: string;
  tiiuCode?: string | null;
  status: string;
  originWarehouseId: number;
  destinationWarehouseId: number;
  plannedDepartureDate: string;
  plannedArrivalDate: string;
  actualDepartureAt?: string;
  actualArrivalAt?: string;
  createdAt: string;
  totalWeightKg: number;
  totalCbm: number;
  maxWeightKg: number;
  maxCbm: number;
}

interface ShipmentPackage {
  id: number;
  customerId: number;
  customerName: string;
  status: string;
  weightKg: number;
  cbm: number;
  chargeAmount?: number;
  currency?: string;
  hasDeparturePhotos: boolean;
  hasArrivalPhotos: boolean;
  hasPricingOverride: boolean;
  note?: string | null;
}

interface ShipmentDetail {
  shipment: ShipmentData;
  packages: ShipmentPackage[];
  originWarehouseName: string;
  originWarehouseCode: string;
  destinationWarehouseName: string;
  destinationWarehouseCode: string;
  uniqueCustomerCount: number;
}

interface AuditLog {
  id?: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  createdAt?: string;
}

export default function ShipmentDetailPage() {
  const { id = '0' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const role = useUserRole();
  const [gate, setGate] = useState<GateError | null>(null);
  const [addPkgOpen, setAddPkgOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [photosPkgId, setPhotosPkgId] = useState<number | null>(null);
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [rtdPreview, setRtdPreview] = useState<Parameters<typeof ReadyToDepartPreviewDialog>[0]['previewData']>(null);

  const detail = useLoader<ShipmentDetail>(() => getJson<ShipmentDetail>(`/api/shipments/${id}/detail`));
  const audit = useLoader<AuditLog[]>(() => getJson<AuditLog[]>(`/api/shipments/${id}/audit-log`));
  const photoLoader = useLoader<MediaItem[]>(async () =>
    photosPkgId ? getJson<MediaItem[]>(`/api/packages/${photosPkgId}/media`) : [],
  );

  const { initialized, error } = useInitializeFunction([detail.reload, audit.reload], [id]);

  // Reload photos when the selected package changes. Calling reload() inline in
  // the action handler would still see the previous closure (same-tick), which
  // showed an empty gallery on first open and stale photos when switching.
  useEffect(() => {
    if (photosPkgId !== null) {
      photoLoader.setData([]); // avoid flashing the previous package's photos
      photoLoader.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosPkgId]);

  const data = detail.data?.shipment;
  usePageTitle(data ? `Shipment ${data.refCode}` : `Shipment #${id}`);

  const shipmentPackages = detail.data?.packages ?? [];
  const originName = detail.data?.originWarehouseName ?? '';
  const originCode = detail.data?.originWarehouseCode ?? '';
  const destName = detail.data?.destinationWarehouseName ?? '';
  const destCode = detail.data?.destinationWarehouseCode ?? '';
  const uniqueCustomerCount = detail.data?.uniqueCustomerCount ?? 0;

  const transition = async (action: string) => {
    try {
      await postJson(`/api/shipments/${id}/${action}`);
      toast.success('Shipment updated');
      setGate(null);
      await detail.reload();
      await audit.reload();
    } catch (e) {
      const parsed = parseApiError(e);
      if (parsed.code === 'PHOTO_GATE_FAILED') {
        setGate(parsed as unknown as GateError);
      }
      toast.error(parsed.message);
    }
  };

  const runExport = async (endpoint: string) => {
    try {
      const r = await postJson<{ publicUrl: string }>(`/api/exports/shipments/${id}/${endpoint}`);
      if (r?.publicUrl) window.open(r.publicUrl, '_blank', 'noopener,noreferrer');
      toast.success('Export ready');
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const bulkTransition = async (packageIds: number[], action: string, clear: () => void) => {
    try {
      await postJson(`/api/shipments/${id}/packages/bulk-transition`, { packageIds, action });
      toast.success(`${packageIds.length} package(s) updated`);
      clear();
      await detail.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  // Hand packages over to the next shipment on this route (an existing Draft,
  // or a new one). Used when cargo does not make it into a staged container.
  const moveToNext = async (packageIds: number[], clear: () => void) => {
    try {
      const r = await postJson<MoveResult>(`/api/shipments/${id}/packages/move-to-next`, { packageIds });
      toast.success(
        `${r.movedCount} package(s) moved to ${r.targetRefCode}` +
          (r.demotedCount ? ` — ${r.demotedCount} reverted to Packed` : '') +
          (r.sourceCancelled ? ' — this shipment was cancelled (no packages left)' : ''),
      );
      clear();
      await detail.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  // Bulk actions — each valid only when every selected package is in the
  // required source status (mirrors the backend's all-or-nothing validation).
  const CANCELLABLE = new Set(['Draft', 'Received', 'Packed', 'ReadyToShip']);
  // Anything not yet shipped can be handed to the next shipment, and only
  // while this one is still on the ground.
  const MOVABLE = new Set(['Draft', 'Received', 'Packed', 'ReadyToShip']);
  const canMovePackages = ['Draft', 'Scheduled', 'ReadyToDepart'].includes(data?.status ?? '');
  const BULK_ACTIONS: { key: string; title: string; required?: string; cancellable?: boolean; movable?: boolean; confirm: string }[] = [
    { key: 'ready-to-ship', title: 'Mark Ready to Ship', required: 'Packed', confirm: 'Mark {n} package(s) as Ready to Ship?' },
    { key: 'arrive-destination', title: 'Mark Arrived', required: 'Shipped', confirm: 'Mark {n} package(s) as Arrived at Destination?' },
    { key: 'ready-for-handout', title: 'Mark Ready for Handout', required: 'ArrivedAtDestination', confirm: 'Mark {n} package(s) as Ready for Handout?' },
    { key: 'cancel', title: 'Cancel Packages', cancellable: true, confirm: 'Cancel {n} package(s)? This cannot be undone.' },
    ...(canMovePackages
      ? [{
          key: 'move-to-next',
          title: 'Move to Next Shipment',
          movable: true,
          confirm:
            'Move {n} package(s) to the next shipment on this route? A Draft shipment is created if the route has none. Packages marked Ready to Ship revert to Packed, and if this shipment is left with no packages it will be cancelled.',
        }]
      : []),
  ];

  const tableData = useMemo(
    () =>
      shipmentPackages.reduce<Record<string, ShipmentPackage & Record<string, unknown>>>((acc, p) => {
        acc[String(p.id)] = {
          ...p,
          customer: `${p.customerName} (#${p.customerId})`,
          hasDeparturePhotos: String(p.hasDeparturePhotos) as unknown as boolean,
          hasArrivalPhotos: String(p.hasArrivalPhotos) as unknown as boolean,
          chargeDisplay:
            p.chargeAmount != null && p.chargeAmount > 0
              ? `${Number(p.chargeAmount).toFixed(2)} ${p.currency ?? ''}`
              : '—',
        };
        return acc;
      }, {}),
    [shipmentPackages],
  );

  const packageHeaders: EnhanceTableHeaderTypes[] = [
    {
      id: 'id',
      label: 'Package ID',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_tid, row) => navigate(`/ops/packages/${row.id}`),
    },
    { id: 'customer', label: 'Customer', type: EnhancedTableColumnType.TEXT },
    { id: 'weightKg', label: 'Weight (Kg)', type: EnhancedTableColumnType.NUMBER, numeric: true },
    { id: 'cbm', label: 'CBM', type: EnhancedTableColumnType.NUMBER, numeric: true },
    { id: 'chargeDisplay', label: 'Charge', type: EnhancedTableColumnType.TEXT },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: PKG_STATUS_CHIPS,
      chipLabels: PKG_STATUS_LABELS,
    },
    {
      id: 'hasDeparturePhotos',
      label: 'Dep. Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: BOOL_CHIPS,
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'hasArrivalPhotos',
      label: 'Arr. Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: BOOL_CHIPS,
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'actions',
      label: '',
      type: EnhancedTableColumnType.Action,
      actions: [
        {
          icon: <ImageIcon className="size-4" />,
          label: 'View Photos',
          onClick: (rowId) => setPhotosPkgId(Number(rowId)),
        },
        {
          icon: <Pencil className="size-4" />,
          label: 'Edit',
          onClick: (rowId) => setEditingPkgId(rowId),
          hidden: (row) =>
            !canManageShipments(role) ||
            ['Shipped', 'ArrivedAtDestination', 'ReadyForHandout', 'HandedOut', 'Cancelled'].includes(
              row.status as string,
            ),
        },
      ],
    },
  ];

  if (!initialized) return <Loader fullScreen />;
  if (error || !data)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Shipment not found.</AlertDescription>
        </Alert>
      </div>
    );

  const shipmentDisplay = {
    ...data,
    originWarehouse: originName ? `${originName} (${originCode})` : `#${data.originWarehouseId}`,
    destinationWarehouse: destName ? `${destName} (${destCode})` : `#${data.destinationWarehouseId}`,
  };

  const activePackages = shipmentPackages.filter((p) => p.status !== 'Cancelled');
  const totalCharge = activePackages.reduce((sum, p) => sum + (p.chargeAmount ?? 0), 0);
  const shipmentCurrency = activePackages[0]?.currency ?? 'EUR';
  const overrideCount = activePackages.filter((p) => p.hasPricingOverride).length;

  const financialData = {
    packageCount: activePackages.length,
    totalWeight: data.totalWeightKg,
    totalCbm: data.totalCbm,
    totalCharges: totalCharge.toFixed(2),
    currency: shipmentCurrency,
    overrides: `${overrideCount} package${overrideCount !== 1 ? 's' : ''}`,
  };

  const financialFields: IInformationWidgetField[] = [
    { type: InformationWidgetFieldTypes.Text, name: 'packageCount', title: 'Total Packages' },
    { type: InformationWidgetFieldTypes.Text, name: 'totalWeight', title: 'Total Weight (Kg)' },
    { type: InformationWidgetFieldTypes.Text, name: 'totalCbm', title: 'Total CBM' },
    { type: InformationWidgetFieldTypes.Text, name: 'totalCharges', title: 'Total Charges' },
    { type: InformationWidgetFieldTypes.Text, name: 'currency', title: 'Currency' },
    ...(overrideCount > 0
      ? [{ type: InformationWidgetFieldTypes.Text, name: 'overrides', title: 'Pricing Overrides' } as IInformationWidgetField]
      : []),
  ];

  const editInfoAction =
    CAN_EDIT_SHIPMENT.has(data.status) && canManageShipments(role) ? (
      <Button size="sm" variant="secondary" onClick={() => setEditDrawerOpen(true)}>
        <Pencil className="mr-1 size-4" /> Edit Info
      </Button>
    ) : null;

  const titleActions: MainPageAction[] = canManageShipments(role)
    ? (ALLOWED_TRANSITIONS[data.status] ?? []).map(({ label, action, isCancel, confirmMessage, useRtdPreview }) => ({
        label,
        destructive: isCancel,
        onClick: useRtdPreview
          ? async () => {
              try {
                const preview = await getJson<{ canProceed?: boolean; message?: string }>(`/api/shipments/${id}/ready-to-depart/preview`);
                if (preview.canProceed === false) {
                  toast.error(preview.message ?? 'Cannot proceed');
                  return;
                }
                setRtdPreview(preview as never);
              } catch {
                toast.error('Failed to load preview');
              }
            }
          : () =>
              dispatch(
                OpenConfirmation({
                  title: label,
                  message: confirmMessage,
                  destructive: isCancel,
                  onSubmit: () => transition(action),
                }),
              ),
      }))
    : [];

  const statusCounts: Record<string, number> = {};
  shipmentPackages.filter((p) => p.status !== 'Cancelled').forEach((p) => {
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  });
  const missingDep = shipmentPackages.filter(
    (p) => !p.hasDeparturePhotos && p.status !== 'Cancelled' && p.status !== 'Draft',
  );
  const missingArr = shipmentPackages.filter(
    (p) =>
      !p.hasArrivalPhotos &&
      p.status !== 'Cancelled' &&
      ['Shipped', 'ArrivedAtDestination', 'ReadyForHandout'].includes(p.status),
  );

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Shipments', href: '/ops/shipments' },
          { label: data.refCode },
        ]}
      />
      <DetailPageLayout
        title={`Shipment ${data.refCode}`}
        chips={
          <StatusBadge value={data.status} labels={SHIPMENT_STATUS_LABELS} colors={SHIPMENT_STATUS_CHIPS} />
        }
        actions={titleActions}
      >
        {gate?.code === 'PHOTO_GATE_FAILED' && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>{gate.message}</AlertTitle>
            <AlertDescription>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Missing photo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(gate.missing ?? []).map((m) => (
                    <TableRow key={`${m.packageId}-${m.stage}`}>
                      <TableCell>
                        <button className="text-primary underline" onClick={() => navigate(`/ops/packages/${m.packageId}`)}>
                          #{m.packageId}
                        </button>
                      </TableCell>
                      <TableCell>{m.customerName ?? '—'}</TableCell>
                      <TableCell>{m.stage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AlertDescription>
          </Alert>
        )}

        <InformationWidget
          title="Shipment Info"
          fields={SHIPMENT_INFO_FIELDS}
          data={shipmentDisplay as never}
          actions={editInfoAction}
        />

        {(data.maxWeightKg > 0 || data.maxCbm > 0) && (
          <MainPageSection title="Container Capacity">
            {data.maxCbm > 0 &&
              (() => {
                const pct = Math.min((data.totalCbm / data.maxCbm) * 100, 100);
                return (
                  <div className="mb-3">
                    <p className="text-sm mb-1">
                      CBM: {data.totalCbm} / {data.maxCbm} ({pct.toFixed(1)}%)
                    </p>
                    <Progress value={pct} />
                  </div>
                );
              })()}
            {data.maxWeightKg > 0 &&
              (() => {
                const pct = Math.min((data.totalWeightKg / data.maxWeightKg) * 100, 100);
                return (
                  <div>
                    <p className="text-sm mb-1">
                      Weight: {(data.totalWeightKg / 1000).toFixed(3)} /{' '}
                      {(data.maxWeightKg / 1000).toFixed(3)} t ({pct.toFixed(1)}%)
                    </p>
                    <Progress value={pct} />
                  </div>
                );
              })()}
          </MainPageSection>
        )}

        {['Departed', 'Arrived', 'Closed'].includes(data.status) && (
          <InformationWidget title="Financial Summary" fields={financialFields} data={financialData as never} />
        )}

        {canSendWhatsApp(role) && (
          <WhatsAppCampaignCards
            shipmentId={id}
            shipmentStatus={data.status}
            customerCount={uniqueCustomerCount}
          />
        )}

        <FxSnapshotsSection shipmentId={id} canManage={canManageShipments(role)} />

        {canExport(role) && EXPORTABLE_STATUSES.has(data.status) && (
          <MainPageSection title="Shipment Reports">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => runExport('bol-report')}>
                <FileDown className="mr-2 size-4" /> BOL report
              </Button>
              <Button variant="outline" onClick={() => runExport('customer-invoices-excel')}>
                <FileDown className="mr-2 size-4" /> Customer Invoices
              </Button>
              <Button variant="outline" onClick={() => runExport('commercial-documents')}>
                <FileDown className="mr-2 size-4" /> Commercial Invoice + Packing List
              </Button>
            </div>
          </MainPageSection>
        )}

        {canViewActivityLog(role) && (audit.data ?? []).length > 0 && (
          <MainPageSection title="Activity Log">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(audit.data ?? []).map((log, idx) => {
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
          </MainPageSection>
        )}

        <MainPageSection
          title="Packages"
          actions={
            canManageShipments(role) && CAN_ADD_PACKAGE.has(data.status) ? (
              <Button size="sm" onClick={() => setAddPkgOpen(true)}>
                + Add Package
              </Button>
            ) : null
          }
        >
          {Object.keys(statusCounts).length > 0 && (
            <Card className="mb-3 bg-muted/40">
              <CardContent className="p-3 flex flex-wrap gap-1.5">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <Badge
                    key={status}
                    className="font-semibold"
                    style={{
                      backgroundColor: PKG_STATUS_CHIPS[status]?.backgroundColor ?? '#e0e0e0',
                      color: PKG_STATUS_CHIPS[status]?.color ?? '#333',
                    }}
                  >
                    {(PKG_STATUS_LABELS[status] ?? status) + `: ${count}`}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
          {missingDep.length > 0 && (
            <Alert className="mb-2">
              <AlertCircle className="size-4" />
              <AlertDescription>
                {missingDep.length} package(s) missing departure photos:{' '}
                {missingDep.map((p) => `#${p.id} (${p.customerName ?? p.customerId})`).join(', ')}
              </AlertDescription>
            </Alert>
          )}
          {missingArr.length > 0 && (
            <Alert className="mb-2">
              <AlertCircle className="size-4" />
              <AlertDescription>
                {missingArr.length} package(s) missing arrival photos:{' '}
                {missingArr.map((p) => `#${p.id} (${p.customerName ?? p.customerId})`).join(', ')}
              </AlertDescription>
            </Alert>
          )}
          {shipmentPackages.length === 0 ? (
            <EmptyState message="No packages in this shipment yet." />
          ) : (
            <EnhancedTable
              title="Packages in Shipment"
              header={packageHeaders}
              data={tableData as never}
              defaultOrder="id"
              defaultDirection="desc"
              selectionEnabled={canBulkTransitionPackages(role)}
              renderBulkActions={(selectedIds, clear) =>
                BULK_ACTIONS.map((a) => {
                  const eligible = selectedIds.every((sid) => {
                    const status = (tableData[sid] as ShipmentPackage | undefined)?.status;
                    if (a.movable) return MOVABLE.has(status ?? '');
                    return a.cancellable ? CANCELLABLE.has(status ?? '') : status === a.required;
                  });
                  return (
                    <Button
                      key={a.key}
                      size="sm"
                      variant={a.cancellable ? 'destructive' : 'outline'}
                      disabled={!eligible}
                      onClick={() =>
                        dispatch(
                          OpenConfirmation({
                            title: a.title,
                            message: a.confirm.replace('{n}', String(selectedIds.length)),
                            destructive: a.cancellable,
                            onSubmit: () =>
                              a.movable
                                ? moveToNext(selectedIds.map(Number), clear)
                                : bulkTransition(selectedIds.map(Number), a.key, clear),
                          }),
                        )
                      }
                    >
                      {a.title}
                    </Button>
                  );
                })
              }
            />
          )}
        </MainPageSection>
      </DetailPageLayout>

      <AddPackageDialog
        open={addPkgOpen}
        onClose={() => setAddPkgOpen(false)}
        shipmentId={id}
        onSaved={() => detail.reload()}
      />

      <EditShipmentDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        shipmentId={id}
        shipmentData={{
          tiiuCode: data.tiiuCode ?? null,
          plannedDepartureDate: data.plannedDepartureDate,
          plannedArrivalDate: data.plannedArrivalDate,
          maxWeightKg: data.maxWeightKg,
          maxCbm: data.maxCbm,
        }}
        onSaved={() => detail.reload()}
      />

      {editingPkgId && tableData[editingPkgId] && (
        <EditPackageDialog
          open
          onClose={() => setEditingPkgId(null)}
          packageId={editingPkgId}
          packageData={{
            weightKg: (tableData[editingPkgId] as ShipmentPackage).weightKg ?? null,
            cbm: (tableData[editingPkgId] as ShipmentPackage).cbm ?? null,
            note: (tableData[editingPkgId] as ShipmentPackage).note ?? null,
          }}
          onSaved={() => detail.reload()}
        />
      )}

      {photosPkgId !== null && (
        <PhotoGalleryModal
          open
          onClose={() => setPhotosPkgId(null)}
          packageId={photosPkgId}
          media={photoLoader.data ?? []}
          onChanged={() => {
            photoLoader.reload();
            detail.reload();
          }}
          canDelete={canManageShipments(role)}
        />
      )}

      <ReadyToDepartPreviewDialog
        open={!!rtdPreview}
        onClose={() => setRtdPreview(null)}
        previewData={rtdPreview}
        onConfirm={() => {
          transition('ready-to-depart');
          setRtdPreview(null);
        }}
        isConfirming={false}
      />
    </>
  );
}
