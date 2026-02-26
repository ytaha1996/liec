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
import { DynamicField, IDynamicTextField, IDynamicCheckboxField } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';

const SuppliersPage: React.FC = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: () => getJson<any[]>('/api/suppliers'),
  });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing?.id ? putJson(`/api/suppliers/${editing.id}`, payload) : postJson('/api/suppliers', payload),
    onSuccess: () => {
      toast.success('Supplier saved!');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['/api/suppliers'] });
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
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'email', label: 'Email', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
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
    name: {
      type: DynamicField.TEXT,
      name: 'name',
      title: 'Name',
      required: true,
      disabled: false,
      value: formValues.name || '',
    } as IDynamicTextField,
    email: {
      type: DynamicField.TEXT,
      name: 'email',
      title: 'Email',
      required: false,
      disabled: false,
      value: formValues.email || '',
      inputType: 'email',
    } as IDynamicTextField,
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
          title="Suppliers"
          action={{ title: 'Create Supplier', onClick: openCreate }}
        />
      </PageTitleWrapper>
      <MainPageSection title="Suppliers">
        <EnhancedTable header={header} data={tableData} title="Suppliers" />
      </MainPageSection>
      <GenericDialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Supplier' : 'Create Supplier'}
      >
        <DynamicFormWidget title="" fields={fields} onSubmit={handleSubmit} drawerMode />
      </GenericDialog>
    </>
  );
};

export default SuppliersPage;
