import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { TableSkeleton } from '@/components/feedback';
import { getJson, postJson, putJson, deleteJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canManageCurrencies } from '@/helpers/rbac';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol?: string | null;
  isBase: boolean;
  anchorCurrencyCode?: string | null;
  rate?: number | null;
  isActive: boolean;
}

export default function CurrenciesPage() {
  usePageTitle('Currencies');
  const dispatch = useAppDispatch();
  const role = useUserRole();
  const writable = canManageCurrencies(role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const currencies = useLoader<Currency[]>(() => getJson<Currency[]>('/api/currencies'));
  const { initializing } = useInitializeFunction([currencies.reload]);

  const openCreate = () => {
    setEditing(null);
    setFormValues({ isActive: true, isBase: false });
    setDialogOpen(true);
  };

  const openEdit = (row: Currency) => {
    setEditing(row);
    setFormValues({ ...row });
    setDialogOpen(true);
  };

  const save = async (values: Record<string, unknown>): Promise<boolean> => {
    const payload = {
      code: String(values.code ?? '').toUpperCase(),
      name: values.name,
      symbol: values.symbol || null,
      isBase: !!values.isBase,
      anchorCurrencyCode: values.isBase
        ? null
        : String(values.anchorCurrencyCode ?? '').toUpperCase() || null,
      rate: values.isBase || values.rate === '' || values.rate == null ? null : Number(values.rate),
      isActive: values.isActive ?? true,
    };
    try {
      if (editing) await putJson(`/api/currencies/${editing.code}`, payload);
      else await postJson('/api/currencies', payload);
      toast.success('Currency saved');
      setDialogOpen(false);
      setEditing(null);
      await currencies.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const remove = (code: string) => {
    dispatch(
      OpenConfirmation({
        title: 'Delete Currency',
        message: `Delete currency "${code}"? Cannot be undone.`,
        destructive: true,
        confirmText: 'Delete',
        onSubmit: async () => {
          try {
            await deleteJson(`/api/currencies/${code}`);
            toast.success('Currency deleted');
            await currencies.reload();
          } catch (e) {
            toast.error(parseApiError(e).message);
          }
        },
      }),
    );
  };

  const tableData = useMemo(
    () =>
      (currencies.data ?? []).reduce<Record<string, Currency & { anchorDisplay: string; rateDisplay: string }>>(
        (acc, c) => {
          acc[c.code] = {
            ...c,
            anchorDisplay: c.isBase ? '— (base)' : c.anchorCurrencyCode ?? '—',
            rateDisplay: c.isBase
              ? '—'
              : c.rate != null
              ? `1 ${c.code} = ${c.rate} ${c.anchorCurrencyCode}`
              : '—',
          };
          return acc;
        },
        {},
      ),
    [currencies.data],
  );

  const headers: EnhanceTableHeaderTypes[] = [
    { id: 'code', label: 'Code', type: EnhancedTableColumnType.TEXT },
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT },
    { id: 'symbol', label: 'Symbol', type: EnhancedTableColumnType.TEXT },
    {
      id: 'isBase',
      label: 'Base',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#1976d2' },
        false: { color: '#000', backgroundColor: '#e0e0e0' },
      },
      chipLabels: { true: 'Base', false: '—' },
    },
    { id: 'anchorDisplay', label: 'Anchor', type: EnhancedTableColumnType.TEXT },
    { id: 'rateDisplay', label: 'Rate', type: EnhancedTableColumnType.TEXT },
    {
      id: 'isActive',
      label: 'Active',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#fff', backgroundColor: '#9e9e9e' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: writable
        ? [
            {
              icon: <Pencil className="size-4" />,
              label: 'Edit',
              onClick: (_id, row) => openEdit(row as unknown as Currency),
            },
            {
              icon: <Trash2 className="size-4" />,
              label: 'Delete',
              onClick: (code) => remove(code),
            },
          ]
        : [],
    },
  ];

  const isBase = !!formValues.isBase;
  const anchorItems = (currencies.data ?? [])
    .filter((c) => !editing || c.code !== editing.code)
    .reduce<Record<string, string>>((acc, c) => {
      acc[c.code] = c.code;
      return acc;
    }, {});

  const fields: FieldMap = {
    code: {
      type: DynamicField.TEXT,
      name: 'code',
      title: 'Code (ISO 4217, e.g. USD)',
      required: true,
      disabled: !!editing,
      value: (formValues.code as string) ?? '',
      grid: { sm: 6, md: 4 },
    },
    name: {
      type: DynamicField.TEXT,
      name: 'name',
      title: 'Name',
      required: true,
      value: (formValues.name as string) ?? '',
      grid: { sm: 6, md: 4 },
    },
    symbol: {
      type: DynamicField.TEXT,
      name: 'symbol',
      title: 'Symbol (optional)',
      value: (formValues.symbol as string) ?? '',
      grid: { sm: 6, md: 4 },
    },
    isBase: {
      type: DynamicField.CHECKBOX,
      name: 'isBase',
      title: 'Is base currency',
      value: (formValues.isBase as boolean) ?? false,
    },
    anchorCurrencyCode: {
      type: DynamicField.SELECT,
      name: 'anchorCurrencyCode',
      title: 'Anchor Currency',
      required: !isBase,
      conditionalHidden: (vals) => !!vals.isBase,
      items: anchorItems,
      value: (formValues.anchorCurrencyCode as string) ?? '',
      grid: { sm: 6, md: 6 },
    },
    rate: {
      type: DynamicField.NUMBER,
      name: 'rate',
      title: `Rate (1 ${String(formValues.code ?? '?').toUpperCase()} = ? ${String(
        formValues.anchorCurrencyCode ?? '?',
      ).toUpperCase()})`,
      required: !isBase,
      conditionalHidden: (vals) => !!vals.isBase,
      value: (formValues.rate as number | string) ?? '',
      min: 0,
      step: 0.000001,
      grid: { sm: 6, md: 6 },
    },
    isActive: {
      type: DynamicField.CHECKBOX,
      name: 'isActive',
      title: 'Active',
      value: (formValues.isActive as boolean) ?? true,
    },
  };

  return (
    <>
      <MainPageTitle
        title="Currencies"
        action={writable ? { title: 'Create Currency', onClick: openCreate } : undefined}
      />
      <div className="px-4 sm:px-6 pb-6">
        {initializing ? (
          <TableSkeleton rows={6} columns={7} />
        ) : (
          <EnhancedTable
            title="Currencies"
            header={headers}
            data={tableData as never}
            defaultOrder="code"
            defaultDirection="asc"
          />
        )}
      </div>

      <GenericDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.code}` : 'Create Currency'}
      >
        <DynamicFormWidget
          fields={fields}
          onSubmit={save}
          drawerMode
          onFieldChange={(_n, _v, all) => setFormValues({ ...all })}
        />
      </GenericDialog>
    </>
  );
}
