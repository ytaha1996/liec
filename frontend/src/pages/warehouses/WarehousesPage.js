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
const WarehousesPage = () => {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formValues, setFormValues] = useState({});
    const { data = [], isLoading } = useQuery({
        queryKey: ['/api/warehouses'],
        queryFn: () => getJson('/api/warehouses'),
    });
    const save = useMutation({
        mutationFn: (payload) => editing?.id ? putJson(`/api/warehouses/${editing.id}`, payload) : postJson('/api/warehouses', payload),
        onSuccess: () => {
            toast.success('Warehouse saved!');
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['/api/warehouses'] });
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
        { id: 'code', label: 'Code', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'city', label: 'City', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'country', label: 'Country', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'maxWeightKg', label: 'Max Weight (kg)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
        { id: 'maxVolumeM3', label: 'Max Volume (m³)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
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
        code: {
            type: DynamicField.TEXT,
            name: 'code',
            title: 'Code',
            required: true,
            disabled: false,
            value: formValues.code || '',
        },
        name: {
            type: DynamicField.TEXT,
            name: 'name',
            title: 'Name',
            required: true,
            disabled: false,
            value: formValues.name || '',
        },
        city: {
            type: DynamicField.TEXT,
            name: 'city',
            title: 'City',
            required: true,
            disabled: false,
            value: formValues.city || '',
        },
        country: {
            type: DynamicField.TEXT,
            name: 'country',
            title: 'Country',
            required: true,
            disabled: false,
            value: formValues.country || '',
        },
        maxWeightKg: {
            type: DynamicField.NUMBER,
            name: 'maxWeightKg',
            title: 'Max Weight (kg)',
            required: true,
            disabled: false,
            value: formValues.maxWeightKg ?? '',
        },
        maxVolumeM3: {
            type: DynamicField.NUMBER,
            name: 'maxVolumeM3',
            title: 'Max Volume (m³)',
            required: true,
            disabled: false,
            value: formValues.maxVolumeM3 ?? '',
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
    return (_jsxs(_Fragment, { children: [_jsx(PageTitleWrapper, { children: _jsx(MainPageTitle, { title: "Warehouses", action: { title: 'Create Warehouse', onClick: openCreate } }) }), _jsx(MainPageSection, { title: "Warehouses", children: _jsx(EnhancedTable, { header: header, data: tableData, title: "Warehouses" }) }), _jsx(GenericDialog, { open: open, onClose: () => setOpen(false), title: editing ? 'Edit Warehouse' : 'Create Warehouse', children: _jsx(DynamicFormWidget, { title: "", fields: fields, onSubmit: handleSubmit, drawerMode: true }) })] }));
};
export default WarehousesPage;
