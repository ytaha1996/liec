import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Box, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { api, getJson, postJson, putJson, parseApiError } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhancedTableColumnType,
  IEnhancedTextHeader,
  EnhancedTableColoredChipHeader,
  EnhancedTableActionHeader,
  EnhanceTableHeaderTypes,
} from '../../components/enhanced-table';
import DynamicFormWidget from '../../components/dynamic-widget/DynamicFormWidget';
import {
  DynamicField,
  IDynamicTextField,
  IDynamicCheckboxField,
  IDynamicNumberField,
  IDynamicSelectField,
} from '../../components/dynamic-widget';
import GenericDialog from '../../components/GenericDialog/GenericDialog';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import { useAppDispatch } from '../../redux/hooks';
import { useUserRole, canManageCurrencies } from '../../helpers/rbac';
import type { Currency } from '../../api/currencies';

const CurrenciesPage: React.FC = () => {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const role = useUserRole();
  const isAdmin = canManageCurrencies(role); // matches backend [Authorize(Roles="Admin")] on POST/PUT/DELETE
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const { data = [], isLoading } = useQuery<Currency[]>({
    queryKey: ['/api/currencies'],
    queryFn: () => getJson<Currency[]>('/api/currencies'),
  });

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? putJson(`/api/currencies/${editing.code}`, payload)
        : postJson('/api/currencies', payload),
    onSuccess: () => {
      toast.success('Currency saved');
      setOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['/api/currencies'] });
      qc.invalidateQueries({ queryKey: ['/api/lookups/currencies'] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Save failed'),
  });

  const remove = useMutation({
    mutationFn: (code: string) => api.delete(`/api/currencies/${code}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Currency deleted');
      qc.invalidateQueries({ queryKey: ['/api/currencies'] });
      qc.invalidateQueries({ queryKey: ['/api/lookups/currencies'] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Delete failed'),
  });

  const openCreate = () => {
    setFormValues({ isActive: true, isBase: false });
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (code: string) => {
    const row = data.find((item) => item.code === code);
    if (row) {
      setFormValues({ ...row });
      setEditing(row);
      setOpen(true);
    }
  };

  const tableData = data.reduce((acc: Record<string, any>, item) => {
    acc[item.code] = {
      ...item,
      anchorDisplay: item.isBase ? '— (base)' : item.anchorCurrencyCode ?? '—',
      rateDisplay: item.isBase
        ? '—'
        : item.rate != null
          ? `1 ${item.code} = ${item.rate} ${item.anchorCurrencyCode}`
          : '—',
    };
    return acc;
  }, {});

  const header: EnhanceTableHeaderTypes[] = [
    { id: 'code', label: 'Code', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'symbol', label: 'Symbol', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    {
      id: 'isBase',
      label: 'Base',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#1976d2' },
        false: { color: '#000', backgroundColor: '#e0e0e0' },
      },
      chipLabels: { true: 'Base', false: '—' },
    } as EnhancedTableColoredChipHeader,
    { id: 'anchorDisplay', label: 'Anchor', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'rateDisplay', label: 'Rate', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
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
          onClick: (code: string) => openEdit(code),
          hidden: () => !isAdmin,
        },
        {
          icon: <Icon icon="mdi:delete" />,
          label: 'Delete',
          onClick: (code: string) => {
            const row = data.find((item) => item.code === code);
            if (!row) return;
            dispatch(OpenConfirmation({
              open: true,
              title: 'Delete Currency',
              message: `Delete currency "${row.code}"? Cannot be undone.`,
              onSubmit: () => remove.mutate(row.code),
            }));
          },
          hidden: () => !isAdmin,
        },
      ],
    } as EnhancedTableActionHeader,
  ];

  const isBase = !!formValues.isBase;
  const allCodesExceptSelf = data
    .filter((c) => !editing || c.code !== editing.code)
    .map((c) => c.code);
  const anchorItems = allCodesExceptSelf.reduce((acc: Record<string, string>, code) => {
    acc[code] = code;
    return acc;
  }, {});

  const fields: Record<string, any> = {
    code: {
      type: DynamicField.TEXT,
      name: 'code',
      title: 'Code (ISO 4217, e.g. USD)',
      required: true,
      disabled: !!editing,
      value: formValues.code ?? '',
      maxChars: 3,
    } as IDynamicTextField,
    name: {
      type: DynamicField.TEXT,
      name: 'name',
      title: 'Name',
      required: true,
      disabled: false,
      value: formValues.name ?? '',
    } as IDynamicTextField,
    symbol: {
      type: DynamicField.TEXT,
      name: 'symbol',
      title: 'Symbol (optional, e.g. $, €, FCFA)',
      required: false,
      disabled: false,
      value: formValues.symbol ?? '',
    } as IDynamicTextField,
    isBase: {
      type: DynamicField.CHECKBOX,
      name: 'isBase',
      title: 'Is base currency',
      required: false,
      disabled: false,
      value: formValues.isBase ?? false,
    } as IDynamicCheckboxField,
    ...(isBase
      ? {}
      : {
          anchorCurrencyCode: {
            type: DynamicField.SELECT,
            name: 'anchorCurrencyCode',
            title: 'Anchor Currency',
            required: true,
            disabled: false,
            items: anchorItems,
            value: formValues.anchorCurrencyCode ?? '',
          } as IDynamicSelectField,
          rate: {
            type: DynamicField.NUMBER,
            name: 'rate',
            title: `Rate (1 ${(formValues.code ?? '?').toString().toUpperCase()} = ? ${(formValues.anchorCurrencyCode ?? '?').toString().toUpperCase()})`,
            required: true,
            disabled: false,
            value: formValues.rate ?? '',
            min: 0,
            step: 0.000001,
          } as IDynamicNumberField,
        }),
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
    const payload = {
      code: (values.code ?? '').toString().toUpperCase(),
      name: values.name,
      symbol: values.symbol || null,
      isBase: !!values.isBase,
      anchorCurrencyCode: values.isBase ? null : (values.anchorCurrencyCode ?? '').toString().toUpperCase() || null,
      rate: values.isBase ? null : values.rate === '' || values.rate == null ? null : Number(values.rate),
      isActive: values.isActive ?? true,
    };
    try {
      await save.mutateAsync(payload);
      return true;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <>
      <PageTitleWrapper>
        <MainPageTitle
          title="Currencies"
          action={isAdmin ? { title: 'Create Currency', onClick: openCreate } : undefined}
        />
      </PageTitleWrapper>
      <EnhancedTable header={header} data={tableData} title="Currencies" />
      <GenericDialog open={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? `Edit ${editing.code}` : 'Create Currency'}>
        <DynamicFormWidget
          title=""
          drawerMode
          fields={fields}
          onSubmit={handleSubmit}
          onFieldChange={(name, value, all) => setFormValues({ ...all })}
        />
      </GenericDialog>
    </>
  );
};

export default CurrenciesPage;
