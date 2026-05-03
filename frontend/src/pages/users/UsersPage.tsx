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
import { DynamicField, IDynamicTextField, IDynamicSelectField, IDynamicCheckboxField } from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import { useUserRole, canManageUsers } from '../../helpers/rbac';

const ROLE_ITEMS: Record<string, string> = {
  Admin: 'Admin',
  Manager: 'Manager',
  Accountant: 'Accountant',
  Field: 'Field',
};

const ROLE_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Admin: { color: '#fff', backgroundColor: '#c62828' },
  Manager: { color: '#fff', backgroundColor: '#1565c0' },
  Accountant: { color: '#fff', backgroundColor: '#7b1fa2' },
  Field: { color: '#fff', backgroundColor: '#2e7d32' },
};

const UsersPage: React.FC = () => {
  const qc = useQueryClient();
  const role = useUserRole();
  const isAdmin = canManageUsers(role);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const { data = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => getJson<any[]>('/api/users'),
  });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing?.id ? putJson(`/api/users/${editing.id}`, { email: payload.email, role: payload.role, isActive: payload.isActive }) : postJson('/api/users', payload),
    onSuccess: () => {
      toast.success('User saved!');
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['/api/users'] });
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
    acc[item.id] = { ...item, isActive: String(item.isActive) };
    return acc;
  }, {});

  const header: EnhanceTableHeaderTypes[] = [
    { id: 'email', label: 'Email', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    {
      id: 'role',
      label: 'Role',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: ROLE_CHIPS,
      chipLabels: {},
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
    { id: 'lastLoginAt', label: 'Last Login', type: EnhancedTableColumnType.DATE, numeric: false, disablePadding: false } as any,
    ...(isAdmin ? [{
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
          hidden: () => false,
        },
      ],
    } as EnhancedTableActionHeader] : []),
  ];

  const fields: Record<string, any> = {
    email: {
      type: DynamicField.TEXT,
      name: 'email',
      title: 'Email',
      required: true,
      disabled: false,
      value: formValues.email || '',
    } as IDynamicTextField,
    ...(!editing ? {
      password: {
        type: DynamicField.TEXT,
        name: 'password',
        title: 'Password (min 8 chars)',
        required: true,
        disabled: false,
        value: '',
      } as IDynamicTextField,
    } : {}),
    role: {
      type: DynamicField.SELECT,
      name: 'role',
      title: 'Role',
      required: true,
      disabled: false,
      items: ROLE_ITEMS,
      value: formValues.role || 'Field',
    } as IDynamicSelectField,
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
          title="Users"
          action={isAdmin ? { title: 'Create User', onClick: openCreate } : undefined}
        />
      </PageTitleWrapper>
      <MainPageSection title="Users">
        <EnhancedTable header={header} data={tableData} title="Users" />
      </MainPageSection>
      {isAdmin && (
        <GenericDialog
          open={open}
          onClose={() => setOpen(false)}
          title={editing ? 'Edit User' : 'Create User'}
        >
          <DynamicFormWidget title="" fields={fields} onSubmit={handleSubmit} drawerMode />
        </GenericDialog>
      )}
    </>
  );
};

export default UsersPage;
