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
const GoodsPage = () => {
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formValues, setFormValues] = useState({});
    const { data = [], isLoading } = useQuery({
        queryKey: ['/api/goods'],
        queryFn: () => getJson('/api/goods'),
    });
    const save = useMutation({
        mutationFn: (payload) => editing?.id ? putJson(`/api/goods/${editing.id}`, payload) : postJson('/api/goods', payload),
        onSuccess: () => {
            toast.success('Good saved!');
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['/api/goods'] });
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
        { id: 'nameEn', label: 'Name (EN)', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'nameAr', label: 'Name (AR)', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        { id: 'unit', label: 'Unit', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
        {
            id: 'canBurn',
            label: 'Can Burn',
            type: EnhancedTableColumnType.COLORED_CHIP,
            numeric: false,
            disablePadding: false,
            chipColors: {
                true: { color: '#fff', backgroundColor: '#f44336' },
                false: { color: '#fff', backgroundColor: '#9e9e9e' },
            },
            chipLabels: { true: 'Yes', false: 'No' },
        },
        {
            id: 'canBreak',
            label: 'Can Break',
            type: EnhancedTableColumnType.COLORED_CHIP,
            numeric: false,
            disablePadding: false,
            chipColors: {
                true: { color: '#fff', backgroundColor: '#ff9800' },
                false: { color: '#fff', backgroundColor: '#9e9e9e' },
            },
            chipLabels: { true: 'Yes', false: 'No' },
        },
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
        goodTypeId: {
            type: DynamicField.NUMBER,
            name: 'goodTypeId',
            title: 'Good Type ID',
            required: true,
            disabled: false,
            value: formValues.goodTypeId ?? '',
        },
        nameEn: {
            type: DynamicField.TEXT,
            name: 'nameEn',
            title: 'Name (EN)',
            required: true,
            disabled: false,
            value: formValues.nameEn || '',
        },
        nameAr: {
            type: DynamicField.TEXT,
            name: 'nameAr',
            title: 'Name (AR)',
            required: true,
            disabled: false,
            value: formValues.nameAr || '',
        },
        unit: {
            type: DynamicField.TEXT,
            name: 'unit',
            title: 'Unit',
            required: true,
            disabled: false,
            value: formValues.unit || '',
        },
        canBurn: {
            type: DynamicField.CHECKBOX,
            name: 'canBurn',
            title: 'Can Burn',
            required: false,
            disabled: false,
            value: formValues.canBurn ?? false,
        },
        canBreak: {
            type: DynamicField.CHECKBOX,
            name: 'canBreak',
            title: 'Can Break',
            required: false,
            disabled: false,
            value: formValues.canBreak ?? false,
        },
        ratePerKgOverride: {
            type: DynamicField.NUMBER,
            name: 'ratePerKgOverride',
            title: 'Rate/Kg Override',
            required: false,
            disabled: false,
            value: formValues.ratePerKgOverride ?? '',
        },
        ratePerM3Override: {
            type: DynamicField.NUMBER,
            name: 'ratePerM3Override',
            title: 'Rate/M³ Override',
            required: false,
            disabled: false,
            value: formValues.ratePerM3Override ?? '',
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
    return (_jsxs(_Fragment, { children: [_jsx(PageTitleWrapper, { children: _jsx(MainPageTitle, { title: "Goods", action: { title: 'Create Good', onClick: openCreate } }) }), _jsx(MainPageSection, { title: "Goods", children: _jsx(EnhancedTable, { header: header, data: tableData, title: "Goods" }) }), _jsx(GenericDialog, { open: open, onClose: () => setOpen(false), title: editing ? 'Edit Good' : 'Create Good', children: _jsx(DynamicFormWidget, { title: "", fields: fields, onSubmit: handleSubmit, drawerMode: true }) })] }));
};
export default GoodsPage;
