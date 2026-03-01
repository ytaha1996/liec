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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArchiveIcon from '@mui/icons-material/Archive';

const ENDPOINT = '/api/pricing-configs';

const buildFields = (initial?: Record<string, any>): Record<string, DynamicFieldTypes> => ({
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    disabled: false,
    value: initial?.name ?? '',
  },
  currency: {
    type: DynamicField.TEXT,
    name: 'currency',
    title: 'Currency',
    required: true,
    disabled: false,
    value: initial?.currency ?? '',
  },
  effectiveFrom: {
    type: DynamicField.DATE,
    name: 'effectiveFrom',
    title: 'Effective From',
    required: true,
    disabled: false,
    value: initial?.effectiveFrom ?? null,
  },
  effectiveTo: {
    type: DynamicField.DATE,
    name: 'effectiveTo',
    title: 'Effective To',
    required: false,
    disabled: false,
    value: initial?.effectiveTo ?? null,
  },
  defaultRatePerKg: {
    type: DynamicField.NUMBER,
    name: 'defaultRatePerKg',
    title: 'Default Rate Per Kg',
    required: true,
    disabled: false,
    value: initial?.defaultRatePerKg ?? '',
  },
  defaultRatePerCbm: {
    type: DynamicField.NUMBER,
    name: 'defaultRatePerCbm',
    title: 'Default Rate Per CBM',
    required: true,
    disabled: false,
    value: initial?.defaultRatePerCbm ?? '',
  },
});

const PricingConfigsPage = () => {
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
      toast.success(editing ? 'Pricing config updated' : 'Pricing config created');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
      setDialogOpen(false);
      setEditing(null);
    },
    onError: () => toast.error('Save failed'),
  });

  const activate = useMutation({
    mutationFn: (id: string) => postJson(`${ENDPOINT}/${id}/activate`),
    onSuccess: () => {
      toast.success('Config activated');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
    },
    onError: () => toast.error('Activate failed'),
  });

  const retire = useMutation({
    mutationFn: (id: string) => postJson(`${ENDPOINT}/${id}/retire`),
    onSuccess: () => {
      toast.success('Config retired');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
    },
    onError: () => toast.error('Retire failed'),
  });

  const tableData = (data ?? []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const tableHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    { id: 'currency', label: 'Currency', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    { id: 'effectiveFrom', label: 'Effective From', type: EnhancedTableColumnType.DATE, numeric: false, disablePadding: false },
    { id: 'effectiveTo', label: 'Effective To', type: EnhancedTableColumnType.DATE, numeric: false, disablePadding: false },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        Active: { color: '#fff', backgroundColor: '#2e7d32' },
        Draft: { color: '#333', backgroundColor: '#e0e0e0' },
        Scheduled: { color: '#fff', backgroundColor: '#0288d1' },
        Retired: { color: '#fff', backgroundColor: '#616161' },
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
        {
          icon: <CheckCircleIcon fontSize="small" />,
          label: 'Activate',
          onClick: (id: string) => activate.mutate(id),
          hidden: (row: Record<string, any>) => row.status === 'Active',
        },
        {
          icon: <ArchiveIcon fontSize="small" />,
          label: 'Retire',
          onClick: (id: string) => retire.mutate(id),
          hidden: (row: Record<string, any>) => row.status === 'Retired',
        },
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
        title="Pricing Configs"
        action={{
          title: 'Create Config',
          onClick: () => { setEditing(null); setDialogOpen(true); },
        }}
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <EnhancedTable title="Pricing Configs" header={tableHeaders} data={tableData} defaultOrder="name" />
      </Box>

      <GenericDialog
        open={dialogOpen}
        title={editing ? 'Edit Pricing Config' : 'Create Pricing Config'}
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

export default PricingConfigsPage;
