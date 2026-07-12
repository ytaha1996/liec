import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { GenericTextArea, GenericInput } from '@/components/inputs';
import { TableSkeleton, EmptyState } from '@/components/feedback';
import { getJson, postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canWriteMasterData } from '@/helpers/rbac';
import { SUPPLY_ORDER_STATUS_LABELS } from '@/constants/statusLabels';
import { SUPPLY_ORDER_STATUS_CHIPS } from '@/constants/statusColors';

const ENDPOINT = '/api/supply-orders';

interface SupplyOrder {
  id: number;
  customerId: number;
  supplierId: number;
  packageId?: number | null;
  name: string;
  purchasePrice: number;
  details?: string | null;
  status: string;
}

interface LookupItem {
  id: number;
  name: string;
  status?: string;
}

const LIFECYCLE_ACTIONS = [
  { label: 'Approve', action: 'approve' },
  { label: 'Order', action: 'order' },
  { label: 'Deliver to Warehouse', action: 'deliver-to-warehouse' },
  { label: 'Pack into Package', action: 'pack-into-package' },
  { label: 'Close', action: 'close' },
  { label: 'Cancel', action: 'cancel' },
];

const STATUS_FOR_ACTION: Record<string, string> = {
  approve: 'Draft',
  order: 'Approved',
  'deliver-to-warehouse': 'Ordered',
  'pack-into-package': 'DeliveredToWarehouse',
  close: 'PackedIntoPackage',
};

const buildFields = (
  initial: Partial<SupplyOrder> | undefined,
  customers: Record<string, string>,
  suppliers: Record<string, string>,
  packages: Record<string, string>,
): FieldMap => ({
  customerId: {
    type: DynamicField.SELECT,
    name: 'customerId',
    title: 'Customer',
    required: true,
    items: customers,
    value: String(initial?.customerId ?? ''),
    grid: { sm: 6, md: 6 },
  },
  supplierId: {
    type: DynamicField.SELECT,
    name: 'supplierId',
    title: 'Supplier',
    required: true,
    items: suppliers,
    value: String(initial?.supplierId ?? ''),
    grid: { sm: 6, md: 6 },
  },
  packageId: {
    type: DynamicField.SELECT,
    name: 'packageId',
    title: 'Package',
    items: packages,
    value: String(initial?.packageId ?? ''),
    allowEmpty: true,
    grid: { sm: 6, md: 6 },
  },
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    value: initial?.name ?? '',
    grid: { sm: 6, md: 6 },
  },
  purchasePrice: {
    type: DynamicField.NUMBER,
    name: 'purchasePrice',
    title: 'Purchase Price',
    required: true,
    value: initial?.purchasePrice ?? '',
    min: 0,
  },
  details: {
    type: DynamicField.TEXTAREA,
    name: 'details',
    title: 'Details',
    value: initial?.details ?? '',
    grid: { sm: 12, md: 12 },
  },
});

export default function SupplyOrdersPage() {
  usePageTitle('Supply Orders');
  const role = useUserRole();
  const writable = canWriteMasterData(role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SupplyOrder | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);

  const orders = useLoader<SupplyOrder[]>(() =>
    getJson<SupplyOrder[]>(
      debounced ? `${ENDPOINT}?q=${encodeURIComponent(debounced)}` : ENDPOINT,
    ),
  );
  const customers = useLoader<LookupItem[]>(() => getJson<LookupItem[]>('/api/customers'));
  const suppliers = useLoader<LookupItem[]>(() => getJson<LookupItem[]>('/api/suppliers'));
  const packages = useLoader<LookupItem[]>(() => getJson<LookupItem[]>('/api/packages'));

  const { initializing } = useInitializeFunction(
    [orders.reload, customers.reload, suppliers.reload, packages.reload],
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
  const suppliersItems = useMemo(
    () =>
      (suppliers.data ?? []).reduce<Record<string, string>>((acc, s) => {
        acc[String(s.id)] = s.name;
        return acc;
      }, {}),
    [suppliers.data],
  );
  const packagesItems = useMemo(
    () =>
      (packages.data ?? [])
        .filter((p) => p.status !== 'Cancelled' && p.status !== 'HandedOut')
        .reduce<Record<string, string>>((acc, p) => {
          acc[String(p.id)] = `Package #${p.id}`;
          return acc;
        }, {}),
    [packages.data],
  );

  const save = async (values: Record<string, unknown>): Promise<boolean> => {
    const payload = {
      customerId: Number(values.customerId),
      supplierId: Number(values.supplierId),
      packageId: values.packageId ? Number(values.packageId) : null,
      name: values.name,
      purchasePrice: Number(values.purchasePrice),
      details: values.details || null,
    };
    try {
      if (editing) await putJson(`${ENDPOINT}/${editing.id}`, payload);
      else await postJson(ENDPOINT, payload);
      toast.success(editing ? 'Supply order updated' : 'Supply order created');
      setDialogOpen(false);
      setEditing(null);
      await orders.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const runAction = async (id: string, action: string, body?: unknown) => {
    try {
      await postJson(`${ENDPOINT}/${id}/${action}`, body);
      toast.success('Supply order updated');
      await orders.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const tableData = (orders.data ?? []).reduce<Record<string, SupplyOrder & { customer: string }>>(
    (acc, o) => {
      acc[String(o.id)] = { ...o, customer: customersMap[o.customerId] ?? `#${o.customerId}` };
      return acc;
    },
    {},
  );

  const headers: EnhanceTableHeaderTypes[] = [
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT },
    { id: 'customer', label: 'Customer', type: EnhancedTableColumnType.TEXT },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: SUPPLY_ORDER_STATUS_CHIPS,
      chipLabels: SUPPLY_ORDER_STATUS_LABELS,
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: [
        {
          icon: <Pencil className="size-4" />,
          label: 'Edit',
          onClick: (_id, row) => {
            setEditing(row as unknown as SupplyOrder);
            setDialogOpen(true);
          },
          hidden: (row) =>
            !writable || ['Closed', 'Cancelled'].includes(row.status as string),
        },
        ...LIFECYCLE_ACTIONS.map(({ label, action }) => ({
          icon: <PlayCircle className="size-4" />,
          label,
          onClick: (id: string) => {
            if (action === 'cancel') {
              setCancelTargetId(id);
              setCancelReason('');
              setCancelOpen(true);
            } else {
              runAction(id, action);
            }
          },
          hidden: (row: Record<string, unknown>) => {
            if (!writable) return true;
            if (action === 'cancel')
              return ['Closed', 'Cancelled'].includes(row.status as string);
            return row.status !== STATUS_FOR_ACTION[action];
          },
        })),
      ],
    },
  ];

  return (
    <>
      <MainPageTitle
        title="Supply Orders"
        action={
          writable
            ? {
                title: 'Create Supply Order',
                onClick: () => {
                  setEditing(null);
                  setDialogOpen(true);
                },
              }
            : undefined
        }
      />
      <div className="px-4 sm:px-6 pb-6 space-y-4">
        <div className="w-full sm:w-80">
          <GenericInput
            name="search"
            title=""
            value={search}
            onChange={setSearch}
            placeholder="Search by name"
          />
        </div>
        {initializing ? (
          <TableSkeleton rows={6} columns={4} />
        ) : Object.keys(tableData).length === 0 ? (
          <EmptyState message="No supply orders found." hint="Create one to get started." />
        ) : (
          <EnhancedTable
            title="Supply Orders"
            header={headers}
            data={tableData as never}
            defaultOrder="name"
            defaultDirection="asc"
          />
        )}
      </div>

      <GenericDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Supply Order' : 'Create Supply Order'}
      >
        <DynamicFormWidget
          fields={buildFields(editing ?? undefined, customersItems, suppliersItems, packagesItems)}
          onSubmit={save}
          drawerMode
        />
      </GenericDialog>

      <GenericDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel Supply Order"
      >
        <div className="space-y-3">
          <GenericTextArea
            name="cancelReason"
            title="Reason for cancellation"
            value={cancelReason}
            onChange={setCancelReason}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelTargetId) {
                  runAction(cancelTargetId, 'cancel', {
                    status: 'Cancelled',
                    cancelReason,
                  });
                }
                setCancelOpen(false);
              }}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </GenericDialog>
    </>
  );
}
