import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography, } from '@mui/material';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getJson, postJson } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhancedTableColumnType, } from '../../components/enhanced-table';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import { PhotoGallery } from '../../components/media/PhotoGallery';
const SHIPMENT_STATUS_CHIPS = {
    Draft: { color: '#333', backgroundColor: '#e0e0e0' },
    Scheduled: { color: '#fff', backgroundColor: '#0288d1' },
    ReadyToDepart: { color: '#fff', backgroundColor: '#ed6c02' },
    Departed: { color: '#fff', backgroundColor: '#1565c0' },
    Arrived: { color: '#fff', backgroundColor: '#2e7d32' },
    Closed: { color: '#fff', backgroundColor: '#616161' },
    Cancelled: { color: '#fff', backgroundColor: '#c62828' },
};
const TRANSITION_ACTIONS = [
    { label: 'Schedule', action: 'schedule' },
    { label: 'Ready To Depart', action: 'ready-to-depart' },
    { label: 'Depart', action: 'depart' },
    { label: 'Arrive', action: 'arrive' },
    { label: 'Close', action: 'close' },
    { label: 'Cancel', action: 'cancel' },
];
const ShipmentDetailPage = ({ id }) => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [gate, setGate] = useState(null);
    const { data, isLoading, isError } = useQuery({
        queryKey: ['/api/shipments', id],
        queryFn: () => getJson(`/api/shipments/${id}`),
    });
    const mediaQuery = useQuery({
        queryKey: ['/api/shipments', id, 'media'],
        queryFn: () => getJson(`/api/shipments/${id}/media`),
    });
    const packagesQuery = useQuery({
        queryKey: ['/api/packages'],
        queryFn: () => getJson('/api/packages'),
    });
    const shipmentPackages = (packagesQuery.data ?? []).filter((p) => String(p.shipmentId) === String(id));
    const packageTableData = shipmentPackages.reduce((acc, item) => {
        acc[item.id] = { ...item, hasDeparturePhotos: String(item.hasDeparturePhotos), hasArrivalPhotos: String(item.hasArrivalPhotos) };
        return acc;
    }, {});
    const packageHeadersWithNav = [
        {
            id: 'id',
            label: 'Package ID',
            type: EnhancedTableColumnType.Clickable,
            numeric: false,
            disablePadding: false,
            onClick: (_tableId, row) => navigate(`/packages/${row.id}`),
        },
        { id: 'customerId', label: 'Customer ID', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
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
            id: 'hasDeparturePhotos',
            label: 'Departure Photos',
            type: EnhancedTableColumnType.COLORED_CHIP,
            numeric: false,
            disablePadding: false,
            chipColors: {
                true: { color: '#fff', backgroundColor: '#2e7d32' },
                false: { color: '#fff', backgroundColor: '#c62828' },
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
                false: { color: '#fff', backgroundColor: '#c62828' },
            },
            chipLabels: { true: 'Yes', false: 'No' },
        },
    ];
    const move = useMutation({
        mutationFn: (action) => postJson(`/api/shipments/${id}/${action}`),
        onSuccess: () => {
            setGate(null);
            toast.success('Shipment updated');
            qc.invalidateQueries({ queryKey: ['/api/shipments', id] });
        },
        onError: (e) => {
            const payload = e?.response?.data ?? {};
            if (payload.code === 'PHOTO_GATE_FAILED') {
                setGate(payload);
            }
            toast.error(payload.message ?? 'Transition failed');
        },
    });
    const sendBulk = useMutation({
        mutationFn: (kind) => {
            if (kind === 'status')
                return postJson(`/api/shipments/${id}/whatsapp/status/bulk`);
            return postJson(`/api/shipments/${id}/whatsapp/photos/${kind}/bulk`);
        },
        onSuccess: () => toast.success('Bulk campaign created'),
        onError: () => toast.error('Bulk send failed'),
    });
    if (isLoading) {
        return _jsx(Box, { sx: { p: 3 }, children: _jsx(Typography, { children: "Loading..." }) });
    }
    if (isError || !data) {
        return _jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: "Shipment not found." }) });
    }
    return (_jsxs(Box, { children: [_jsx(PageTitleWrapper, { children: _jsxs(Stack, { direction: "row", alignItems: "center", gap: 2, flexWrap: "wrap", children: [_jsxs(Typography, { variant: "h3", component: "h1", sx: { fontWeight: 700, color: '#00A6A6' }, children: ["Shipment ", data.refCode] }), _jsx(Chip, { label: data.status, size: "small", sx: {
                                backgroundColor: SHIPMENT_STATUS_CHIPS[data.status]?.backgroundColor ?? '#e0e0e0',
                                color: SHIPMENT_STATUS_CHIPS[data.status]?.color ?? '#333',
                            } })] }) }), _jsxs(Box, { sx: { px: 3, pb: 3 }, children: [_jsxs(MainPageSection, { title: "Status Transitions", children: [gate?.code === 'PHOTO_GATE_FAILED' && (_jsxs(Alert, { severity: "error", sx: { mb: 2 }, children: [gate.message, _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Package" }), _jsx(TableCell, { children: "Customer" }), _jsx(TableCell, { children: "Stage" }), _jsx(TableCell, { children: "Link" })] }) }), _jsx(TableBody, { children: (gate.missing ?? []).map((m) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: m.packageId }), _jsx(TableCell, { children: m.customerRef }), _jsx(TableCell, { children: m.stage }), _jsx(TableCell, { children: _jsx(Button, { component: Link, to: `/packages/${m.packageId}`, size: "small", children: "Open" }) })] }, `${m.packageId}-${m.stage}`))) })] })] })), _jsx(Stack, { direction: "row", gap: 1, flexWrap: "wrap", children: TRANSITION_ACTIONS.map(({ label, action }) => (_jsx(Button, { variant: "outlined", onClick: () => move.mutate(action), disabled: move.isPending, children: label }, action))) })] }), _jsx(MainPageSection, { title: "WhatsApp Bulk Actions", children: _jsxs(Stack, { direction: "row", gap: 1, flexWrap: "wrap", children: [_jsx(Button, { variant: "outlined", onClick: () => sendBulk.mutate('status'), disabled: sendBulk.isPending, children: "Status Bulk" }), _jsx(Button, { variant: "outlined", onClick: () => sendBulk.mutate('departure'), disabled: sendBulk.isPending, children: "Departure Bulk" }), _jsx(Button, { variant: "outlined", onClick: () => sendBulk.mutate('arrival'), disabled: sendBulk.isPending, children: "Arrival Bulk" })] }) }), _jsx(MainPageSection, { title: "Packages", children: _jsx(EnhancedTable, { title: "Packages in Shipment", header: packageHeadersWithNav, data: packageTableData, defaultOrder: "id" }) }), _jsx(MainPageSection, { title: "Photos", children: _jsx(PhotoGallery, { media: mediaQuery.data ?? [] }) })] })] }));
};
export default ShipmentDetailPage;
