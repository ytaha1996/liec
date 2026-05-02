import { useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, CircularProgress, TextField, Typography } from '@mui/material';
import { useUserRole, canManageShipments } from '../../helpers/rbac';
import { toast } from 'react-toastify';
import { getJson, postJson, parseApiError } from '../../api/client';
import { ITableFilterType, TableFilterTypes } from '../../components/enhanced-table/index-filter';
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
import { SHIPMENT_STATUS_CHIPS } from '../../constants/statusColors';
import { SHIPMENT_STATUS_LABELS } from '../../constants/statusLabels';

const ENDPOINT = '/api/shipments';

const buildFields = (warehousesItems: Record<string, string>): Record<string, DynamicFieldTypes> => ({
  originWarehouseId: {
    type: DynamicField.SELECT,
    name: 'originWarehouseId',
    title: 'Origin Warehouse',
    required: true,
    disabled: false,
    items: warehousesItems,
    value: '',
  },
  destinationWarehouseId: {
    type: DynamicField.SELECT,
    name: 'destinationWarehouseId',
    title: 'Destination Warehouse',
    required: true,
    disabled: false,
    items: warehousesItems,
    value: '',
  },
  plannedDepartureDate: {
    type: DynamicField.DATE,
    name: 'plannedDepartureDate',
    title: 'Planned Departure Date',
    required: true,
    disabled: false,
    value: null,
  },
  plannedArrivalDate: {
    type: DynamicField.DATE,
    name: 'plannedArrivalDate',
    title: 'Planned Arrival Date',
    required: true,
    disabled: false,
    value: null,
    customValidator: (_v, values) => {
      if (!values.plannedDepartureDate || !values.plannedArrivalDate) return '';
      return dayjs(values.plannedArrivalDate).isBefore(dayjs(values.plannedDepartureDate), 'day')
        ? 'Arrival must be on or after departure'
        : '';
    },
  },
  maxWeightKg: {
    type: DynamicField.NUMBER,
    name: 'maxWeightKg',
    title: 'Max Weight (Kg, 0 = unlimited)',
    required: false,
    disabled: false,
    value: 0,
    min: 0,
  },
  maxCbm: {
    type: DynamicField.NUMBER,
    name: 'maxCbm',
    title: 'Max CBM (0 = unlimited)',
    required: false,
    disabled: false,
    value: 0,
    min: 0,
  },
  tiiuCode: {
    type: DynamicField.TEXT,
    name: 'tiiuCode',
    title: 'TIIU Code',
    required: false,
    disabled: false,
    value: '',
  },
});

const ShipmentsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useUserRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data = [], isLoading, isError } = useQuery<any[]>({
    queryKey: [ENDPOINT, search],
    queryFn: () => getJson<any[]>(search ? `${ENDPOINT}?q=${encodeURIComponent(search)}` : ENDPOINT),
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    queryFn: () => getJson<any[]>('/api/warehouses'),
  });

  const warehousesItems = (warehouses as any[]).reduce((acc: Record<string, string>, w: any) => {
    acc[String(w.id)] = `${w.name} (${w.code})`;
    return acc;
  }, {});

  const create = useMutation({
    mutationFn: (payload: Record<string, any>) => postJson(ENDPOINT, payload),
    onSuccess: () => {
      toast.success('Shipment created');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Create failed'),
  });

  const tableData = (data ?? []).reduce((acc: Record<string, any>, item: any) => {
    const weightPct = item.maxWeightKg > 0 ? Math.round((item.totalWeightKg / item.maxWeightKg) * 100) : -1;
    const cbmPct = item.maxCbm > 0 ? Math.round((item.totalCbm / item.maxCbm) * 100) : -1;
    const capLevel = (pct: number) => pct < 0 ? 'none' : pct > 95 ? 'danger' : pct >= 80 ? 'warning' : 'ok';
    const weightLabel = weightPct < 0 ? '—' : `${(item.totalWeightKg / 1000).toFixed(3)}/${(item.maxWeightKg / 1000).toFixed(3)} t (${weightPct}%)`;
    const cbmLabel = cbmPct < 0 ? '—' : `${item.totalCbm}/${item.maxCbm} (${cbmPct}%)`;
    acc[item.id] = {
      ...item,
      cbmCapacity: cbmLabel,
      cbmCapacityLevel: capLevel(cbmPct),
      weightCapacity: weightLabel,
      weightCapacityLevel: capLevel(weightPct),
    };
    return acc;
  }, {});

  const tableHeaders: EnhanceTableHeaderTypes[] = [
    {
      id: 'refCode',
      label: 'Ref Code',
      type: EnhancedTableColumnType.Clickable,
      numeric: false,
      disablePadding: false,
      onClick: (_id: string, row: Record<string, any>) => navigate(`/ops/shipments/${row.id}`),
    },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: SHIPMENT_STATUS_CHIPS,
      chipLabels: SHIPMENT_STATUS_LABELS,
    },
    {
      id: 'plannedDepartureDate',
      label: 'Planned Departure',
      type: EnhancedTableColumnType.DATE,
      numeric: false,
      disablePadding: false,
    },
    {
      id: 'cbmCapacity',
      label: 'CBM',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        ok: { color: '#fff', backgroundColor: '#2e7d32' },
        warning: { color: '#fff', backgroundColor: '#ed6c02' },
        danger: { color: '#fff', backgroundColor: '#c62828' },
        none: { color: '#999', backgroundColor: '#f5f5f5' },
      },
      chipLabels: {},
      chipValueKey: 'cbmCapacityLevel',
    } as any,
    {
      id: 'weightCapacity',
      label: 'Weight',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        ok: { color: '#fff', backgroundColor: '#2e7d32' },
        warning: { color: '#fff', backgroundColor: '#ed6c02' },
        danger: { color: '#fff', backgroundColor: '#c62828' },
        none: { color: '#999', backgroundColor: '#f5f5f5' },
      },
      chipLabels: {},
      chipValueKey: 'weightCapacityLevel',
    } as any,
  ];

  const handleSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await create.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  if (isLoading) return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (isError) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load shipments.</Alert></Box>;

  return (
    <Box>
      <MainPageTitle
        title="Shipments"
        action={canManageShipments(role) ? {
          title: 'Create Shipment',
          onClick: () => setDialogOpen(true),
        } : undefined}
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <TextField
          size="small"
          label="Search by Ref Code or TIIU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 2, minWidth: 300 }}
        />
        {Object.keys(tableData).length === 0 && (
          <EmptyState message="No shipments found." hint="Create one to get started." />
        )}
        <EnhancedTable
          title="Shipments"
          header={tableHeaders}
          data={tableData}
          defaultOrder="plannedDepartureDate"
          filters={[
            {
              name: 'status',
              title: 'Status',
              type: TableFilterTypes.SELECT,
              options: SHIPMENT_STATUS_LABELS,
            } as ITableFilterType,
          ]}
        />
      </Box>

      <GenericDialog
        open={dialogOpen}
        title="Create Shipment"
        onClose={() => setDialogOpen(false)}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildFields(warehousesItems)}
          onSubmit={handleSubmit}
        />
      </GenericDialog>
    </Box>
  );
};

export default ShipmentsPage;
