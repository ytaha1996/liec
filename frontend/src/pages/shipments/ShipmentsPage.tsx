import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { toast } from 'react-toastify';
import { getJson, postJson } from '../../api/client';
import { ITableFilterType, TableFilterTypes } from '../../components/enhanced-table/index-filter';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import { SHIPMENT_STATUS_CHIPS, SHIPMENT_STATUS_FILTER_OPTIONS } from '../../constants/statusColors';

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
  },
  maxWeightKg: {
    type: DynamicField.NUMBER,
    name: 'maxWeightKg',
    title: 'Max Weight (Kg, 0 = unlimited)',
    required: false,
    disabled: false,
    value: 0,
  },
  maxCbm: {
    type: DynamicField.NUMBER,
    name: 'maxCbm',
    title: 'Max CBM (0 = unlimited)',
    required: false,
    disabled: false,
    value: 0,
  },
  tiiuCode: {
    type: DynamicField.TEXT,
    name: 'tiiuCode',
    title: 'TIIU Code (e.g., MSCU1234567)',
    required: false,
    disabled: false,
    value: '',
    regex: /^[A-Za-z]{3,4}\d{4,7}$/,
  },
});

const ShipmentsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data = [] } = useQuery<any[]>({
    queryKey: [ENDPOINT],
    queryFn: () => getJson<any[]>(ENDPOINT),
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
    onError: () => toast.error('Create failed'),
  });

  const tableData = (data ?? []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = item;
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
      chipLabels: {},
    },
    {
      id: 'plannedDepartureDate',
      label: 'Planned Departure',
      type: EnhancedTableColumnType.DATE,
      numeric: false,
      disablePadding: false,
    },
  ];

  const handleSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await create.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Box>
      <MainPageTitle
        title="Shipments"
        action={{
          title: 'Create Shipment',
          onClick: () => setDialogOpen(true),
        }}
      />

      <Box sx={{ px: 3, pb: 3 }}>
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
              options: SHIPMENT_STATUS_FILTER_OPTIONS,
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
