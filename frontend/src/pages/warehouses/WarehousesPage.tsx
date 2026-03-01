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
  EnhancedTableNumberHeader,
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

const WarehousesPage: React.FC = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ['/api/warehouses'],
    queryFn: () => getJson<any[]>('/api/warehouses'),
  });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing?.id ? putJson(`/api/warehouses/${editing.id}`, payload) : postJson('/api/warehouses', payload),
    onSuccess: () => {
      toast.success('Warehouse saved!');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['/api/warehouses'] });
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
    { id: 'code', label: 'Code', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'city', label: 'City', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'country', label: 'Country', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'maxWeightKg', label: 'Max Weight (kg)', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false } as EnhancedTableNumberHeader,
    { id: 'maxCbm', label: 'Max CBM', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false } as EnhancedTableNumberHeader,
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
    code: {
      type: DynamicField.TEXT,
      name: 'code',
      title: 'Code',
      required: true,
      disabled: false,
      value: formValues.code || '',
    } as IDynamicTextField,
    name: {
      type: DynamicField.TEXT,
      name: 'name',
      title: 'Name',
      required: true,
      disabled: false,
      value: formValues.name || '',
    } as IDynamicTextField,
    city: {
      type: DynamicField.TEXT,
      name: 'city',
      title: 'City',
      required: true,
      disabled: false,
      value: formValues.city || '',
    } as IDynamicTextField,
    country: {
      type: DynamicField.TEXT,
      name: 'country',
      title: 'Country',
      required: true,
      disabled: false,
      value: formValues.country || '',
    } as IDynamicTextField,
    maxWeightKg: {
      type: DynamicField.NUMBER,
      name: 'maxWeightKg',
      title: 'Max Weight (kg)',
      required: true,
      disabled: false,
      value: formValues.maxWeightKg ?? '',
    } as IDynamicNumberField,
    maxCbm: {
      type: DynamicField.NUMBER,
      name: 'maxCbm',
      title: 'Max CBM',
      required: true,
      disabled: false,
      value: formValues.maxCbm ?? '',
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
          title="Warehouses"
          action={{ title: 'Create Warehouse', onClick: openCreate }}
        />
      </PageTitleWrapper>
      <MainPageSection title="Warehouses">
        <EnhancedTable header={header} data={tableData} title="Warehouses" />
      </MainPageSection>
      <GenericDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Warehouse' : 'Create Warehouse'}
      >
        <DynamicFormWidget title="" fields={fields} onSubmit={handleSubmit} drawerMode />
      </GenericDialog>
    </>
  );
};

export default WarehousesPage;
