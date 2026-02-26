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

const ENDPOINT = '/api/packages';

const PKG_STATUS_COLORS: Record<string, { color: string; backgroundColor: string }> = {
  Draft: { color: '#333', backgroundColor: '#e0e0e0' },
  Received: { color: '#fff', backgroundColor: '#0288d1' },
  Packed: { color: '#fff', backgroundColor: '#7b1fa2' },
  ReadyToShip: { color: '#fff', backgroundColor: '#ed6c02' },
  Shipped: { color: '#fff', backgroundColor: '#1565c0' },
  ArrivedAtDestination: { color: '#fff', backgroundColor: '#2e7d32' },
  ReadyForHandout: { color: '#fff', backgroundColor: '#f57c00' },
  HandedOut: { color: '#fff', backgroundColor: '#388e3c' },
  Cancelled: { color: '#fff', backgroundColor: '#c62828' },
};

const buildAutoAssignFields = (
  customersItems: Record<string, string>,
  warehousesItems: Record<string, string>,
): Record<string, DynamicFieldTypes> => ({
  customerId: {
    type: DynamicField.SELECT,
    name: 'customerId',
    title: 'Customer',
    required: true,
    disabled: false,
    items: customersItems,
    value: '',
  },
  provisionMethod: {
    type: DynamicField.SELECT,
    name: 'provisionMethod',
    title: 'Provision Method',
    required: true,
    disabled: false,
    items: { CustomerProvided: 'Customer Provided', ProcuredForCustomer: 'Procured For Customer' },
    value: 'CustomerProvided',
  },
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
});

const PackagesPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);

  const { data = [] } = useQuery<any[]>({
    queryKey: [ENDPOINT],
    queryFn: () => getJson<any[]>(ENDPOINT),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const { data: warehouses = [] } = useQuery<any[]>({
    queryKey: ['/api/warehouses'],
    queryFn: () => getJson<any[]>('/api/warehouses'),
  });

  const customersMap = (customers as any[]).reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

  const customersItems = (customers as any[]).reduce((acc: Record<string, string>, c: any) => {
    acc[String(c.id)] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

  const warehousesItems = (warehouses as any[]).reduce((acc: Record<string, string>, w: any) => {
    acc[String(w.id)] = `${w.name} (${w.code})`;
    return acc;
  }, {});

  const autoAssign = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      postJson<any>(`${ENDPOINT}/auto-assign`, {
        customerId: Number(payload.customerId),
        provisionMethod: payload.provisionMethod,
        supplyOrderId: null,
        originWarehouseId: Number(payload.originWarehouseId),
        destinationWarehouseId: Number(payload.destinationWarehouseId),
      }),
    onSuccess: (result: any) => {
      toast.success('Package auto-assigned to container');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
      setAutoAssignOpen(false);
      navigate(`/ops/packages/${result.id}`);
    },
    onError: (e: any) => {
      const payload = e?.response?.data ?? {};
      toast.error(payload.message ?? 'Auto-assign failed');
    },
  });

  const tableData = (data ?? []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = {
      ...item,
      customer: customersMap[item.customerId] ?? `#${item.customerId}`,
      hasDeparturePhotos: String(item.hasDeparturePhotos),
      hasArrivalPhotos: String(item.hasArrivalPhotos),
    };
    return acc;
  }, {});

  const tableHeaders: EnhanceTableHeaderTypes[] = [
    {
      id: 'id',
      label: 'Package ID',
      type: EnhancedTableColumnType.Clickable,
      numeric: false,
      disablePadding: false,
      onClick: (_tableId: string, row: Record<string, any>) => navigate(`/ops/packages/${row.id}`),
    },
    {
      id: 'shipmentId',
      label: 'Shipment ID',
      type: EnhancedTableColumnType.NUMBER,
      numeric: true,
      disablePadding: false,
    },
    {
      id: 'customer',
      label: 'Customer',
      type: EnhancedTableColumnType.TEXT,
      numeric: false,
      disablePadding: false,
    },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: PKG_STATUS_COLORS,
      chipLabels: {},
    },
    {
      id: 'hasDeparturePhotos',
      label: 'Departure Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#333', backgroundColor: '#e0e0e0' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'hasArrivalPhotos',
      label: 'Arrival Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#333', backgroundColor: '#e0e0e0' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
  ];

  const handleAutoAssignSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await autoAssign.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Box>
      <MainPageTitle
        title="Packages"
        action={{
          title: 'New Package (Auto-Assign)',
          onClick: () => setAutoAssignOpen(true),
        }}
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <EnhancedTable
          title="Packages"
          header={tableHeaders}
          data={tableData}
          defaultOrder="id"
          filters={[
            {
              name: 'status',
              title: 'Status',
              type: TableFilterTypes.SELECT,
              options: {
                Draft: 'Draft',
                Received: 'Received',
                Packed: 'Packed',
                ReadyToShip: 'Ready To Ship',
                Shipped: 'Shipped',
                ArrivedAtDestination: 'Arrived',
                ReadyForHandout: 'Ready For Handout',
                HandedOut: 'Handed Out',
                Cancelled: 'Cancelled',
              },
            } as ITableFilterType,
            {
              name: 'hasDeparturePhotos',
              title: 'Departure Photos',
              type: TableFilterTypes.SELECT,
              options: { true: 'Yes', false: 'No' },
            } as ITableFilterType,
            {
              name: 'hasArrivalPhotos',
              title: 'Arrival Photos',
              type: TableFilterTypes.SELECT,
              options: { true: 'Yes', false: 'No' },
            } as ITableFilterType,
          ]}
        />
      </Box>

      <GenericDialog
        open={autoAssignOpen}
        title="New Package (Auto-Assign to Oldest Pending Container)"
        onClose={() => setAutoAssignOpen(false)}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildAutoAssignFields(customersItems, warehousesItems)}
          onSubmit={handleAutoAssignSubmit}
        />
      </GenericDialog>
    </Box>
  );
};

export default PackagesPage;
