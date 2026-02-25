import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Box, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { getJson, postJson, putJson, parseApiError } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhancedTableColumnType,
  IEnhancedTextHeader,
  EnhancedTableColoredChipHeader,
  EnhancedTableActionHeader,
  EnhanceTableHeaderTypes,
} from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, IDynamicTextField, IDynamicNumberField, IDynamicCheckboxField } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';

const GoodsPage: React.FC = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ['/api/goods'],
    queryFn: () => getJson<any[]>('/api/goods'),
  });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing?.id ? putJson(`/api/goods/${editing.id}`, payload) : postJson('/api/goods', payload),
    onSuccess: () => {
      toast.success('Good saved!');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['/api/goods'] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Save failed'),
  });

  const openCreate = () => {
    setFormValues({});
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const row = (data ?? []).find((item: any) => String(item.id) === id);
    if (row) {
      setFormValues(row);
      setEditing(row);
      setOpen(true);
    }
  };

  const tableData = (data ?? []).reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const header: EnhanceTableHeaderTypes[] = [
    { id: 'nameEn', label: 'Name (EN)', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'nameAr', label: 'Name (AR)', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'unit', label: 'Unit', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
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
    } as EnhancedTableColoredChipHeader,
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
    } as EnhancedTableColoredChipHeader,
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
    } as EnhancedTableColoredChipHeader,
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      numeric: false,
      disablePadding: false,
      actions: [
        {
          icon: <Icon icon="mdi:pencil" />,
          label: 'Edit',
          onClick: (id: string) => openEdit(id),
          hidden: (_row: Record<string, any>) => false,
        },
      ],
    } as EnhancedTableActionHeader,
  ];

  const fields = {
    goodTypeId: {
      type: DynamicField.NUMBER,
      name: 'goodTypeId',
      title: 'Good Type ID',
      required: true,
      disabled: false,
      value: formValues.goodTypeId ?? '',
    } as IDynamicNumberField,
    nameEn: {
      type: DynamicField.TEXT,
      name: 'nameEn',
      title: 'Name (EN)',
      required: true,
      disabled: false,
      value: formValues.nameEn || '',
    } as IDynamicTextField,
    nameAr: {
      type: DynamicField.TEXT,
      name: 'nameAr',
      title: 'Name (AR)',
      required: true,
      disabled: false,
      value: formValues.nameAr || '',
    } as IDynamicTextField,
    unit: {
      type: DynamicField.TEXT,
      name: 'unit',
      title: 'Unit',
      required: true,
      disabled: false,
      value: formValues.unit || '',
    } as IDynamicTextField,
    canBurn: {
      type: DynamicField.CHECKBOX,
      name: 'canBurn',
      title: 'Can Burn',
      required: false,
      disabled: false,
      value: formValues.canBurn ?? false,
    } as IDynamicCheckboxField,
    canBreak: {
      type: DynamicField.CHECKBOX,
      name: 'canBreak',
      title: 'Can Break',
      required: false,
      disabled: false,
      value: formValues.canBreak ?? false,
    } as IDynamicCheckboxField,
    ratePerKgOverride: {
      type: DynamicField.NUMBER,
      name: 'ratePerKgOverride',
      title: 'Rate/Kg Override',
      required: false,
      disabled: false,
      value: formValues.ratePerKgOverride ?? '',
    } as IDynamicNumberField,
    ratePerM3Override: {
      type: DynamicField.NUMBER,
      name: 'ratePerM3Override',
      title: 'Rate/M³ Override',
      required: false,
      disabled: false,
      value: formValues.ratePerM3Override ?? '',
    } as IDynamicNumberField,
    isActive: {
      type: DynamicField.CHECKBOX,
      name: 'isActive',
      title: 'Active',
      required: false,
      disabled: false,
      value: formValues.isActive ?? true,
    } as IDynamicCheckboxField,
  };

  const handleSubmit = async (values: Record<string, any>) => {
    try {
      await save.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <PageTitleWrapper>
        <MainPageTitle
          title="Goods"
          action={{ title: 'Create Good', onClick: openCreate }}
        />
      </PageTitleWrapper>
      <MainPageSection title="Goods">
        <EnhancedTable header={header} data={tableData} title="Goods" />
      </MainPageSection>
      <GenericDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Good' : 'Create Good'}
      >
        <DynamicFormWidget title="" fields={fields} onSubmit={handleSubmit} drawerMode />
      </GenericDialog>
    </>
  );
};

export default GoodsPage;
