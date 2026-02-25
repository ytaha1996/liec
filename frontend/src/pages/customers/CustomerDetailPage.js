import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Card, CardContent, Chip, TextField, Typography, Button, Stack, } from '@mui/material';
import { toast } from 'react-toastify';
import { api, getJson, postJson } from '../../api/client';
import { DynamicField } from '../../components/dynamic-widget';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageTitleWrapper from '../../components/PageTitleWrapper';
const buildConsentFields = (initial) => ({
    optInStatusUpdates: {
        type: DynamicField.CHECKBOX,
        name: 'optInStatusUpdates',
        title: 'Opt-in Status Updates',
        required: false,
        disabled: false,
        value: initial?.optInStatusUpdates ?? false,
    },
    optInDeparturePhotos: {
        type: DynamicField.CHECKBOX,
        name: 'optInDeparturePhotos',
        title: 'Opt-in Departure Photos',
        required: false,
        disabled: false,
        value: initial?.optInDeparturePhotos ?? false,
    },
    optInArrivalPhotos: {
        type: DynamicField.CHECKBOX,
        name: 'optInArrivalPhotos',
        title: 'Opt-in Arrival Photos',
        required: false,
        disabled: false,
        value: initial?.optInArrivalPhotos ?? false,
    },
});
const CustomerDetailPage = ({ id }) => {
    const qc = useQueryClient();
    const [shipmentId, setShipmentId] = useState('');
    const { data, isLoading, isError } = useQuery({
        queryKey: ['/api/customers', id],
        queryFn: () => getJson(`/api/customers/${id}`),
    });
    const patchConsent = useMutation({
        mutationFn: (payload) => api.patch(`/api/customers/${id}/whatsapp-consent`, payload).then((r) => r.data),
        onSuccess: () => {
            toast.success('Consent updated');
            qc.invalidateQueries({ queryKey: ['/api/customers', id] });
        },
        onError: () => toast.error('Consent update failed'),
    });
    const sendWhatsApp = useMutation({
        mutationFn: (kind) => {
            if (!shipmentId.trim())
                throw new Error('Shipment ID is required');
            if (kind === 'status') {
                return postJson(`/api/customers/${id}/whatsapp/status?shipmentId=${shipmentId}`);
            }
            return postJson(`/api/customers/${id}/whatsapp/photos/${kind}?shipmentId=${shipmentId}`);
        },
        onSuccess: () => toast.success('WhatsApp message sent'),
        onError: (e) => toast.error(e?.message ?? 'Send failed'),
    });
    const handleConsentSubmit = async (values) => {
        try {
            await patchConsent.mutateAsync(values);
            return true;
        }
        catch {
            return false;
        }
    };
    if (isLoading) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Typography, { children: "Loading..." }) }));
    }
    if (isError || !data) {
        return (_jsx(Box, { sx: { p: 3 }, children: _jsx(Alert, { severity: "error", children: "Customer not found." }) }));
    }
    const consent = data.whatsAppConsent ?? {};
    return (_jsxs(Box, { children: [_jsx(PageTitleWrapper, { children: _jsxs(Stack, { direction: "row", alignItems: "center", gap: 2, flexWrap: "wrap", children: [_jsx(Typography, { variant: "h3", component: "h1", sx: { fontWeight: 700, color: '#00A6A6' }, children: data.name }), _jsx(Chip, { label: data.customerRef, color: "primary", variant: "outlined" }), _jsx(Chip, { label: data.isActive ? 'Active' : 'Inactive', color: data.isActive ? 'success' : 'default', size: "small" })] }) }), _jsxs(Box, { sx: { px: 3, pb: 3 }, children: [_jsx(MainPageSection, { title: "Info", children: _jsx(Card, { variant: "outlined", children: _jsx(CardContent, { children: _jsxs(Box, { sx: {
                                        display: 'grid',
                                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                                        gap: 2,
                                    }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Name" }), _jsx(Typography, { children: data.name })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Customer Ref" }), _jsx(Typography, { children: data.customerRef })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Primary Phone" }), _jsx(Typography, { children: data.primaryPhone })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Email" }), _jsx(Typography, { children: data.email ?? '-' })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", children: "Is Active" }), _jsx(Chip, { label: data.isActive ? 'Active' : 'Inactive', color: data.isActive ? 'success' : 'default', size: "small" })] }), _jsxs(Box, { sx: { gridColumn: { sm: '1 / -1' } }, children: [_jsx(Typography, { variant: "subtitle2", color: "text.secondary", sx: { mb: 1 }, children: "WhatsApp Consent Flags" }), _jsxs(Stack, { direction: "row", gap: 1, flexWrap: "wrap", children: [_jsx(Chip, { label: `Status: ${consent.optInStatusUpdates ? 'Yes' : 'No'}`, color: consent.optInStatusUpdates ? 'success' : 'default', size: "small" }), _jsx(Chip, { label: `Departure Photos: ${consent.optInDeparturePhotos ? 'Yes' : 'No'}`, color: consent.optInDeparturePhotos ? 'success' : 'default', size: "small" }), _jsx(Chip, { label: `Arrival Photos: ${consent.optInArrivalPhotos ? 'Yes' : 'No'}`, color: consent.optInArrivalPhotos ? 'success' : 'default', size: "small" })] })] })] }) }) }) }), _jsx(MainPageSection, { title: "WhatsApp Consent", children: _jsx(DynamicFormWidget, { title: "", drawerMode: true, fields: buildConsentFields(consent), onSubmit: handleConsentSubmit }) }), _jsx(MainPageSection, { title: "Individual WhatsApp", children: _jsxs(Stack, { direction: "row", gap: 2, alignItems: "center", flexWrap: "wrap", children: [_jsx(TextField, { label: "Shipment ID", size: "small", value: shipmentId, onChange: (e) => setShipmentId(e.target.value), sx: { minWidth: 160 } }), _jsx(Button, { variant: "outlined", onClick: () => sendWhatsApp.mutate('status'), disabled: sendWhatsApp.isPending, children: "Status" }), _jsx(Button, { variant: "outlined", onClick: () => sendWhatsApp.mutate('departure'), disabled: sendWhatsApp.isPending, children: "Departure Photos" }), _jsx(Button, { variant: "outlined", onClick: () => sendWhatsApp.mutate('arrival'), disabled: sendWhatsApp.isPending, children: "Arrival Photos" })] }) })] })] }));
};
export default CustomerDetailPage;
