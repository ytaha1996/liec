import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { parseISO, isBefore } from 'date-fns';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, TableFilterTypes, type EnhanceTableHeaderTypes, type ITableFilterType } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { TableSkeleton, EmptyState } from '@/components/feedback';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canManageShipments } from '@/helpers/rbac';
import { SHIPMENT_STATUS_CHIPS } from '@/constants/statusColors';
import { SHIPMENT_STATUS_LABELS } from '@/constants/statusLabels';

const ENDPOINT = '/api/shipments';

interface Shipment {
  id: number;
  refCode: string;
  status: string;
  plannedDepartureDate: string;
  totalWeightKg: number;
  totalCbm: number;
  maxWeightKg: number;
  maxCbm: number;
}

const buildFields = (warehousesItems: Record<string, string>): FieldMap => ({
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
  plannedDepartureDate: {
    type: DynamicField.DATE,
    name: 'plannedDepartureDate',
    title: 'Planned Departure Date',
    required: true,
    value: null,
    grid: { sm: 6, md: 6 },
  },
  plannedArrivalDate: {
    type: DynamicField.DATE,
    name: 'plannedArrivalDate',
    title: 'Planned Arrival Date',
    required: true,
    value: null,
    grid: { sm: 6, md: 6 },
    customValidator: (_v, values) => {
      const dep = values.plannedDepartureDate as string | undefined;
      const arr = values.plannedArrivalDate as string | undefined;
      if (!dep || !arr) return '';
      return isBefore(parseISO(arr), parseISO(dep)) ? 'Arrival must be on or after departure' : '';
    },
  },
  maxCbm: {
    type: DynamicField.NUMBER,
    name: 'maxCbm',
    title: 'Max CBM (0 = unlimited)',
    value: 0,
    min: 0,
    grid: { sm: 6, md: 6 },
  },
  maxWeightKg: {
    type: DynamicField.NUMBER,
    name: 'maxWeightKg',
    title: 'Max Weight (Kg, 0 = unlimited)',
    value: 0,
    min: 0,
    grid: { sm: 6, md: 6 },
  },
  tiiuCode: {
    type: DynamicField.TEXT,
    name: 'tiiuCode',
    title: 'TIIU Code',
    value: '',
  },
});

const CAPACITY_CHIPS = {
  ok: { color: '#fff', backgroundColor: '#2e7d32' },
  warning: { color: '#fff', backgroundColor: '#ed6c02' },
  danger: { color: '#fff', backgroundColor: '#c62828' },
  none: { color: '#999', backgroundColor: '#f5f5f5' },
};

export default function ShipmentsPage() {
  usePageTitle('Shipments');
  const navigate = useNavigate();
  const role = useUserRole();
  const canManage = canManageShipments(role);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Single search: EnhancedTable's built-in client-side box covers current
  // data volumes (the list endpoint returns everything). The backend `?q=`
  // stays available for future server-side pagination.
  const shipments = useLoader<Shipment[]>(() => getJson<Shipment[]>(ENDPOINT));
  const warehouses = useLoader<Array<{ id: number; name: string; code: string }>>(() =>
    getJson('/api/warehouses'),
  );
  const { initializing, error } = useInitializeFunction([shipments.reload, warehouses.reload]);

  const warehousesItems = useMemo(
    () =>
      (warehouses.data ?? []).reduce<Record<string, string>>((acc, w) => {
        acc[String(w.id)] = `${w.name} (${w.code})`;
        return acc;
      }, {}),
    [warehouses.data],
  );

  const create = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      await postJson(ENDPOINT, values);
      toast.success('Shipment created');
      setDialogOpen(false);
      await shipments.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const tableData = (shipments.data ?? []).reduce<Record<string, Shipment & Record<string, unknown>>>(
    (acc, item) => {
      const weightPct = item.maxWeightKg > 0 ? Math.round((item.totalWeightKg / item.maxWeightKg) * 100) : -1;
      const cbmPct = item.maxCbm > 0 ? Math.round((item.totalCbm / item.maxCbm) * 100) : -1;
      const level = (pct: number): string =>
        pct < 0 ? 'none' : pct > 95 ? 'danger' : pct >= 80 ? 'warning' : 'ok';
      const weightLabel =
        weightPct < 0
          ? '—'
          : `${(item.totalWeightKg / 1000).toFixed(3)}/${(item.maxWeightKg / 1000).toFixed(3)} t (${weightPct}%)`;
      const cbmLabel = cbmPct < 0 ? '—' : `${item.totalCbm}/${item.maxCbm} (${cbmPct}%)`;
      acc[String(item.id)] = {
        ...item,
        cbmCapacity: cbmLabel,
        cbmCapacityLevel: level(cbmPct),
        weightCapacity: weightLabel,
        weightCapacityLevel: level(weightPct),
      };
      return acc;
    },
    {},
  );

  const headers: EnhanceTableHeaderTypes[] = [
    {
      id: 'refCode',
      label: 'Ref Code',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_id, row) => navigate(`/ops/shipments/${row.id}`),
    },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: SHIPMENT_STATUS_CHIPS,
      chipLabels: SHIPMENT_STATUS_LABELS,
    },
    { id: 'plannedDepartureDate', label: 'Planned Departure', type: EnhancedTableColumnType.DATE },
    {
      id: 'cbmCapacity',
      label: 'CBM',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: CAPACITY_CHIPS,
      chipLabels: {},
      chipValueKey: 'cbmCapacityLevel',
    },
    {
      id: 'weightCapacity',
      label: 'Weight',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: CAPACITY_CHIPS,
      chipLabels: {},
      chipValueKey: 'weightCapacityLevel',
    },
  ];

  const filters: ITableFilterType[] = [
    { name: 'status', title: 'Status', type: TableFilterTypes.SELECT, options: SHIPMENT_STATUS_LABELS },
  ];

  if (error)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load shipments.</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <>
      <MainPageTitle
        title="Shipments"
        action={canManage ? { title: 'Create Shipment', onClick: () => setDialogOpen(true) } : undefined}
      />
      <div className="px-4 sm:px-6 pb-6 space-y-4">
        {initializing ? (
          <TableSkeleton rows={6} columns={5} />
        ) : Object.keys(tableData).length === 0 ? (
          <EmptyState message="No shipments found." hint="Create one to get started." />
        ) : (
          <EnhancedTable
            title="Shipments"
            header={headers}
            data={tableData as never}
            defaultOrder="plannedDepartureDate"
            defaultDirection="desc"
            filters={filters}
          />
        )}
      </div>

      <GenericDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Create Shipment">
        <DynamicFormWidget fields={buildFields(warehousesItems)} onSubmit={create} drawerMode />
      </GenericDialog>
    </>
  );
}
