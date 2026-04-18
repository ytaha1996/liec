import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useUserRole, canManageShipments } from '../../helpers/rbac';
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
import { PKG_STATUS_CHIPS, BOOL_CHIPS } from '../../constants/statusColors';
import { PKG_STATUS_LABELS } from '../../constants/statusLabels';

const ENDPOINT = '/api/packages';

const buildAutoAssignFields = (
  customersItems: Record<string, string>,
  warehousesItems: Record<string, string>,
  suppliersItems: Record<string, string>,
  isProcured: boolean,
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
  ...(isProcured ? {
    soSupplierId: { type: DynamicField.SELECT, name: 'soSupplierId', title: 'Supplier', required: true, disabled: false, value: '', items: suppliersItems },
    soName: { type: DynamicField.TEXT, name: 'soName', title: 'Item / Order Name', required: true, disabled: false, value: '' },
    soPurchasePrice: { type: DynamicField.NUMBER, name: 'soPurchasePrice', title: 'Purchase Price', required: true, disabled: false, value: '', min: 0 },
    soDetails: { type: DynamicField.TEXT, name: 'soDetails', title: 'Details', required: false, disabled: false, value: '' },
  } : {}),
});

const PackagesPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const role = useUserRole();
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [provisionMethod, setProvisionMethod] = useState('CustomerProvided');

  const { data = [], isLoading, isError } = useQuery<any[]>({
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

  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    queryFn: () => getJson<any[]>('/api/suppliers'),
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

  const suppliersItems = (suppliers as any[]).reduce((acc: Record<string, string>, s: any) => {
    acc[String(s.id)] = s.name;
    return acc;
  }, {});

  const autoAssign = useMutation({
    mutationFn: (payload: Record<string, any>) => {
      const body: Record<string, any> = {
        customerId: Number(payload.customerId),
        provisionMethod: payload.provisionMethod,
        supplyOrderId: null,
        originWarehouseId: Number(payload.originWarehouseId),
        destinationWarehouseId: Number(payload.destinationWarehouseId),
      };
      if (payload.provisionMethod === 'ProcuredForCustomer') {
        body.supplyOrder = {
          supplierId: Number(payload.soSupplierId),
          name: payload.soName,
          purchasePrice: Number(payload.soPurchasePrice),
          details: payload.soDetails || null,
        };
      }
      return postJson<any>(`${ENDPOINT}/auto-assign`, body);
    },
    onSuccess: (result: any) => {
      toast.success('Package auto-assigned to container');
      qc.invalidateQueries({ queryKey: [ENDPOINT] });
      setAutoAssignOpen(false);
      setProvisionMethod('CustomerProvided');
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
      chipColors: PKG_STATUS_CHIPS,
      chipLabels: PKG_STATUS_LABELS,
    },
    {
      id: 'hasDeparturePhotos',
      label: 'Departure Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: BOOL_CHIPS,
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'hasArrivalPhotos',
      label: 'Arrival Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: BOOL_CHIPS,
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

  if (isLoading) return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  if (isError) return <Box sx={{ p: 3 }}><Alert severity="error">Failed to load packages.</Alert></Box>;

  return (
    <Box>
      <MainPageTitle
        title="Packages"
        action={canManageShipments(role) ? {
          title: 'New Package (Auto-Assign)',
          onClick: () => setAutoAssignOpen(true),
        } : undefined}
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
              options: PKG_STATUS_LABELS,
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
        onClose={() => { setAutoAssignOpen(false); setProvisionMethod('CustomerProvided'); }}
      >
        <DynamicFormWidget
          title=""
          drawerMode
          fields={buildAutoAssignFields(customersItems, warehousesItems, suppliersItems, provisionMethod === 'ProcuredForCustomer')}
          onSubmit={handleAutoAssignSubmit}
          onFieldChange={(name, value) => { if (name === 'provisionMethod') setProvisionMethod(value as string); }}
        />
      </GenericDialog>
    </Box>
  );
};

export default PackagesPage;
