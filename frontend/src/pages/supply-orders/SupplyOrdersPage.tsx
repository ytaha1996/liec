import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { toast } from 'react-toastify';
import { getJson, postJson, putJson } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
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

const ENDPOINT = '/api/supply-orders';

const LIFECYCLE_ACTIONS: { label: string; action: string }[] = [
  { label: 'Approve', action: 'approve' },
  { label: 'Order', action: 'order' },
  { label: 'Deliver to Warehouse', action: 'deliver-to-warehouse' },
  { label: 'Pack into Package', action: 'pack-into-package' },
  { label: 'Close', action: 'close' },
  { label: 'Cancel', action: 'cancel' },
];

const buildFields = (initial?: Record<string, any>): Record<string, DynamicFieldTypes> => ({
  customerId: {
    type: DynamicField.NUMBER,
    name: 'customerId',
    title: 'Customer ID',
    required: true,
    disabled: false,
    value: initial?.customerId ?? '',
  },
  supplierId: {
    type: DynamicField.NUMBER,
    name: 'supplierId',
    title: 'Supplier ID',
    required: true,
    disabled: false,
    value: initial?.supplierId ?? '',
  },
  packageId: {
    type: DynamicField.NUMBER,
    name: 'packageId',
    title: 'Package ID',
    required: false,
    disabled: false,
    value: initial?.packageId ?? '',
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);

  const { data = [] } = useQuery<any[]>({
    queryKey: [ENDPOINT],
    queryFn: () => getJson<any[]>(ENDPOINT),
  });

  const save = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      editing ? putJson(`${ENDPOINT}/${editing.id}`, payload) : postJson(ENDPOINT, payload),
    onSuccess: () => {
      toast.success(editing ? 'Supply order updated' : 'Supply order created');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: () => toast.error('Save failed'),
  });

  const lifecycleMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => {
      const body = action === 'cancel' ? { status: 'Cancelled', cancelReason: 'Cancelled from UI' } : undefined;
      return postJson(`${ENDPOINT}/${id}/${action}`, body);
    },
    onSuccess: () => {
      toast.success('Supply order updated');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
    },
    onError: () => toast.error('Action failed'),
  });

  const tableData = (data ?? []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const lifecycleActionDefs = LIFECYCLE_ACTIONS.map(({ label, action }) => ({
    icon: <PlayArrowIcon fontSize="small" />,
    label,
    onClick: (id: string) => lifecycleMut.mutate({ id, action }),
    hidden: () => false,
  }));

  const tableHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        Draft: { color: '#333', backgroundColor: '#e0e0e0' },
        Approved: { color: '#fff', backgroundColor: '#0288d1' },
        Ordered: { color: '#fff', backgroundColor: '#ed6c02' },
        DeliveredToWarehouse: { color: '#fff', backgroundColor: '#1565c0' },
        PackedIntoPackage: { color: '#fff', backgroundColor: '#616161' },
        Closed: { color: '#fff', backgroundColor: '#2e7d32' },
        Cancelled: { color: '#fff', backgroundColor: '#c62828' },
      },
      chipLabels: {},
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
          hidden: () => false,
        },
        ...lifecycleActionDefs,
      ],
    },
  ];

  const handleSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await save.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Box>
      <MainPageTitle
        title="Supply Orders"
        action={{
          title: 'Create Supply Order',
          onClick: () => { setEditing(null); setDialogOpen(true); },
        }}
      />

      <Box sx={{ px: 3, pb: 3 }}>
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
          fields={buildFields(editing ?? undefined)}
          onSubmit={handleSubmit}
        />
      </GenericDialog>
    </Box>
  );
};

export default SupplyOrdersPage;
