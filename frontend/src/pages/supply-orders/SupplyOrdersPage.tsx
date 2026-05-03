import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { getJson, postJson, putJson, parseApiError } from '../../api/client';
import { SUPPLY_ORDER_STATUS_LABELS } from '../../constants/statusLabels';
import { SUPPLY_ORDER_STATUS_CHIPS } from '../../constants/statusColors';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import EmptyState from '../../components/EmptyState';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useUserRole, canWriteMasterData } from '../../helpers/rbac';

const ENDPOINT = '/api/supply-orders';

const LIFECYCLE_ACTIONS: { label: string; action: string }[] = [
  { label: 'Approve', action: 'approve' },
  { label: 'Order', action: 'order' },
  { label: 'Deliver to Warehouse', action: 'deliver-to-warehouse' },
  { label: 'Pack into Package', action: 'pack-into-package' },
  { label: 'Close', action: 'close' },
  { label: 'Cancel', action: 'cancel' },
];

const buildFields = (
  initial: Record<string, any> | undefined,
  customersItems: Record<string, string>,
  suppliersItems: Record<string, string>,
  packagesItems: Record<string, string>,
): Record<string, DynamicFieldTypes> => ({
  customerId: {
    type: DynamicField.SELECT,
    name: 'customerId',
    title: 'Customer',
    required: true,
    disabled: false,
    items: customersItems,
    value: String(initial?.customerId ?? ''),
  },
  supplierId: {
    type: DynamicField.SELECT,
    name: 'supplierId',
    title: 'Supplier',
    required: true,
    disabled: false,
    items: suppliersItems,
    value: String(initial?.supplierId ?? ''),
  },
  packageId: {
    type: DynamicField.SELECT,
    name: 'packageId',
    title: 'Package',
    required: false,
    disabled: false,
    items: packagesItems,
    value: String(initial?.packageId ?? ''),
  },
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    disabled: false,
    value: initial?.name ?? '',
  },
  purchasePrice: {
    type: DynamicField.NUMBER,
    name: 'purchasePrice',
    title: 'Purchase Price',
    required: true,
    disabled: false,
    value: initial?.purchasePrice ?? '',
  },
  details: {
    type: DynamicField.TEXTAREA,
    name: 'details',
    title: 'Details',
    required: false,
    disabled: false,
    value: initial?.details ?? '',
  },
});

const SupplyOrdersPage = () => {
  const qc = useQueryClient();
  const role = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [search, setSearch] = useState('');

  const { data = [] } = useQuery<any[]>({
    queryKey: [ENDPOINT, search],
    queryFn: () => getJson<any[]>(search ? `${ENDPOINT}?q=${encodeURIComponent(search)}` : ENDPOINT),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    queryFn: () => getJson<any[]>('/api/suppliers'),
  });

  const { data: packages = [] } = useQuery<any[]>({
    queryKey: ['/api/packages'],
    queryFn: () => getJson<any[]>('/api/packages'),
  });

  const customersItems = (customers as any[]).reduce((acc: Record<string, string>, c: any) => {
    acc[String(c.id)] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

  const customersMap = (customers as any[]).reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

  const suppliersItems = (suppliers as any[]).reduce((acc: Record<string, string>, s: any) => {
    acc[String(s.id)] = s.name;
    return acc;
  }, {});

  const packagesItems = (packages as any[])
    .filter((p: any) => p.status !== 'Cancelled' && p.status !== 'HandedOut')
    .reduce((acc: Record<string, string>, p: any) => {
      acc[String(p.id)] = `Package #${p.id}`;
      return acc;
    }, {});

  const save = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      editing ? putJson(`${ENDPOINT}/${editing.id}`, payload) : postJson(ENDPOINT, payload),
    onSuccess: () => {
      toast.success(editing ? 'Supply order updated' : 'Supply order created');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Save failed'),
  });

  const lifecycleMut = useMutation({
    mutationFn: ({ id, action, cancelReason }: { id: string; action: string; cancelReason?: string }) => {
      const body = action === 'cancel' ? { status: 'Cancelled', cancelReason: cancelReason || '' } : undefined;
      return postJson(`${ENDPOINT}/${id}/${action}`, body);
    },
    onSuccess: () => {
      toast.success('Supply order updated');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Action failed'),
  });

  const tableData = (data ?? []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = { ...item, customer: customersMap[item.customerId] ?? `#${item.customerId}` };
    return acc;
  }, {});

  const STATUS_FOR_ACTION: Record<string, string> = {
    approve: 'Draft',
    order: 'Approved',
    'deliver-to-warehouse': 'Ordered',
    'pack-into-package': 'DeliveredToWarehouse',
    close: 'PackedIntoPackage',
  };

  const lifecycleActionDefs = LIFECYCLE_ACTIONS.map(({ label, action }) => ({
    icon: <PlayArrowIcon fontSize="small" />,
    label,
    onClick: (id: string) => {
      if (action === 'cancel') {
        setCancelTargetId(id);
        setCancelReason('');
        setCancelDialogOpen(true);
      } else {
        lifecycleMut.mutate({ id, action });
      }
    },
    hidden: (row: Record<string, any>) => {
      if (action === 'cancel') {
        return ['Closed', 'Cancelled'].includes(row.status);
      }
      return row.status !== STATUS_FOR_ACTION[action];
    },
  }));

  const tableHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    { id: 'customer', label: 'Customer', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: SUPPLY_ORDER_STATUS_CHIPS,
      chipLabels: SUPPLY_ORDER_STATUS_LABELS,
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      numeric: false,
      disablePadding: false,
      actions: [
        {
          icon: <EditIcon fontSize="small" />,
          label: 'Edit',
          onClick: (id: string) => {
            const row = tableData[id];
            if (row) { setEditing(row); setDialogOpen(true); }
          },
          hidden: (row: Record<string, any>) => !canWriteMasterData(role) || ['Closed', 'Cancelled'].includes(row.status),
        },
        ...lifecycleActionDefs.map(a => ({
          ...a,
          hidden: (row: Record<string, any>) => !canWriteMasterData(role) || a.hidden(row),
        })),
      ],
    },
  ];

  const handleSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await save.mutateAsync({
        customerId: Number(values.customerId),
        supplierId: Number(values.supplierId),
        packageId: values.packageId ? Number(values.packageId) : null,
        name: values.name,
        purchasePrice: Number(values.purchasePrice),
        details: values.details || null,
      });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Box>
      <MainPageTitle
        title="Supply Orders"
        action={canWriteMasterData(role) ? {
          title: 'Create Supply Order',
          onClick: () => { setEditing(null); setDialogOpen(true); },
        } : undefined}
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <TextField
          size="small"
          label="Search by Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2, minWidth: 300 }}
        />
        {Object.keys(tableData).length === 0 && (
          <EmptyState message="No supply orders found." hint="Create one to get started." />
        )}
        <EnhancedTable title="Supply Orders" header={tableHeaders} data={tableData} defaultOrder="name" />
      </Box>

      <GenericDialog
        open={dialogOpen}
        title={editing ? 'Edit Supply Order' : 'Create Supply Order'}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildFields(editing ?? undefined, customersItems, suppliersItems, packagesItems)}
          onSubmit={handleSubmit}
        />
      </GenericDialog>

      <GenericDialog
        open={cancelDialogOpen}
        title="Cancel Supply Order"
        onClose={() => setCancelDialogOpen(false)}
      >
        <Box sx={{ p: 2 }}>
          <TextField
            label="Reason for cancellation"
            fullWidth
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ mt: 2 }}>
            <Button onClick={() => setCancelDialogOpen(false)}>Back</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                if (cancelTargetId) lifecycleMut.mutate({ id: cancelTargetId, action: 'cancel', cancelReason });
                setCancelDialogOpen(false);
              }}
            >
              Confirm Cancel
            </Button>
          </Stack>
        </Box>
      </GenericDialog>
    </Box>
  );
};

export default SupplyOrdersPage;
