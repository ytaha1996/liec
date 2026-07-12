import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, TableFilterTypes, type EnhanceTableHeaderTypes, type ITableFilterType } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { GenericInput } from '@/components/inputs';
import { TableSkeleton, EmptyState } from '@/components/feedback';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canManageShipments } from '@/helpers/rbac';
import { PKG_STATUS_CHIPS, BOOL_CHIPS } from '@/constants/statusColors';
import { PKG_STATUS_LABELS } from '@/constants/statusLabels';
import { EditPackageDialog } from './components/EditPackageDialog';

const ENDPOINT = '/api/packages';

interface PackageRow {
  id: number;
  shipmentId?: number;
  shipmentRefCode?: string;
  customerId: number;
  customerName?: string;
  status: string;
  hasDeparturePhotos: boolean;
  hasArrivalPhotos: boolean;
  weightKg?: number | null;
  cbm?: number | null;
  note?: string | null;
}

const buildAutoAssignFields = (
  customersItems: Record<string, string>,
  warehousesItems: Record<string, string>,
  suppliersItems: Record<string, string>,
): FieldMap => ({
  customerId: {
    type: DynamicField.SELECT,
    name: 'customerId',
    title: 'Customer',
    required: true,
    items: customersItems,
    value: '',
    grid: { sm: 6, md: 6 },
  },
  provisionMethod: {
    type: DynamicField.SELECT,
    name: 'provisionMethod',
    title: 'Provision Method',
    required: true,
    items: {
      CustomerProvided: 'Customer Provided',
      ProcuredForCustomer: 'Procured For Customer',
    },
    value: 'CustomerProvided',
    grid: { sm: 6, md: 6 },
  },
  originWarehouseId: {
    type: DynamicField.SELECT,
    name: 'originWarehouseId',
    title: 'Origin Warehouse',
    required: true,
    items: warehousesItems,
    value: '',
    grid: { sm: 6, md: 6 },
  },
  destinationWarehouseId: {
    type: DynamicField.SELECT,
    name: 'destinationWarehouseId',
    title: 'Destination Warehouse',
    required: true,
    items: warehousesItems,
    value: '',
    grid: { sm: 6, md: 6 },
  },
  soSupplierId: {
    type: DynamicField.SELECT,
    name: 'soSupplierId',
    title: 'Supplier',
    items: suppliersItems,
    value: '',
    conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
    conditionalRequired: (v) => v.provisionMethod === 'ProcuredForCustomer',
    grid: { sm: 6, md: 6 },
  },
  soName: {
    type: DynamicField.TEXT,
    name: 'soName',
    title: 'Item / Order Name',
    value: '',
    conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
    conditionalRequired: (v) => v.provisionMethod === 'ProcuredForCustomer',
    grid: { sm: 6, md: 6 },
  },
  soPurchasePrice: {
    type: DynamicField.NUMBER,
    name: 'soPurchasePrice',
    title: 'Purchase Price',
    value: '',
    min: 0,
    conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
    conditionalRequired: (v) => v.provisionMethod === 'ProcuredForCustomer',
    grid: { sm: 6, md: 6 },
  },
  soDetails: {
    type: DynamicField.TEXT,
    name: 'soDetails',
    title: 'Details',
    value: '',
    conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
    grid: { sm: 6, md: 6 },
  },
});

export default function PackagesPage() {
  usePageTitle('Packages');
  const navigate = useNavigate();
  const role = useUserRole();
  const canManage = canManageShipments(role);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);

  const packages = useLoader<PackageRow[]>(() =>
    getJson<PackageRow[]>(debounced ? `${ENDPOINT}?q=${encodeURIComponent(debounced)}` : ENDPOINT),
  );
  const customers = useLoader<Array<{ id: number; name: string }>>(() =>
    getJson('/api/customers'),
  );
  const warehouses = useLoader<Array<{ id: number; name: string; code: string }>>(() =>
    getJson('/api/warehouses'),
  );
  const suppliers = useLoader<Array<{ id: number; name: string }>>(() =>
    getJson('/api/suppliers'),
  );

  const { initializing, error } = useInitializeFunction(
    [packages.reload, customers.reload, warehouses.reload, suppliers.reload],
    [debounced],
  );

  const customersItems = useMemo(
    () =>
      (customers.data ?? []).reduce<Record<string, string>>((acc, c) => {
        acc[String(c.id)] = `${c.name} (#${c.id})`;
        return acc;
      }, {}),
    [customers.data],
  );
  const customersMap = useMemo(
    () =>
      (customers.data ?? []).reduce<Record<number, string>>((acc, c) => {
        acc[c.id] = `${c.name} (#${c.id})`;
        return acc;
      }, {}),
    [customers.data],
  );
  const warehousesItems = useMemo(
    () =>
      (warehouses.data ?? []).reduce<Record<string, string>>((acc, w) => {
        acc[String(w.id)] = `${w.name} (${w.code})`;
        return acc;
      }, {}),
    [warehouses.data],
  );
  const suppliersItems = useMemo(
    () =>
      (suppliers.data ?? []).reduce<Record<string, string>>((acc, s) => {
        acc[String(s.id)] = s.name;
        return acc;
      }, {}),
    [suppliers.data],
  );

  const autoAssign = async (values: Record<string, unknown>): Promise<boolean> => {
    const body: Record<string, unknown> = {
      customerId: Number(values.customerId),
      provisionMethod: values.provisionMethod,
      supplyOrderId: null,
      originWarehouseId: Number(values.originWarehouseId),
      destinationWarehouseId: Number(values.destinationWarehouseId),
    };
    if (values.provisionMethod === 'ProcuredForCustomer') {
      body.supplyOrder = {
        supplierId: Number(values.soSupplierId),
        name: values.soName,
        purchasePrice: Number(values.soPurchasePrice),
        details: values.soDetails || null,
      };
    }
    try {
      const result = await postJson<{ id: number }>(`${ENDPOINT}/auto-assign`, body);
      toast.success('Package auto-assigned to container');
      setAutoAssignOpen(false);
      navigate(`/ops/packages/${result.id}`);
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const tableData = (packages.data ?? []).reduce<Record<string, Omit<PackageRow, 'hasDeparturePhotos' | 'hasArrivalPhotos'> & { customer: string; hasDeparturePhotos: string; hasArrivalPhotos: string }>>(
    (acc, p) => {
      acc[String(p.id)] = {
        ...p,
        customer: p.customerName ?? customersMap[p.customerId] ?? `#${p.customerId}`,
        hasDeparturePhotos: String(p.hasDeparturePhotos),
        hasArrivalPhotos: String(p.hasArrivalPhotos),
      };
      return acc;
    },
    {},
  );

  const headers: EnhanceTableHeaderTypes[] = [
    {
      id: 'id',
      label: 'Package ID',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_tid, row) => navigate(`/ops/packages/${row.id}`),
    },
    {
      id: 'shipmentRefCode',
      label: 'Shipment',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_tid, row) => navigate(`/ops/shipments/${row.shipmentId}`),
    },
    { id: 'customer', label: 'Customer', type: EnhancedTableColumnType.TEXT },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: PKG_STATUS_CHIPS,
      chipLabels: PKG_STATUS_LABELS,
    },
    {
      id: 'hasDeparturePhotos',
      label: 'Departure Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: BOOL_CHIPS,
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'hasArrivalPhotos',
      label: 'Arrival Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: BOOL_CHIPS,
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: [
        {
          icon: <Pencil className="size-4" />,
          label: 'Edit',
          onClick: (id) => setEditingId(id),
          hidden: (row) =>
            !canManage ||
            ['Shipped', 'ArrivedAtDestination', 'ReadyForHandout', 'HandedOut', 'Cancelled'].includes(
              row.status as string,
            ),
        },
      ],
    },
  ];

  const filters: ITableFilterType[] = [
    { name: 'status', title: 'Status', type: TableFilterTypes.SELECT, options: PKG_STATUS_LABELS },
    {
      name: 'hasDeparturePhotos',
      title: 'Departure Photos',
      type: TableFilterTypes.SELECT,
      options: { true: 'Yes', false: 'No' },
    },
    {
      name: 'hasArrivalPhotos',
      title: 'Arrival Photos',
      type: TableFilterTypes.SELECT,
      options: { true: 'Yes', false: 'No' },
    },
  ];

  if (error)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load packages.</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <>
      <MainPageTitle
        title="Packages"
        action={
          canManage ? { title: 'Create Package', onClick: () => setAutoAssignOpen(true) } : undefined
        }
      />
      <div className="px-4 sm:px-6 pb-6 space-y-4">
        <div className="w-full sm:w-80">
          <GenericInput
            name="search"
            title=""
            value={search}
            onChange={setSearch}
            placeholder="Search by Package ID or Customer"
          />
        </div>
        {initializing ? (
          <TableSkeleton rows={6} columns={7} />
        ) : Object.keys(tableData).length === 0 ? (
          <EmptyState message="No packages found." hint="Create one to get started." />
        ) : (
          <EnhancedTable
            title="Packages"
            header={headers}
            data={tableData as never}
            defaultOrder="id"
            defaultDirection="desc"
            filters={filters}
          />
        )}
      </div>

      <GenericDialog
        open={autoAssignOpen}
        onClose={() => setAutoAssignOpen(false)}
        title="Create Package"
      >
        <DynamicFormWidget
          fields={buildAutoAssignFields(customersItems, warehousesItems, suppliersItems)}
          onSubmit={autoAssign}
          drawerMode
        />
      </GenericDialog>

      {editingId && tableData[editingId] && (
        <EditPackageDialog
          open
          onClose={() => setEditingId(null)}
          packageId={editingId}
          packageData={{
            weightKg: tableData[editingId].weightKg ?? null,
            cbm: tableData[editingId].cbm ?? null,
            note: tableData[editingId].note ?? null,
          }}
          onSaved={() => {
            setEditingId(null);
            packages.reload();
          }}
        />
      )}
    </>
  );
}
