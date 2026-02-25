import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { toast } from 'react-toastify';
import { getJson, postJson } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';

const ENDPOINT = '/api/shipments';

const buildFields = (): Record<string, DynamicFieldTypes> => ({
  originWarehouseId: {
    type: DynamicField.NUMBER,
    name: 'originWarehouseId',
    title: 'Origin Warehouse ID',
    required: true,
    disabled: false,
    value: '',
  },
  destinationWarehouseId: {
    type: DynamicField.NUMBER,
    name: 'destinationWarehouseId',
    title: 'Destination Warehouse ID',
    required: true,
    disabled: false,
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
});

const ShipmentsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data = [] } = useQuery<any[]>({
    queryKey: [ENDPOINT],
    queryFn: () => getJson<any[]>(ENDPOINT),
  });

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
      onClick: (_id: string, row: Record<string, any>) => navigate(`/shipments/${row.id}`),
    },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        Draft: { color: '#333', backgroundColor: '#e0e0e0' },
        Scheduled: { color: '#fff', backgroundColor: '#0288d1' },
        ReadyToDepart: { color: '#fff', backgroundColor: '#ed6c02' },
        Departed: { color: '#fff', backgroundColor: '#1565c0' },
        Arrived: { color: '#fff', backgroundColor: '#2e7d32' },
        Closed: { color: '#fff', backgroundColor: '#616161' },
        Cancelled: { color: '#fff', backgroundColor: '#c62828' },
      },
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
        <EnhancedTable title="Shipments" header={tableHeaders} data={tableData} defaultOrder="plannedDepartureDate" />
      </Box>

      <GenericDialog
        open={dialogOpen}
        title="Create Shipment"
        onClose={() => setDialogOpen(false)}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildFields()}
          onSubmit={handleSubmit}
        />
      </GenericDialog>
    </Box>
  );
};

export default ShipmentsPage;
