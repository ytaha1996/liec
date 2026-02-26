import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { getJson } from '../../api/client';
import { ITableFilterType, TableFilterTypes } from '../../components/enhanced-table/index-filter';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';

const ENDPOINT = '/api/packages';

const PackagesPage = () => {
  const navigate = useNavigate();

  const { data = [] } = useQuery<any[]>({
    queryKey: [ENDPOINT],
    queryFn: () => getJson<any[]>(ENDPOINT),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const customersMap = (customers as any[]).reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

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
      onClick: (_tableId: string, row: Record<string, any>) => navigate(`/packages/${row.id}`),
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

  return (
    <Box>
      <MainPageTitle title="Packages" />

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
    </Box>
  );
};

export default PackagesPage;
