import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Box, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { getJson, postJson, putJson, parseApiError } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhancedTableColumnType, } from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
const SuppliersPage = () => {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formValues, setFormValues] = useState({});
    const { data = [], isLoading } = useQuery({
        queryKey: ['/api/suppliers'],
        queryFn: () => getJson('/api/suppliers'),
    });
    const save = useMutation({
        mutationFn: (payload) => editing?.id ? putJson(`/api/suppliers/${editing.id}`, payload) : postJson('/api/suppliers', payload),
        onSuccess: () => {
            toast.success('Supplier saved!');
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['/api/suppliers'] });
        },
        onError: (e) => toast.error(parseApiError(e).message ?? 'Save failed'),
    });
    const openCreate = () => {
        setFormValues({});
        setEditing(null);
        setOpen(true);
    };
    const openEdit = (id) => {
        const row = (data ?? []).find((item) => String(item.id) === id);
        if (row) {
            setFormValues(row);
            setEditing(row);
            setOpen(true);
        }
    };
    const tableData = (data ?? []).reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
    }, {});
    const header = [
        { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'email', label: 'Email', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        {
            id: 'isActive',
            label: 'Active',
            type: EnhancedTableColumnType.COLORED_CHIP,
            numeric: false,
            disablePadding: false,
            chipColors: {
                true: { color: '#fff', backgroundColor: '#4caf50' },
                false: { color: '#fff', backgroundColor: '#9e9e9e' },
            },
            chipLabels: { true: 'Yes', false: 'No' },
        },
        {
            id: 'actions',
            label: 'Actions',
            type: EnhancedTableColumnType.Action,
            numeric: false,
            disablePadding: false,
            actions: [
                {
                    icon: _jsx(Icon, { icon: "mdi:pencil" }),
                    label: 'Edit',
                    onClick: (id) => openEdit(id),
                    hidden: (_row) => false,
                },
            ],
        },
    ];
    const fields = {
        name: {
            type: DynamicField.TEXT,
            name: 'name',
            title: 'Name',
            required: true,
            disabled: false,
            value: formValues.name || '',
        },
        email: {
            type: DynamicField.TEXT,
            name: 'email',
            title: 'Email',
            required: false,
            disabled: false,
            value: formValues.email || '',
            inputType: 'email',
        },
        isActive: {
            type: DynamicField.CHECKBOX,
            name: 'isActive',
            title: 'Active',
            required: false,
            disabled: false,
            value: formValues.isActive ?? true,
        },
    };
    const handleSubmit = async (values) => {
        try {
            await save.mutateAsync(values);
            return true;
        }
        catch {
            return false;
        }
    };
    if (isLoading) {
        return (_jsx(Box, { sx: { py: 4, textAlign: 'center' }, children: _jsx(CircularProgress, {}) }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(PageTitleWrapper, { children: _jsx(MainPageTitle, { title: "Suppliers", action: { title: 'Create Supplier', onClick: openCreate } }) }), _jsx(MainPageSection, { title: "Suppliers", children: _jsx(EnhancedTable, { header: header, data: tableData, title: "Suppliers" }) }), _jsx(GenericDialog, { open: open, onClose: () => setOpen(false), title: editing ? 'Edit Supplier' : 'Create Supplier', children: _jsx(DynamicFormWidget, { title: "", fields: fields, onSubmit: handleSubmit, drawerMode: true }) })] }));
};
export default SuppliersPage;
