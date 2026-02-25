import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box } from '@mui/material';
import { getJson } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhancedTableColumnType, } from '../../components/enhanced-table';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
const ENDPOINT = '/api/packages';
const PackagesPage = () => {
    const navigate = useNavigate();
    const { data = [] } = useQuery({
        queryKey: [ENDPOINT],
        queryFn: () => getJson(ENDPOINT),
    });
    const tableData = (data ?? []).reduce((acc, item) => {
        acc[item.id] = {
            ...item,
            hasDeparturePhotos: String(item.hasDeparturePhotos),
            hasArrivalPhotos: String(item.hasArrivalPhotos),
        };
        return acc;
    }, {});
    const tableHeaders = [
        {
            id: 'id',
            label: 'Package ID',
            type: EnhancedTableColumnType.Clickable,
            numeric: false,
            disablePadding: false,
            onClick: (_tableId, row) => navigate(`/packages/${row.id}`),
        },
        {
            id: 'shipmentId',
            label: 'Shipment ID',
            type: EnhancedTableColumnType.NUMBER,
            numeric: true,
            disablePadding: false,
        },
        {
            id: 'customerId',
            label: 'Customer ID',
            type: EnhancedTableColumnType.NUMBER,
            numeric: true,
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
    return (_jsxs(Box, { children: [_jsx(MainPageTitle, { title: "Packages" }), _jsx(Box, { sx: { px: 3, pb: 3 }, children: _jsx(EnhancedTable, { title: "Packages", header: tableHeaders, data: tableData, defaultOrder: "id" }) })] }));
};
export default PackagesPage;
