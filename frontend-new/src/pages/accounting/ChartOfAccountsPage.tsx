import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainPageTitle, MainPageSection } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { LoadFailed, TableSkeleton, EmptyState } from '@/components/feedback';
import { getJson, postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canManageChartOfAccounts, canClosePeriod } from '@/helpers/rbac';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';

interface Account {
  id: number;
  code: string;
  nameEn: string;
  nameFr: string;
  nameAr: string;
  type: string;
  isPostable: boolean;
  isActive: boolean;
}

interface Settings {
  configured: boolean;
  receivable?: string | null;
  revenue?: string | null;
  tax?: string | null;
  bank?: string | null;
  rounding?: string | null;
}

interface Period {
  id: number;
  year: number;
  month: number;
  state: string;
  closedAt?: string | null;
}

const ACCOUNT_TYPES = {
  Receivable: 'Receivable',
  Payable: 'Payable',
  Revenue: 'Revenue',
  Expense: 'Expense',
  Asset: 'Asset',
  Liability: 'Liability',
  Equity: 'Equity',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Which posting uses which account. Trap 1: revenue once landed in a
// merchandise account and nothing complained for weeks, so the mapping is
// shown in full, by name, on the screen Finance actually opens.
const MAPPING: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'receivable', label: 'Customer receivable', hint: 'Debited when an invoice is posted' },
  { key: 'revenue', label: 'Freight revenue', hint: 'Credited when an invoice is posted' },
  { key: 'tax', label: 'Tax collected', hint: 'Credited when a taxed line is posted' },
  { key: 'bank', label: 'Bank / cash', hint: 'Debited when a payment is recorded' },
  { key: 'rounding', label: 'Rounding difference', hint: 'The only account allowed to absorb a difference' },
];

/**
 * ACC-02 and ACC-13: the chart, the account each posting uses, and which months
 * are still open. All three are data Finance maintains, not constants shipped
 * in the code.
 */
export default function ChartOfAccountsPage() {
  usePageTitle('Chart of Accounts');
  const dispatch = useAppDispatch();
  const role = useUserRole();
  const writable = canManageChartOfAccounts(role);
  const mayClose = canClosePeriod(role);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const accounts = useLoader<Account[]>(() => getJson<Account[]>('/api/accounting/accounts'));
  const settings = useLoader<Settings>(() => getJson<Settings>('/api/accounting/settings'));
  const periods = useLoader<Period[]>(() => getJson<Period[]>('/api/accounting/periods'));
  const { initializing, error } = useInitializeFunction([accounts.reload, settings.reload, periods.reload]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (row: Account) => {
    setEditing(row);
    setDialogOpen(true);
  };

  const saveAccount = async (values: Record<string, unknown>): Promise<boolean> => {
    const payload = {
      code: String(values.code ?? '').trim(),
      nameEn: values.nameEn,
      nameFr: values.nameFr ?? '',
      nameAr: values.nameAr ?? '',
      type: values.type,
      parentCode: values.parentCode || null,
      isPostable: values.isPostable ?? true,
      isActive: values.isActive ?? true,
    };
    try {
      if (editing) await putJson(`/api/accounting/accounts/${editing.id}`, payload);
      else await postJson('/api/accounting/accounts', payload);
      toast.success('Account saved');
      setDialogOpen(false);
      setEditing(null);
      await accounts.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const saveSettings = async (values: Record<string, unknown>): Promise<boolean> => {
    const num = (v: unknown) => (v === '' || v == null ? null : Number(v));
    try {
      await putJson('/api/accounting/settings', {
        receivableAccountId: num(values.receivableAccountId),
        revenueAccountId: num(values.revenueAccountId),
        taxAccountId: num(values.taxAccountId),
        bankAccountId: num(values.bankAccountId),
        roundingAccountId: num(values.roundingAccountId),
      });
      toast.success('Account mapping updated');
      setSettingsOpen(false);
      await settings.reload();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const togglePeriod = (p: Period) => {
    const closing = p.state === 'Open';
    dispatch(
      OpenConfirmation({
        title: `${closing ? 'Close' : 'Reopen'} ${MONTHS[p.month - 1]} ${p.year}`,
        message: closing
          ? 'Closing refuses any further entry dated into this month. Reports for it stop moving.'
          : 'Reopening allows entries to be dated back into a month that has already been reported.',
        destructive: !closing,
        confirmText: closing ? 'Close month' : 'Reopen month',
        onSubmit: async () => {
          try {
            await postJson(`/api/accounting/periods/${p.year}/${p.month}/${closing ? 'close' : 'reopen'}`);
            toast.success(closing ? 'Period closed' : 'Period reopened');
            await periods.reload();
          } catch (e) {
            toast.error(parseApiError(e).message);
          }
        },
      }),
    );
  };

  const accountRows = useMemo(
    () =>
      (accounts.data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, a) => {
        acc[String(a.id)] = { ...a, name: a.nameFr ? `${a.nameEn} · ${a.nameFr}` : a.nameEn };
        return acc;
      }, {}),
    [accounts.data],
  );

  const accountHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'code', label: 'Code', type: EnhancedTableColumnType.TEXT },
    { id: 'name', label: 'Name', type: EnhancedTableColumnType.TEXT },
    { id: 'type', label: 'Type', type: EnhancedTableColumnType.TEXT },
    {
      id: 'isPostable',
      label: 'Postable',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#333', backgroundColor: '#e0e0e0' },
      },
      chipLabels: { true: 'Yes', false: 'Heading' },
    },
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
              onClick: (_id: string, row: Record<string, unknown>) => openEdit(row as unknown as Account),
            },
          ]
        : [],
    },
  ];

  const periodRows = useMemo(
    () =>
      (periods.data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, p) => {
        acc[String(p.id)] = { ...p, period: `${MONTHS[p.month - 1]} ${p.year}` };
        return acc;
      }, {}),
    [periods.data],
  );

  const periodHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'period', label: 'Period', type: EnhancedTableColumnType.TEXT },
    {
      id: 'state',
      label: 'State',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: {
        Open: { color: '#fff', backgroundColor: '#2e7d32' },
        Closed: { color: '#fff', backgroundColor: '#616161' },
      },
      chipLabels: { Open: 'Open', Closed: 'Closed' },
    },
    { id: 'closedAt', label: 'Closed', type: EnhancedTableColumnType.DATETIME },
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      actions: mayClose
        ? [
            {
              icon: <Lock className="size-4" />,
              label: 'Open / Close',
              onClick: (_id: string, row: Record<string, unknown>) => togglePeriod(row as unknown as Period),
            },
          ]
        : [],
    },
  ];

  const postable = (accounts.data ?? [])
    .filter((a) => a.isPostable && a.isActive)
    .reduce<Record<string, string>>((acc, a) => {
      acc[String(a.id)] = `${a.code} ${a.nameEn}`;
      return acc;
    }, {});

  const accountFields: FieldMap = {
    code: {
      type: DynamicField.TEXT,
      name: 'code',
      title: 'Account code (matched in full — 4111 and 41110 are different accounts)',
      required: true,
      value: editing?.code ?? '',
      grid: { sm: 6 },
    },
    type: {
      type: DynamicField.SELECT,
      name: 'type',
      title: 'Type',
      required: true,
      items: ACCOUNT_TYPES,
      value: editing?.type ?? 'Revenue',
      grid: { sm: 6 },
    },
    nameEn: {
      type: DynamicField.TEXT,
      name: 'nameEn',
      title: 'Name (English)',
      required: true,
      value: editing?.nameEn ?? '',
      grid: { sm: 12 },
    },
    nameFr: {
      type: DynamicField.TEXT,
      name: 'nameFr',
      title: 'Name (French — as published in the chart)',
      value: editing?.nameFr ?? '',
      grid: { sm: 6 },
    },
    nameAr: {
      type: DynamicField.TEXT,
      name: 'nameAr',
      title: 'Name (Arabic)',
      value: editing?.nameAr ?? '',
      grid: { sm: 6 },
    },
    isPostable: {
      type: DynamicField.CHECKBOX,
      name: 'isPostable',
      title: 'Can be posted to (uncheck for a heading)',
      value: editing?.isPostable ?? true,
    },
    isActive: {
      type: DynamicField.CHECKBOX,
      name: 'isActive',
      title: 'Active',
      value: editing?.isActive ?? true,
    },
  };

  const settingsFields: FieldMap = Object.fromEntries(
    MAPPING.map((m) => {
      const field = `${m.key}AccountId`;
      const current = (accounts.data ?? []).find((a) => `${a.code} ${a.nameEn}` === settings.data?.[m.key]);
      return [
        field,
        {
          type: DynamicField.SELECT,
          name: field,
          title: `${m.label} — ${m.hint}`,
          items: postable,
          value: current ? String(current.id) : '',
          grid: { sm: 12 },
        },
      ];
    }),
  ) as FieldMap;

  const unmapped = MAPPING.filter((m) => !settings.data?.[m.key]);

  return (
    <>
      <MainPageTitle
        title="Chart of Accounts"
        subtitle="The accounts, what each posting uses, and which months are still open"
        action={writable ? { title: 'Add Account', onClick: openCreate } : undefined}
      />
      <div className="px-4 sm:px-6 pb-6">
        {initializing ? (
          <TableSkeleton rows={8} columns={6} />
        ) : error ? (
          <LoadFailed what="the chart of accounts" onRetry={accounts.reload} />
        ) : (
          <>
            <MainPageSection
              title="Account Mapping"
              actions={
                writable ? (
                  <Button size="sm" variant="secondary" onClick={() => setSettingsOpen(true)}>
                    Change mapping
                  </Button>
                ) : null
              }
            >
              {unmapped.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Not mapped yet: {unmapped.map((m) => m.label).join(', ')}. Postings that need these accounts
                    will be refused rather than guessed.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MAPPING.map((m) => (
                  <div key={m.key} className="rounded-md border p-3">
                    <div className="text-sm font-semibold">{m.label}</div>
                    <div className="text-xs text-muted-foreground mb-1">{m.hint}</div>
                    {settings.data?.[m.key] ? (
                      <Badge variant="outline" className="font-mono">
                        {String(settings.data[m.key])}
                      </Badge>
                    ) : (
                      <span className="text-sm text-destructive">Not set</span>
                    )}
                  </div>
                ))}
              </div>
            </MainPageSection>

            <MainPageSection title="Accounts">
              {Object.keys(accountRows).length === 0 ? (
                <EmptyState message="No accounts yet." />
              ) : (
                <EnhancedTable
                  title="Accounts"
                  header={accountHeaders}
                  data={accountRows as never}
                  defaultOrder="code"
                  defaultDirection="asc"
                />
              )}
            </MainPageSection>

            <MainPageSection title="Accounting Periods">
              {Object.keys(periodRows).length === 0 ? (
                <EmptyState message="No periods yet — one is opened the first time something is posted." />
              ) : (
                <EnhancedTable
                  title="Accounting Periods"
                  header={periodHeaders}
                  data={periodRows as never}
                  defaultOrder="period"
                  defaultDirection="desc"
                />
              )}
            </MainPageSection>
          </>
        )}
      </div>

      <GenericDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        title={editing ? `Edit ${editing.code}` : 'Add Account'}
      >
        <DynamicFormWidget fields={accountFields} onSubmit={saveAccount} drawerMode />
      </GenericDialog>

      <GenericDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Account mapping" size="lg">
        <DynamicFormWidget fields={settingsFields} onSubmit={saveSettings} drawerMode submitLabel="Save mapping" />
      </GenericDialog>
    </>
  );
}
