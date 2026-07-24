import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumbs } from '@/components/misc';
import { StatusBadge } from '@/components/misc';
import { DetailPageLayout, MainPageSection, type MainPageAction } from '@/components/layout';
import { InformationWidget, InformationWidgetFieldTypes, type IInformationWidgetField } from '@/components/information-widget';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { Loader, EmptyState } from '@/components/feedback';
import { MediaStageCards, PhotoGalleryModal, PackageDocuments, type MediaItem } from '@/components/media';
import { getJson, postJson, deleteJson } from '@/api/client';
import { parseApiError, type GateError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canTransitionPackage, canEditPackageItems, canEditPackageWeight, canUploadPhotos, canOverridePricing, canViewActivityLog } from '@/helpers/rbac';
import { formatAuditEntry } from '@/helpers/audit-utils';
import { formatPriceWithFlag } from '@/helpers/format-price';
import { convertPrice, type CurrencyRow } from '@/helpers/fx-rates';
import { UNIT_LABEL_EN, fetchUnits, type LookupItem } from '@/api/lookups';
import { PKG_STATUS_CHIPS } from '@/constants/statusColors';
import { PKG_STATUS_LABELS, SUPPLY_ORDER_STATUS_LABELS, SHIPMENT_STATUS_LABELS } from '@/constants/statusLabels';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';
import { ItemDialog } from './components/ItemDialog';
import { BulkAddItemsDialog } from './components/BulkAddItemsDialog';
import { PricingOverrideDialog } from './components/PricingOverrideDialog';
import { EditPackageDialog } from './components/EditPackageDialog';

const ALLOWED_TRANSITIONS: Record<
  string,
  { label: string; action: string; isCancel?: boolean; confirmMessage: string; requiredShipmentStatus?: string[] }[]
> = {
  Draft: [
    { label: 'Receive', action: 'receive', confirmMessage: 'Receive this package into the warehouse?' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package?' },
  ],
  Received: [
    { label: 'Pack', action: 'pack', confirmMessage: 'Mark this package as Packed?' },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package?' },
  ],
  Packed: [
    { label: 'Ready To Ship', action: 'ready-to-ship', confirmMessage: 'Mark as Ready To Ship?', requiredShipmentStatus: ['Scheduled', 'ReadyToDepart', 'Departed', 'Arrived', 'Closed'] },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package?' },
  ],
  ReadyToShip: [
    { label: 'Ship', action: 'ship', confirmMessage: 'Ship this package? Departure photos required.', requiredShipmentStatus: ['Departed', 'Arrived', 'Closed'] },
    { label: 'Cancel', action: 'cancel', isCancel: true, confirmMessage: 'Cancel this package?' },
  ],
  Shipped: [{ label: 'Arrive Destination', action: 'arrive-destination', confirmMessage: 'Mark as Arrived?', requiredShipmentStatus: ['Arrived', 'Closed'] }],
  ArrivedAtDestination: [{ label: 'Ready For Handout', action: 'ready-for-handout', confirmMessage: 'Mark as Ready For Handout?', requiredShipmentStatus: ['Arrived', 'Closed'] }],
  ReadyForHandout: [{ label: 'Handout', action: 'handout', confirmMessage: 'Hand out this package? Arrival photos required.', requiredShipmentStatus: ['Arrived', 'Closed'] }],
  HandedOut: [],
  Cancelled: [],
};

const PRICING_OVERRIDE_LOCKED = new Set(['HandedOut', 'Cancelled']);

const PKG_INFO_FIELDS: IInformationWidgetField[] = [
  { type: InformationWidgetFieldTypes.Text, name: 'shipmentRef', title: 'Shipment' },
  { type: InformationWidgetFieldTypes.Text, name: 'customer', title: 'Customer' },
  { type: InformationWidgetFieldTypes.Text, name: 'provisionMethod', title: 'Provision Method' },
  { type: InformationWidgetFieldTypes.Text, name: 'supplyOrderInfo', title: 'Supply Order' },
  { type: InformationWidgetFieldTypes.Datetime, name: 'createdAt', title: 'Created At' },
  { type: InformationWidgetFieldTypes.Text, name: 'note', title: 'Note', width: 'full' },
];

interface PackageData {
  id: number;
  customerId: number;
  shipmentId?: number;
  supplyOrderId?: number;
  provisionMethod: string;
  status: string;
  currency?: string;
  cbm?: number;
  weightKg?: number;
  appliedRatePerCbm?: number;
  appliedRatePerKg?: number;
  chargeAmount?: number;
  hasPricingOverride?: boolean;
  note?: string | null;
  createdAt: string;
}

interface PackageItem {
  id: number;
  goodTypeId: number;
  goodTypeName?: string;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  unitPriceCurrency?: string;
  note?: string | null;
}

interface PackageDetailResponse {
  package?: PackageData;
  items?: PackageItem[];
}

interface AuditLog {
  id?: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  createdAt?: string;
}

interface PricingOverride {
  id: number;
  overrideType: string;
  originalValue: number;
  newValue: number;
  reason: string;
  createdAt: string;
}

export default function PackageDetailPage() {
  const { id = '0' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const role = useUserRole();
  // Documents write access matches the backend gate (Admin/Manager).
  const canManageDocs = canEditPackageItems(role);
  usePageTitle(`Package #${id}`);

  const [gate, setGate] = useState<GateError | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryStage, setGalleryStage] = useState<string | undefined>();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackageItem | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideType, setOverrideType] = useState<'RatePerKg' | 'RatePerCbm' | 'TotalCharge'>('RatePerKg');
  const [editPkgOpen, setEditPkgOpen] = useState(false);

  const pkg = useLoader<PackageDetailResponse | PackageData>(() => getJson(`/api/packages/${id}`));
  const media = useLoader<MediaItem[]>(() => getJson<MediaItem[]>(`/api/packages/${id}/media`));
  const overrides = useLoader<PricingOverride[]>(() =>
    getJson<PricingOverride[]>(`/api/packages/${id}/pricing-overrides`),
  );
  const audit = useLoader<AuditLog[]>(() => getJson<AuditLog[]>(`/api/packages/${id}/audit-log`));
  const customers = useLoader<Array<{ id: number; name: string }>>(() => getJson('/api/customers'));
  const goods = useLoader<Array<{ id: number; nameEn: string }>>(() => getJson('/api/good-types'));
  const currencies = useLoader<CurrencyRow[]>(() => getJson<CurrencyRow[]>('/api/currencies'));
  const warehouses = useLoader<Array<{ id: number; name: string }>>(() => getJson('/api/warehouses'));
  const units = useLoader<LookupItem[]>(fetchUnits);

  const { initialized, error } = useInitializeFunction(
    [pkg.reload, media.reload, overrides.reload, audit.reload, customers.reload, goods.reload, currencies.reload, warehouses.reload, units.reload],
    [id],
  );

  const pkgData: PackageData | undefined = useMemo(() => {
    const d = pkg.data as PackageDetailResponse | PackageData | undefined;
    if (!d) return undefined;
    return 'package' in d && d.package ? d.package : (d as PackageData);
  }, [pkg.data]);

  const itemsRaw = useMemo<PackageItem[]>(() => {
    const d = pkg.data as PackageDetailResponse | undefined;
    return d?.items ?? [];
  }, [pkg.data]);

  // Side loaders for shipment & supply order — fetched after pkg loads.
  const shipment = useLoader<{ refCode: string; status: string; originWarehouseId: number; destinationWarehouseId: number; plannedDepartureDate: string; plannedArrivalDate: string } | null>(
    async () => (pkgData?.shipmentId ? getJson(`/api/shipments/${pkgData.shipmentId}`) : null),
  );
  const supplyOrder = useLoader<{ id: number; status: string } | null>(async () =>
    pkgData?.supplyOrderId ? getJson(`/api/supply-orders/${pkgData.supplyOrderId}`) : null,
  );

  useInitializeFunction([shipment.reload, supplyOrder.reload], [pkgData?.shipmentId, pkgData?.supplyOrderId]);

  const transition = async (action: string) => {
    try {
      await postJson(`/api/packages/${id}/${action}`);
      toast.success('Package updated');
      setGate(null);
      await pkg.reload();
      await audit.reload();
    } catch (e) {
      const parsed = parseApiError(e);
      if (parsed.code === 'PHOTO_GATE_FAILED') {
        setGate(parsed as unknown as GateError);
      }
      toast.error(parsed.message);
    }
  };

  const deleteItem = (itemId: number) => {
    dispatch(
      OpenConfirmation({
        title: 'Delete Item',
        message: 'Delete this item?',
        destructive: true,
        confirmText: 'Delete',
        onSubmit: async () => {
          try {
            await deleteJson(`/api/packages/${id}/items/${itemId}`);
            toast.success('Item deleted');
            await pkg.reload();
          } catch (e) {
            toast.error(parseApiError(e).message);
          }
        },
      }),
    );
  };

  if (!initialized) return <Loader fullScreen />;
  if (error || !pkgData)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Package not found.</AlertDescription>
        </Alert>
      </div>
    );

  const customersMap = (customers.data ?? []).reduce<Record<number, string>>((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});
  const goodsMap = (goods.data ?? []).reduce<Record<number, string>>((acc, g) => {
    acc[g.id] = g.nameEn;
    return acc;
  }, {});
  const warehousesMap = (warehouses.data ?? []).reduce<Record<number, string>>((acc, w) => {
    acc[w.id] = w.name;
    return acc;
  }, {});

  const displayCcy = pkgData.currency ?? 'USD';
  const currenciesList = currencies.data ?? [];
  const displaySymbol =
    currenciesList.find((c) => c.code.toUpperCase() === displayCcy.toUpperCase())?.symbol ?? displayCcy;

  const itemsTableData = itemsRaw.reduce<Record<string, PackageItem & Record<string, unknown>>>(
    (acc, item) => {
      const storedAmount = item.unitPrice == null ? null : Number(item.unitPrice);
      const storedCcy = item.unitPriceCurrency ?? 'USD';
      const display =
        storedAmount == null
          ? { text: '—', converted: false, tooltip: undefined }
          : formatPriceWithFlag(
              convertPrice(currenciesList, storedAmount, storedCcy, displayCcy),
              displayCcy,
              storedCcy,
              storedAmount,
              displaySymbol,
            );
      acc[String(item.id)] = {
        ...item,
        goodName: item.goodTypeName || goodsMap[item.goodTypeId] || `#${item.goodTypeId}`,
        unitLabel: UNIT_LABEL_EN[item.unit] ?? item.unit ?? '—',
        unitPriceDisplay: display.tooltip
          ? `${display.text}  (orig: ${display.tooltip.replace(/^Original:\s*/, '')})`
          : display.text,
      };
      return acc;
    },
    {},
  );

  const itemHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'goodName', label: 'Good', type: EnhancedTableColumnType.TEXT },
    { id: 'quantity', label: 'Quantity', type: EnhancedTableColumnType.NUMBER, numeric: true },
    { id: 'unitLabel', label: 'Unit', type: EnhancedTableColumnType.TEXT },
    { id: 'unitPriceDisplay', label: 'Unit Price', type: EnhancedTableColumnType.TEXT },
    { id: 'note', label: 'Note', type: EnhancedTableColumnType.TEXT },
    {
      id: 'itemActions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: canEditPackageItems(role)
        ? [
            {
              icon: <Pencil className="size-4" />,
              label: 'Edit',
              onClick: (_id, row) => {
                setEditingItem(row as unknown as PackageItem);
                setAddItemOpen(true);
              },
            },
            {
              icon: <Trash2 className="size-4" />,
              label: 'Delete',
              onClick: (_id, row) => deleteItem((row as unknown as PackageItem).id),
            },
          ]
        : [],
    },
  ];

  const goodsItems = goodsMap as unknown as Record<string, string>;
  const unitItems = (units.data ?? []).reduce<Record<string, string>>((acc, u) => {
    acc[u.code] = u.label;
    return acc;
  }, {});

  const pkgDisplay = {
    ...pkgData,
    customer: customersMap[pkgData.customerId] ?? `#${pkgData.customerId}`,
    shipmentRef: shipment.data?.refCode ?? (pkgData.shipmentId ? `#${pkgData.shipmentId}` : '—'),
    provisionMethod:
      pkgData.provisionMethod === 'ProcuredForCustomer' ? 'Procured For Customer' : 'Customer Provided',
    supplyOrderInfo: supplyOrder.data
      ? `#${supplyOrder.data.id} — ${SUPPLY_ORDER_STATUS_LABELS[supplyOrder.data.status] ?? supplyOrder.data.status}`
      : pkgData.supplyOrderId
      ? `#${pkgData.supplyOrderId}`
      : '—',
    weightTons: (pkgData.weightKg ?? 0) / 1000,
  };

  const shipmentDisplay = shipment.data
    ? {
        ...shipment.data,
        originWarehouse: warehousesMap[shipment.data.originWarehouseId] ?? `#${shipment.data.originWarehouseId}`,
        destinationWarehouse:
          warehousesMap[shipment.data.destinationWarehouseId] ?? `#${shipment.data.destinationWarehouseId}`,
        status: SHIPMENT_STATUS_LABELS[shipment.data.status] ?? shipment.data.status,
      }
    : null;

  const shipmentInfoFields: IInformationWidgetField[] = [
    {
      type: InformationWidgetFieldTypes.Text,
      name: 'refCode',
      title: 'Ref Code',
      action: {
        label: 'View Shipment',
        onClick: () => navigate(`/ops/shipments/${pkgData.shipmentId}`),
      },
    },
    { type: InformationWidgetFieldTypes.Text, name: 'status', title: 'Status' },
    { type: InformationWidgetFieldTypes.Text, name: 'originWarehouse', title: 'Origin' },
    { type: InformationWidgetFieldTypes.Text, name: 'destinationWarehouse', title: 'Destination' },
    { type: InformationWidgetFieldTypes.Date, name: 'plannedDepartureDate', title: 'Planned Departure' },
    { type: InformationWidgetFieldTypes.Date, name: 'plannedArrivalDate', title: 'Planned Arrival' },
  ];

  const overrideAction = (kind: 'RatePerKg' | 'RatePerCbm' | 'TotalCharge') =>
    canOverridePricing(role) && !PRICING_OVERRIDE_LOCKED.has(pkgData.status)
      ? {
          action: {
            label: 'Override',
            onClick: () => {
              setOverrideType(kind);
              setOverrideOpen(true);
            },
          },
        }
      : {};

  const pricingFields: IInformationWidgetField[] = [
    { type: InformationWidgetFieldTypes.Text, name: 'cbm', title: 'CBM' },
    { type: InformationWidgetFieldTypes.Text, name: 'weightTons', title: 'Weight (t)' },
    { type: InformationWidgetFieldTypes.Text, name: 'appliedRatePerCbm', title: 'Rate Per CBM', ...overrideAction('RatePerCbm') },
    { type: InformationWidgetFieldTypes.Text, name: 'appliedRatePerKg', title: 'Rate Per Kg', ...overrideAction('RatePerKg') },
    { type: InformationWidgetFieldTypes.Currency, name: 'chargeAmount', title: 'Charge Amount', currency: displayCcy, ...overrideAction('TotalCharge') },
  ];

  const titleActions: MainPageAction[] = (ALLOWED_TRANSITIONS[pkgData.status] ?? [])
    .filter(({ action }) => canTransitionPackage(role, action))
    .map(({ label, action, isCancel, confirmMessage, requiredShipmentStatus }) => ({
      label,
      disabled:
        requiredShipmentStatus != null &&
        (!shipment.data?.status || !requiredShipmentStatus.includes(shipment.data.status)),
      destructive: isCancel,
      onClick: () =>
        dispatch(
          OpenConfirmation({
            title: label,
            message: confirmMessage,
            destructive: isCancel,
            onSubmit: () => transition(action),
          }),
        ),
    }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Packages', href: '/ops/packages' },
          ...(pkgData.shipmentId
            ? [{ label: `Shipment #${pkgData.shipmentId}`, href: `/ops/shipments/${pkgData.shipmentId}` }]
            : []),
          { label: `Package #${id}` },
        ]}
      />
      <DetailPageLayout
        title={`Package #${id}`}
        chips={
          <StatusBadge value={pkgData.status} labels={PKG_STATUS_LABELS} colors={PKG_STATUS_CHIPS} />
        }
        actions={titleActions}
      >
        {gate?.code === 'PHOTO_GATE_FAILED' && (
          <Alert variant="destructive">
            <AlertTitle>{gate.message}</AlertTitle>
            <AlertDescription>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(gate.missing ?? []).map((m) => (
                    <TableRow key={`${m.packageId}-${m.stage}`}>
                      <TableCell>
                        <button
                          className="text-primary underline"
                          onClick={() => navigate(`/ops/packages/${m.packageId}`)}
                        >
                          #{m.packageId}
                        </button>
                      </TableCell>
                      <TableCell>{m.stage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview">
          {/* Horizontal-scroll wrapper so the tabs never wrap to two rows on
              narrow screens — much cleaner than the 2x2 grid we had. */}
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="items">Items & Pricing</TabsTrigger>
              {canUploadPhotos(role) && <TabsTrigger value="photos">Photos</TabsTrigger>}
              {canViewActivityLog(role) && <TabsTrigger value="activity">Activity</TabsTrigger>}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <InformationWidget title="Package Info" fields={PKG_INFO_FIELDS} data={pkgDisplay as never} />
            {shipmentDisplay && (
              <InformationWidget
                title="Shipment Info"
                fields={shipmentInfoFields}
                data={shipmentDisplay as never}
              />
            )}
          </TabsContent>

          <TabsContent value="items" className="mt-4 space-y-4">
            <MainPageSection
              title="Items"
              actions={
                canEditPackageItems(role) ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingItem(null);
                        setAddItemOpen(true);
                      }}
                    >
                      <Plus className="mr-1 size-4" />
                      Add Item
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setBulkAddOpen(true)}>
                      Bulk Add
                    </Button>
                  </>
                ) : null
              }
            >
              {Object.keys(itemsTableData).length === 0 ? (
                <EmptyState message="No items yet." />
              ) : (
                <EnhancedTable
                  title="Package Items"
                  header={itemHeaders}
                  data={itemsTableData as never}
                  defaultOrder="goodName"
                  defaultDirection="asc"
                />
              )}
            </MainPageSection>

            <InformationWidget
              title={`Pricing Snapshot${pkgData.hasPricingOverride ? ' (Override Active)' : ''}`}
              fields={pricingFields}
              data={pkgDisplay as never}
            >
              {canEditPackageWeight(role) &&
                ['Draft', 'Received', 'Packed', 'ReadyToShip', 'Shipped'].includes(pkgData.status) && (
                  <Button variant="outline" size="sm" onClick={() => setEditPkgOpen(true)}>
                    <Pencil className="mr-1 size-4" /> Edit Weight / CBM / Note
                  </Button>
                )}
            </InformationWidget>

            {(overrides.data ?? []).length > 0 && (
              <MainPageSection title="Pricing Override History">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From → To</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overrides.data ?? []).map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>{o.overrideType}</TableCell>
                        <TableCell>
                          {o.originalValue} → {o.newValue}
                        </TableCell>
                        <TableCell className="max-w-xs">{o.reason}</TableCell>
                        <TableCell>{new Date(o.createdAt).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </MainPageSection>
            )}
          </TabsContent>

          {canUploadPhotos(role) && (
            <TabsContent value="photos" className="mt-4 space-y-4">
              <MainPageSection title="Photos">
                <MediaStageCards
                  packageId={id}
                  media={media.data ?? []}
                  onUploaded={() => {
                    media.reload();
                    pkg.reload();
                  }}
                  onOpenGallery={(stage) => {
                    setGalleryStage(stage);
                    setGalleryOpen(true);
                  }}
                  canUpload={canUploadPhotos(role)}
                />
              </MainPageSection>
              <PackageDocuments packageId={id} canWrite={canManageDocs} />
            </TabsContent>
          )}

          {canViewActivityLog(role) && (
            <TabsContent value="activity" className="mt-4">
              <MainPageSection title="Activity Log">
                {(audit.data ?? []).length > 0 ? (
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
                            <TableCell>
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState message="No activity yet." />
                )}
              </MainPageSection>
            </TabsContent>
          )}
        </Tabs>
      </DetailPageLayout>

      <ItemDialog
        open={addItemOpen}
        onClose={() => {
          setAddItemOpen(false);
          setEditingItem(null);
        }}
        packageId={id}
        editingItem={editingItem as unknown as Record<string, unknown> | null}
        goodsItems={goodsItems}
        unitItems={unitItems}
        onSaved={() => pkg.reload()}
      />

      <BulkAddItemsDialog
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        packageId={id}
        goodsItems={goodsItems}
        unitItems={unitItems}
        onSaved={() => pkg.reload()}
      />

      <PricingOverrideDialog
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        packageId={id}
        initialOverrideType={overrideType}
        onSaved={() => {
          pkg.reload();
          overrides.reload();
        }}
      />

      <EditPackageDialog
        open={editPkgOpen}
        onClose={() => setEditPkgOpen(false)}
        packageId={id}
        packageData={{
          weightKg: pkgData.weightKg ?? null,
          cbm: pkgData.cbm ?? null,
          note: pkgData.note ?? null,
        }}
        onSaved={() => pkg.reload()}
      />

      <PhotoGalleryModal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        packageId={id}
        media={media.data ?? []}
        initialStage={galleryStage}
        onChanged={() => {
          media.reload();
          pkg.reload();
        }}
        canDelete={canUploadPhotos(role)}
      />
    </>
  );
}
