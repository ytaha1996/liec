import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, } from '@mui/material';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { api, getJson, postJson, uploadMultipart } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhancedTableColumnType, } from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import { PhotoGallery } from '../../components/media/PhotoGallery';
const PKG_STATUS_CHIPS = {
    Draft: { color: '#333', backgroundColor: '#e0e0e0' },
    Scheduled: { color: '#fff', backgroundColor: '#0288d1' },
    ReadyToDepart: { color: '#fff', backgroundColor: '#ed6c02' },
    Departed: { color: '#fff', backgroundColor: '#1565c0' },
    Arrived: { color: '#fff', backgroundColor: '#2e7d32' },
    Closed: { color: '#fff', backgroundColor: '#616161' },
    Cancelled: { color: '#fff', backgroundColor: '#c62828' },
};
const TRANSITION_ACTIONS = [
    { label: 'Receive', action: 'receive' },
    { label: 'Pack', action: 'pack' },
    { label: 'Ready To Ship', action: 'ready-to-ship' },
    { label: 'Ship', action: 'ship' },
    { label: 'Arrive Destination', action: 'arrive-destination' },
    { label: 'Ready For Handout', action: 'ready-for-handout' },
    { label: 'Handout', action: 'handout' },
    { label: 'Cancel', action: 'cancel' },
];
const PHOTO_STAGES = ['Receiving', 'Departure', 'Arrival', 'Other'];
const buildItemFields = () => ({
    goodId: {
        type: DynamicField.NUMBER,
        name: 'goodId',
        title: 'Good ID',
        required: true,
        disabled: false,
        value: '',
    },
    quantity: {
        type: DynamicField.NUMBER,
        name: 'quantity',
        title: 'Quantity',
        required: true,
        disabled: false,
        value: '',
    },
    weightKg: {
        type: DynamicField.NUMBER,
        name: 'weightKg',
        title: 'Weight (Kg)',
        required: true,
        disabled: false,
        value: '',
    },
    volumeM3: {
        type: DynamicField.NUMBER,
        name: 'volumeM3',
        title: 'Volume (M3)',
        required: true,
        disabled: false,
        value: '',
    },
});
const PackageDetailPage = ({ id }) => {
    const qc = useQueryClient();
    const [gate, setGate] = useState(null);
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [photoStage, setPhotoStage] = useState('Receiving');
    const { data, isLoading, isError } = useQuery({
        queryKey: ['/api/packages', id],
        queryFn: () => getJson(`/api/packages/${id}`),
    });
    const mediaQuery = useQuery({
        queryKey: ['/api/packages', id, 'media'],
        queryFn: () => getJson(`/api/packages/${id}/media`),
    });
    const transition = useMutation({
        mutationFn: (action) => postJson(`/api/packages/${id}/${action}`),
        onSuccess: () => {
            setGate(null);
            toast.success('Package updated');
            qc.invalidateQueries({ queryKey: ['/api/packages', id] });
        },
        onError: (e) => {
            const payload = e?.response?.data ?? {};
            if (payload.code === 'PHOTO_GATE_FAILED') {
                setGate(payload);
            }
            toast.error(payload.message ?? 'Transition failed');
        },
    });
    const addItem = useMutation({
        mutationFn: (values) => postJson(`/api/packages/${id}/items`, {
            goodId: Number(values.goodId),
            quantity: Number(values.quantity),
            weightKg: Number(values.weightKg),
            volumeM3: Number(values.volumeM3),
        }),
        onSuccess: () => {
            toast.success('Item added');
            qc.invalidateQueries({ queryKey: ['/api/packages', id] });
            setAddItemOpen(false);
        },
        onError: () => toast.error('Add item failed'),
    });
    const deleteItem = useMutation({
        mutationFn: (itemId) => api.delete(`/api/packages/${id}/items/${itemId}`).then((r) => r.data),
        onSuccess: () => {
            toast.success('Item deleted');
            qc.invalidateQueries({ queryKey: ['/api/packages', id] });
        },
        onError: () => toast.error('Delete failed'),
    });
    const upload = useMutation({
        mutationFn: (file) => {
            const fd = new FormData();
            fd.append('stage', photoStage);
            fd.append('file', file);
            return uploadMultipart(`/api/packages/${id}/media`, fd);
        },
        onSuccess: () => {
            toast.success('Photo uploaded');
            qc.invalidateQueries({ queryKey: ['/api/packages', id, 'media'] });
            qc.invalidateQueries({ queryKey: ['/api/packages', id] });
        },
        onError: () => toast.error('Upload failed'),
    });
    const handleAddItemSubmit = async (values) => {
        try {
            await addItem.mutateAsync(values);
            return true;
        }
        catch {
            return false;
        }
    };
    const items = data?.items ?? [];
    const itemsTableData = items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});
    const itemHeaders = [
        { id: 'goodId', label: 'Good ID', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
        { id: 'quantity', label: 'Quantity', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
        { id: 'weightKg', label: 'Weight (Kg)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
        { id: 'volumeM3', label: 'Volume (M3)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
        { id: 'lineCharge', label: 'Line Charge', type: EnhancedTableColumnType.CURRENCY, numeric: true, disablePadding: false },
        {
            id: 'itemActions',
            label: 'Actions',
            type: EnhancedTableColumnType.Action,
            numeric: false,
            disablePadding: false,
            actions: [
                {
                    icon: null,
                    label: 'Delete',
                    onClick: (tableId) => {
                        const item = itemsTableData[tableId];
                        if (item)
                            deleteItem.mutate(item.id);
                    },
                    hidden: () => false,
                },
            ],
        },
    ];
    if (isLoading) {
        return _jsx(Box, { sx: { p: 3 }, children: _jsx(Typography, { children: "Loading..." }) });
    }
    if (isError || !data) {
        return _jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: "Package not found." }) });
    }
    const pkg = data.package ?? data;
    return (_jsxs(Box, { children: [_jsx(PageTitleWrapper, { children: _jsxs(Stack, { direction: "row", alignItems: "center", gap: 2, flexWrap: "wrap", children: [_jsxs(Typography, { variant: "h3", component: "h1", sx: { fontWeight: 700, color: '#00A6A6' }, children: ["Package #", id] }), pkg.status && (_jsx(Chip, { label: pkg.status, size: "small", sx: {
                                backgroundColor: PKG_STATUS_CHIPS[pkg.status]?.backgroundColor ?? '#e0e0e0',
                                color: PKG_STATUS_CHIPS[pkg.status]?.color ?? '#333',
                            } }))] }) }), _jsxs(Box, { sx: { px: 3, pb: 3 }, children: [_jsxs(MainPageSection, { title: "Status Transitions", children: [gate?.code === 'PHOTO_GATE_FAILED' && (_jsxs(Alert, { severity: "error", sx: { mb: 2 }, children: [gate.message, _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Package" }), _jsx(TableCell, { children: "Customer" }), _jsx(TableCell, { children: "Stage" }), _jsx(TableCell, { children: "Link" })] }) }), _jsx(TableBody, { children: (gate.missing ?? []).map((m) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: m.packageId }), _jsx(TableCell, { children: m.customerRef }), _jsx(TableCell, { children: m.stage }), _jsx(TableCell, { children: _jsx(Button, { component: Link, to: `/packages/${m.packageId}`, size: "small", children: "Open" }) })] }, `${m.packageId}-${m.stage}`))) })] })] })), _jsx(Stack, { direction: "row", gap: 1, flexWrap: "wrap", children: TRANSITION_ACTIONS.map(({ label, action }) => (_jsx(Button, { variant: "outlined", onClick: () => transition.mutate(action), disabled: transition.isPending, children: label }, action))) })] }), _jsx(MainPageSection, { title: "Pricing Snapshot", children: _jsx(Card, { variant: "outlined", children: _jsx(CardContent, { children: _jsxs(Box, { sx: { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Total Weight (Kg)" }), _jsx(Typography, { children: pkg.totalWeightKg ?? '-' })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Total Volume (M3)" }), _jsx(Typography, { children: pkg.totalVolumeM3 ?? '-' })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Rate Per Kg" }), _jsx(Typography, { children: pkg.appliedRatePerKg ?? '-' })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Rate Per M3" }), _jsx(Typography, { children: pkg.appliedRatePerM3 ?? '-' })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Charge Amount" }), _jsx(Typography, { children: pkg.chargeAmount ?? '-' })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Currency" }), _jsx(Typography, { children: pkg.currency ?? '-' })] })] }) }) }) }), _jsxs(MainPageSection, { title: "Items", children: [_jsx(Box, { sx: { mb: 2 }, children: _jsx(Button, { variant: "contained", size: "small", onClick: () => setAddItemOpen(true), children: "Add Item" }) }), _jsx(EnhancedTable, { title: "Package Items", header: itemHeaders, data: itemsTableData, defaultOrder: "goodId" })] }), _jsx(MainPageSection, { title: "Upload Photo", children: _jsxs(Stack, { direction: "row", gap: 2, alignItems: "center", flexWrap: "wrap", children: [_jsx(TextField, { select: true, label: "Stage", size: "small", value: photoStage, onChange: (e) => setPhotoStage(e.target.value), sx: { minWidth: 160 }, children: PHOTO_STAGES.map((s) => (_jsx(MenuItem, { value: s, children: s }, s))) }), _jsxs(Button, { component: "label", variant: "outlined", children: ["Upload Photo", _jsx("input", { hidden: true, type: "file", onChange: (e) => {
                                                const file = e.target.files?.[0];
                                                if (file)
                                                    upload.mutate(file);
                                            } })] })] }) }), _jsx(MainPageSection, { title: "Photo Gallery", children: _jsx(PhotoGallery, { media: mediaQuery.data ?? [] }) })] }), _jsx(GenericDialog, { open: addItemOpen, title: "Add Item", onClose: () => setAddItemOpen(false), children: _jsx(DynamicFormWidget, { title: "", drawerMode: true, fields: buildItemFields(), onSubmit: handleAddItemSubmit }) })] }));
};
export default PackageDetailPage;
