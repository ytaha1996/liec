import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Box, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import { getJson } from '../../api/client';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';
const StatCard = ({ title, count, isLoading, color = '#00A6A6' }) => (_jsx(Card, { sx: { borderRadius: 2, boxShadow: 3 }, children: _jsxs(CardContent, { sx: { p: 3 }, children: [_jsx(Typography, { variant: "subtitle1", sx: { color: '#6E759F', fontWeight: 500, mb: 1 }, children: title }), isLoading ? (_jsx(CircularProgress, { size: 28 })) : (_jsx(Typography, { variant: "h3", sx: { fontWeight: 700, color }, children: count ?? 0 }))] }) }));
const DashboardPage = () => {
    const { data: customers, isLoading: loadingCustomers } = useQuery({
        queryKey: ['/api/customers'],
        queryFn: () => getJson('/api/customers'),
    });
    const { data: shipments, isLoading: loadingShipments } = useQuery({
        queryKey: ['/api/shipments'],
        queryFn: () => getJson('/api/shipments'),
    });
    const { data: packages, isLoading: loadingPackages } = useQuery({
        queryKey: ['/api/packages'],
        queryFn: () => getJson('/api/packages'),
    });
    return (_jsxs(_Fragment, { children: [_jsx(PageTitleWrapper, { children: _jsx(MainPageTitle, { title: "Dashboard", subtitle: "Admin operations console for shipments, packages, media and messaging." }) }), _jsx(Box, { sx: { px: 3, pb: 4 }, children: _jsxs(Grid, { container: true, spacing: 3, children: [_jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(StatCard, { title: "Total Customers", count: customers?.length, isLoading: loadingCustomers, color: "#00A6A6" }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(StatCard, { title: "Total Shipments", count: shipments?.length, isLoading: loadingShipments, color: "#243043" }) }), _jsx(Grid, { item: true, xs: 12, sm: 4, children: _jsx(StatCard, { title: "Total Packages", count: packages?.length, isLoading: loadingPackages, color: "#7B5EA7" }) })] }) })] }));
};
export default DashboardPage;
