import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Stack } from '@mui/material';
import { toast } from 'react-toastify';
import { getJson, postJson, putJson } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhancedTableColumnType, } from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
const ENDPOINT = '/api/customers';
const buildFields = (initial) => ({
    customerRef: {
        type: DynamicField.TEXT,
        name: 'customerRef',
        title: 'Customer Ref',
        required: true,
        disabled: false,
        value: initial?.customerRef ?? '',
    },
    name: {
        type: DynamicField.TEXT,
        name: 'name',
        title: 'Name',
        required: true,
        disabled: false,
        value: initial?.name ?? '',
    },
    primaryPhone: {
        type: DynamicField.PHONENUMBER,
        name: 'primaryPhone',
        title: 'Primary Phone',
        required: true,
        disabled: false,
        value: initial?.primaryPhone ?? '',
    },
    email: {
        type: DynamicField.EMAIL,
        name: 'email',
        title: 'Email',
        required: false,
        disabled: false,
        value: initial?.email ?? '',
    },
    isActive: {
        type: DynamicField.CHECKBOX,
        name: 'isActive',
        title: 'Is Active',
        required: false,
        disabled: false,
        value: initial?.isActive ?? true,
    },
});
const CustomersPage = () => {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const { data = [] } = useQuery({
        queryKey: [ENDPOINT],
        queryFn: () => getJson(ENDPOINT),
    });
    const save = useMutation({
        mutationFn: (payload) => editing ? putJson(`${ENDPOINT}/${editing.id}`, payload) : postJson(ENDPOINT, payload),
        onSuccess: () => {
            toast.success(editing ? 'Customer updated' : 'Customer created');
            qc.invalidateQueries({ queryKey: [ENDPOINT] });
            setDialogOpen(false);
            setEditing(null);
        },
        onError: () => toast.error('Save failed'),
    });
    const exportMut = useMutation({
        mutationFn: (format) => postJson('/api/exports/group-helper', { format }),
        onSuccess: (r) => {
            window.open(r.publicUrl, '_blank');
            toast.success('Export generated');
        },
        onError: () => toast.error('Export failed'),
    });
    const tableData = (data ?? []).reduce((acc, item) => {
        acc[item.id] = { ...item, isActive: String(item.isActive) };
        return acc;
    }, {});
    const tableHeaders = [
        { id: 'customerRef', label: 'Ref', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'primaryPhone', label: 'Phone', type: EnhancedTableColumnType.PhoneNumber, numeric: false, disablePadding: false },
        { id: 'email', label: 'Email', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        {
            id: 'isActive',
            label: 'Active',
            type: EnhancedTableColumnType.COLORED_CHIP,
            numeric: false,
            disablePadding: false,
            chipColors: {
                true: { color: '#fff', backgroundColor: '#2e7d32' },
                false: { color: '#fff', backgroundColor: '#9e9e9e' },
            },
            chipLabels: { true: 'Active', false: 'Inactive' },
        },
        {
            id: 'actions',
            label: 'Actions',
            type: EnhancedTableColumnType.Action,
            numeric: false,
            disablePadding: false,
            actions: [
                {
                    icon: _jsx(EditIcon, { fontSize: "small" }),
                    label: 'Edit',
                    onClick: (id) => {
                        const row = tableData[id];
                        if (row) {
                            setEditing(row);
                            setDialogOpen(true);
                        }
                    },
                    hidden: () => false,
                },
                {
                    icon: _jsx(OpenInNewIcon, { fontSize: "small" }),
                    label: 'Open Detail',
                    onClick: (id) => navigate(`/customers/${id}`),
                    hidden: () => false,
                },
            ],
        },
    ];
    const handleSubmit = async (values) => {
        try {
            await save.mutateAsync(values);
            return true;
        }
        catch {
            return false;
        }
    };
    return (_jsxs(Box, { children: [_jsx(MainPageTitle, { title: "Customers", action: {
                    title: 'Create Customer',
                    onClick: () => {
                        setEditing(null);
                        setDialogOpen(true);
                    },
                } }), _jsxs(Box, { sx: { px: 3, pb: 3 }, children: [_jsx(EnhancedTable, { title: "Customers", header: tableHeaders, data: tableData, defaultOrder: "name" }), _jsxs(Box, { sx: { mt: 3 }, children: [_jsx(Alert, { severity: "warning", sx: { mb: 2 }, children: "WhatsApp groups reveal phone numbers to all members. Use export features responsibly." }), _jsxs(Stack, { direction: "row", gap: 2, children: [_jsx(Button, { variant: "outlined", onClick: () => exportMut.mutate('csv'), disabled: exportMut.isPending, children: "Export CSV" }), _jsx(Button, { variant: "outlined", onClick: () => exportMut.mutate('vcf'), disabled: exportMut.isPending, children: "Export VCF" })] })] })] }), _jsx(GenericDialog, { open: dialogOpen, title: editing ? 'Edit Customer' : 'Create Customer', onClose: () => {
                    setDialogOpen(false);
                    setEditing(null);
                }, children: _jsx(DynamicFormWidget, { title: "", drawerMode: true, fields: buildFields(editing ?? undefined), onSubmit: handleSubmit }) })] }));
};
export default CustomersPage;
