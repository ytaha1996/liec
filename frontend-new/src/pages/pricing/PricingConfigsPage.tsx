import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, CheckCircle2, Archive } from 'lucide-react';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { TableSkeleton } from '@/components/feedback';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getJson, postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canWriteMasterData } from '@/helpers/rbac';
import { PRICING_CONFIG_STATUS_LABELS } from '@/constants/statusLabels';
import { PRICING_CONFIG_STATUS_CHIPS } from '@/constants/statusColors';

const ENDPOINT = '/api/pricing-configs';

interface Currency {
  code: string;
  name: string;
  symbol?: string | null;
  isActive: boolean;
}

interface PricingConfig {
  id: number;
  name: string;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  defaultRatePerKg: number;
  defaultRatePerCbm: number;
  minimumCharge: number;
  status: string;
}

const buildFields = (currencyItems: Record<string, string>, initial?: Partial<PricingConfig>): FieldMap => ({
  name: {
    type: DynamicField.TEXT,
    name: 'name',
    title: 'Name',
    required: true,
    value: initial?.name ?? '',
    grid: { sm: 12, md: 6 },
  },
  currency: {
    type: DynamicField.SELECT,
    name: 'currency',
    title: 'Currency',
    required: true,
    items: currencyItems,
    value: initial?.currency ?? '',
    grid: { sm: 12, md: 6 },
  },
  effectiveFrom: {
    type: DynamicField.DATE,
    name: 'effectiveFrom',
    title: 'Effective From',
    required: true,
    value: initial?.effectiveFrom ?? null,
    grid: { sm: 6, md: 6 },
  },
  effectiveTo: {
    type: DynamicField.DATE,
    name: 'effectiveTo',
    title: 'Effective To',
    value: initial?.effectiveTo ?? null,
    grid: { sm: 6, md: 6 },
  },
  defaultRatePerCbm: {
    type: DynamicField.NUMBER,
    name: 'defaultRatePerCbm',
    title: 'Default Rate Per CBM',
    required: true,
    value: initial?.defaultRatePerCbm ?? '',
    min: 0,
    grid: { sm: 6, md: 6 },
  },
  defaultRatePerKg: {
    type: DynamicField.NUMBER,
    name: 'defaultRatePerKg',
    title: 'Default Rate Per Kg',
    required: true,
    value: initial?.defaultRatePerKg ?? '',
    min: 0,
    grid: { sm: 6, md: 6 },
  },
  minimumCharge: {
    type: DynamicField.NUMBER,
    name: 'minimumCharge',
    title: 'Minimum Charge (0 = none)',
    value: initial?.minimumCharge ?? 0,
    min: 0,
  },
});

export default function PricingConfigsPage() {
  usePageTitle('Pricing Configs');
  const role = useUserRole();
  const writable = canWriteMasterData(role);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PricingConfig | null>(null);

  const configs = useLoader<PricingConfig[]>(() => getJson<PricingConfig[]>(ENDPOINT));
  const currencies = useLoader<Currency[]>(() => getJson<Currency[]>('/api/currencies'));
  const { initializing, error } = useInitializeFunction([configs.reload, currencies.reload]);

  const currencyItems = (currencies.data ?? [])
    .filter((c) => c.isActive)
    .reduce<Record<string, string>>((acc, c) => {
      acc[c.code] = `${c.code} — ${c.name}${c.symbol ? ` (${c.symbol})` : ''}`;
      return acc;
    }, {});

  const save = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      if (editing) await putJson(`${ENDPOINT}/${editing.id}`, values);
      else await postJson(ENDPOINT, values);
      toast.success(editing ? 'Pricing config updated' : 'Pricing config created');
      setDialogOpen(false);
      setEditing(null);
      await configs.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const activate = async (id: string) => {
    try {
      await postJson(`${ENDPOINT}/${id}/activate`);
      toast.success('Config activated');
      await configs.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const retire = async (id: string) => {
    try {
      await postJson(`${ENDPOINT}/${id}/retire`);
      toast.success('Config retired');
      await configs.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const tableData = (configs.data ?? []).reduce<Record<string, PricingConfig>>((acc, c) => {
    acc[String(c.id)] = c;
    return acc;
  }, {});

  const headers: EnhanceTableHeaderTypes[] = [
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT },
    { id: 'currency', label: 'Currency', type: EnhancedTableColumnType.TEXT },
    { id: 'effectiveFrom', label: 'Effective From', type: EnhancedTableColumnType.DATE },
    { id: 'effectiveTo', label: 'Effective To', type: EnhancedTableColumnType.DATE },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: PRICING_CONFIG_STATUS_CHIPS,
      chipLabels: PRICING_CONFIG_STATUS_LABELS,
    },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      // Pricing writes are Admin/Manager only (matches backend [Authorize]).
      actions: writable
        ? [
            {
              icon: <Pencil className="size-4" />,
              label: 'Edit',
              onClick: (_id, row) => {
                setEditing(row as unknown as PricingConfig);
                setDialogOpen(true);
              },
            },
            {
              icon: <CheckCircle2 className="size-4" />,
              label: 'Activate',
              onClick: (id) => activate(id),
              hidden: (row) => row.status === 'Active',
            },
            {
              icon: <Archive className="size-4" />,
              label: 'Retire',
              onClick: (id) => retire(id),
              hidden: (row) => row.status === 'Retired',
            },
          ]
        : [],
    },
  ];

  if (error)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Failed to load pricing configs.</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <>
      <MainPageTitle
        title="Pricing Configs"
        action={
          writable
            ? {
                title: 'Create Config',
                onClick: () => {
                  setEditing(null);
                  setDialogOpen(true);
                },
              }
            : undefined
        }
      />
      <div className="px-4 sm:px-6 pb-6">
        {initializing ? (
          <TableSkeleton rows={6} columns={5} />
        ) : (
          <EnhancedTable
            title="Pricing Configs"
            header={headers}
            data={tableData as never}
            defaultOrder="effectiveFrom"
          />
        )}
      </div>

      <GenericDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        title={editing ? 'Edit Pricing Config' : 'Create Pricing Config'}
      >
        <DynamicFormWidget
          fields={buildFields(currencyItems, editing ?? undefined)}
          onSubmit={save}
          drawerMode
        />
      </GenericDialog>
    </>
  );
}
