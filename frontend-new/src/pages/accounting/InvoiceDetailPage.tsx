import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MainPageSection, DetailPageLayout, type MainPageAction } from '@/components/layout';
import { Breadcrumbs } from '@/components/misc';
import {
  InformationWidget,
  InformationWidgetFieldTypes,
  type IInformationWidgetField,
} from '@/components/information-widget';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { GenericDialog } from '@/components/dialogs';
import { Loader, EmptyState } from '@/components/feedback';
import { Money } from '@/components/accounting';
import { getJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canPostInvoice } from '@/helpers/rbac';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';
import { INVOICE_STATE_LABELS, PAYMENT_STATUS_LABELS } from '@/constants/statusLabels';
import { INVOICE_STATE_CHIPS, PAYMENT_STATUS_CHIPS } from '@/constants/statusColors';

interface InvoiceSummary {
  id: number;
  number: string;
  shipmentId: number;
  customerId: number;
  customerName: string;
  state: string;
  type: string;
  currency: string;
  invoiceDate: string;
  untaxedTotal: number;
  taxTotal: number;
  grandTotal: number;
  lineCount: number;
}

interface InvoiceLine {
  id: number;
  packageId?: number | null;
  label: string;
  amount: { amount: number; currency: string };
  tax: { amount: number; currency: string };
}

interface Balance {
  invoiceId: number;
  number: string;
  total: number;
  paid: number;
  outstanding: number;
  status: string;
}

interface AllocationRow {
  id: number;
  amount: number;
  number: string;
  paymentDate: string;
  method: string;
  reference?: string | null;
}

interface InvoiceDetail {
  invoice: InvoiceSummary;
  shipmentRef: string;
  customerPhone: string;
  lines: InvoiceLine[];
  journalEntryId?: number | null;
  reversesInvoiceId?: number | null;
  cancelReason?: string | null;
  postedAt?: string | null;
  balance: Balance;
  payments: AllocationRow[];
}

interface EntryLine {
  id: number;
  account: string;
  debit: number;
  credit: number;
  currencyCode: string;
  label: string;
}

interface JournalEntry {
  id: number;
  number: string;
  reference: string;
  accountingDate: string;
  journal: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lines: EntryLine[];
}

/**
 * One invoice, end to end: what it bills, what it did to the accounts, and what
 * is still owed. Posting and crediting happen here because this is the only
 * screen that shows the whole picture at once.
 */
export default function InvoiceDetailPage() {
  const { id = '0' } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const role = useUserRole();
  const writable = canPostInvoice(role);
  const [creditOpen, setCreditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const invoice = useLoader<InvoiceDetail>(() => getJson<InvoiceDetail>(`/api/invoices/${id}`));
  const creditNotes = useLoader<InvoiceSummary[]>(() =>
    getJson<InvoiceSummary[]>(`/api/invoices/${id}/credit-notes`),
  );
  const { initialized, error } = useInitializeFunction([invoice.reload, creditNotes.reload], [id]);

  // The entry is fetched only once the invoice names one — an unposted invoice
  // has no ledger footprint at all (ACC-04).
  const entryId = invoice.data?.journalEntryId ?? null;
  const entry = useLoader<JournalEntry | null>(() =>
    entryId ? getJson<JournalEntry>(`/api/accounting/entries/${entryId}`) : Promise.resolve(null),
  );
  const reloadEntry = entry.reload;
  useEffect(() => {
    if (entryId) void reloadEntry().catch(() => undefined);
  }, [entryId, reloadEntry]);

  usePageTitle(invoice.data?.invoice.number ?? `Invoice #${id}`);

  const run = async (fn: () => Promise<unknown>, success: string): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      await Promise.all([invoice.reload(), creditNotes.reload()]);
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!initialized) return <Loader fullScreen />;
  if (error || !invoice.data)
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Invoice not found.</AlertDescription>
        </Alert>
      </div>
    );

  const d = invoice.data;
  const inv = d.invoice;
  const isDraft = inv.state === 'Draft';
  const isPosted = inv.state === 'Posted';
  const isCreditNote = inv.type === 'CreditNote';

  // After a reload the previous entry must not linger on screen, so it counts
  // only while its id still matches the invoice.
  const shownEntry = entry.data && entry.data.id === entryId ? entry.data : null;

  const infoFields: IInformationWidgetField[] = [
    { type: InformationWidgetFieldTypes.Text, name: 'number', title: 'Invoice Number' },
    {
      type: InformationWidgetFieldTypes.Custom,
      name: 'customerName',
      title: 'Customer',
      render: () => (
        <button
          type="button"
          className="text-primary underline underline-offset-2"
          onClick={() => navigate(`/master/customers/${inv.customerId}`)}
        >
          {inv.customerName} (#{inv.customerId})
        </button>
      ),
    },
    {
      type: InformationWidgetFieldTypes.Custom,
      name: 'shipmentRef',
      title: 'Container',
      render: () => (
        <button
          type="button"
          className="text-primary underline underline-offset-2"
          onClick={() => navigate(`/ops/shipments/${inv.shipmentId}`)}
        >
          {d.shipmentRef}
        </button>
      ),
    },
    { type: InformationWidgetFieldTypes.Date, name: 'invoiceDate', title: 'Invoice Date' },
    {
      type: InformationWidgetFieldTypes.Custom,
      name: 'untaxedTotal',
      title: 'Untaxed',
      render: () => <Money amount={inv.untaxedTotal} currency={inv.currency} />,
    },
    {
      type: InformationWidgetFieldTypes.Custom,
      name: 'taxTotal',
      title: 'Tax',
      render: () => <Money amount={inv.taxTotal} currency={inv.currency} muted={inv.taxTotal === 0} />,
    },
    {
      type: InformationWidgetFieldTypes.Custom,
      name: 'grandTotal',
      title: 'Total',
      render: () => (
        <span className="font-semibold">
          <Money amount={inv.grandTotal} currency={inv.currency} />
        </span>
      ),
    },
  ];
  if (isPosted && !isCreditNote) {
    infoFields.push({
      type: InformationWidgetFieldTypes.Custom,
      name: 'outstanding',
      title: 'Outstanding',
      render: () => <Money amount={d.balance.outstanding} currency={inv.currency} />,
    });
  }

  const lineRows = d.lines.reduce<Record<string, Record<string, unknown>>>((acc, l) => {
    acc[String(l.id)] = {
      ...l,
      amountValue: l.amount.amount,
      taxValue: l.tax.amount,
      packageRef: l.packageId ? `#${l.packageId}` : '--',
    };
    return acc;
  }, {});

  const lineHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'label', label: 'Description', type: EnhancedTableColumnType.TEXT },
    {
      id: 'packageRef',
      label: 'Package',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_tid, row) => {
        if (row.packageId) navigate(`/ops/packages/${row.packageId}`);
      },
    },
    { id: 'taxValue', label: 'Tax', type: EnhancedTableColumnType.CURRENCY, currency: inv.currency, numeric: true },
    { id: 'amountValue', label: 'Amount', type: EnhancedTableColumnType.CURRENCY, currency: inv.currency, numeric: true },
  ];

  const paymentRows = d.payments.reduce<Record<string, Record<string, unknown>>>((acc, p) => {
    acc[String(p.id)] = { ...p, reference: p.reference ?? '--' };
    return acc;
  }, {});

  const paymentHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'number', label: 'Payment', type: EnhancedTableColumnType.TEXT },
    { id: 'paymentDate', label: 'Date', type: EnhancedTableColumnType.DATE },
    { id: 'method', label: 'Method', type: EnhancedTableColumnType.TEXT },
    { id: 'reference', label: 'Reference', type: EnhancedTableColumnType.TEXT },
    { id: 'amount', label: 'Allocated', type: EnhancedTableColumnType.CURRENCY, currency: inv.currency, numeric: true },
  ];

  const entryRows = (shownEntry?.lines ?? []).reduce<Record<string, Record<string, unknown>>>((acc, l) => {
    acc[String(l.id)] = { ...l };
    return acc;
  }, {});

  const entryHeaders: EnhanceTableHeaderTypes[] = [
    // Trap 1: the account code and name sit beside every amount, so a wrong
    // mapping shows itself on screen rather than only inside the ledger.
    { id: 'account', label: 'Account', type: EnhancedTableColumnType.TEXT },
    { id: 'label', label: 'Detail', type: EnhancedTableColumnType.TEXT },
    { id: 'debit', label: 'Debit', type: EnhancedTableColumnType.CURRENCY, currency: inv.currency, numeric: true },
    { id: 'credit', label: 'Credit', type: EnhancedTableColumnType.CURRENCY, currency: inv.currency, numeric: true },
  ];

  const creditRows = (creditNotes.data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, c) => {
    acc[String(c.id)] = { ...c };
    return acc;
  }, {});

  const creditHeaders: EnhanceTableHeaderTypes[] = [
    {
      id: 'number',
      label: 'Credit Note',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_tid, row) => navigate(`/finance/invoices/${row.id}`),
    },
    {
      id: 'state',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: INVOICE_STATE_CHIPS,
      chipLabels: INVOICE_STATE_LABELS,
    },
    { id: 'grandTotal', label: 'Amount', type: EnhancedTableColumnType.CURRENCY, currency: inv.currency, numeric: true },
    { id: 'invoiceDate', label: 'Date', type: EnhancedTableColumnType.DATE },
  ];

  const creditFields: FieldMap = {
    amount: {
      type: DynamicField.NUMBER,
      name: 'amount',
      title: `Amount to credit — leave blank to credit the whole ${inv.grandTotal} ${inv.currency}`,
      value: '',
      min: 0,
      grid: { sm: 12 },
    },
    reason: {
      type: DynamicField.TEXTAREA,
      name: 'reason',
      title: 'Reason (kept on the credit note, ACC-19)',
      required: true,
      value: '',
      grid: { sm: 12 },
    },
  };

  const cancelFields: FieldMap = {
    reason: {
      type: DynamicField.TEXTAREA,
      name: 'reason',
      title: 'Reason for cancelling this draft',
      required: true,
      value: '',
      grid: { sm: 12 },
    },
  };

  const actions: MainPageAction[] = [];
  if (writable && isDraft) {
    actions.push({
      label: busy ? 'Working…' : 'Post to Ledger',
      disabled: busy,
      onClick: () =>
        dispatch(
          OpenConfirmation({
            title: `Post ${inv.number}`,
            message:
              'Posting writes a balanced entry to the accounts and freezes this invoice. ' +
              'After posting it can only be corrected by a credit note — never edited or deleted.',
            confirmText: 'Post',
            onSubmit: async () => {
              await run(() => postJson(`/api/accounting/invoices/${id}/post`), 'Invoice posted');
            },
          }),
        ),
    });
    actions.push({ label: 'Cancel Invoice', variant: 'secondary', destructive: true, onClick: () => setCancelOpen(true) });
  }
  if (writable && isPosted && !isCreditNote) {
    actions.push({ label: 'Issue Credit Note', disabled: busy, onClick: () => setCreditOpen(true) });
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Invoices', href: '/finance/invoices' }, { label: inv.number }]} />
      <DetailPageLayout
        title={inv.number}
        subtitle={`${isCreditNote ? 'Credit note' : 'Invoice'} · ${d.shipmentRef}`}
        actions={actions}
        chips={
          <>
            <Badge style={INVOICE_STATE_CHIPS[inv.state]}>{INVOICE_STATE_LABELS[inv.state] ?? inv.state}</Badge>
            {isPosted && !isCreditNote && (
              <Badge style={PAYMENT_STATUS_CHIPS[d.balance.status]}>
                {PAYMENT_STATUS_LABELS[d.balance.status] ?? d.balance.status}
              </Badge>
            )}
            {isCreditNote && d.reversesInvoiceId != null && (
              <Badge
                variant="outline"
                className="cursor-pointer"
                onClick={() => navigate(`/finance/invoices/${d.reversesInvoiceId}`)}
              >
                Reverses #{d.reversesInvoiceId}
              </Badge>
            )}
          </>
        }
      >
        {isDraft && (
          <Alert>
            <AlertDescription>
              This is a draft. Nothing has reached the accounts yet — review the lines, then post.
            </AlertDescription>
          </Alert>
        )}
        {inv.state === 'Cancelled' && (
          <Alert variant="destructive">
            <AlertDescription>
              Cancelled{d.cancelReason ? `: ${d.cancelReason}` : ''}. The number stays used, so the gap left in the
              sequence is deliberate and explainable.
            </AlertDescription>
          </Alert>
        )}

        <InformationWidget
          title="Invoice"
          fields={infoFields}
          data={{ ...inv, shipmentRef: d.shipmentRef } as unknown as Record<string, unknown>}
        />

        <MainPageSection title="Lines">
          {d.lines.length === 0 ? (
            <EmptyState message="This invoice has no lines." />
          ) : (
            <EnhancedTable title="Lines" header={lineHeaders} data={lineRows as never} defaultOrder="label" />
          )}
        </MainPageSection>

        {isPosted && (
          <MainPageSection title={shownEntry ? `Journal Entry — ${shownEntry.number} (${shownEntry.journal})` : 'Journal Entry'}>
            {entryId == null ? (
              <EmptyState message="This invoice is for zero, so there was nothing to move in the accounts." />
            ) : !shownEntry ? (
              <EmptyState message="Loading the ledger entry…" />
            ) : (
              <>
                <EnhancedTable
                  title="Journal Entry"
                  header={entryHeaders}
                  data={entryRows as never}
                  defaultOrder="account"
                />
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <span>
                    Debit <Money amount={shownEntry.totalDebit} currency={inv.currency} />
                  </span>
                  <span>
                    Credit <Money amount={shownEntry.totalCredit} currency={inv.currency} />
                  </span>
                  <Badge variant={shownEntry.isBalanced ? 'default' : 'destructive'}>
                    {shownEntry.isBalanced ? 'Balanced' : 'OUT OF BALANCE'}
                  </Badge>
                </div>
              </>
            )}
          </MainPageSection>
        )}

        {isPosted && !isCreditNote && (
          <MainPageSection title="Payments">
            {d.payments.length === 0 ? (
              <EmptyState message="No payments allocated to this invoice yet." />
            ) : (
              <EnhancedTable
                title="Payments"
                header={paymentHeaders}
                data={paymentRows as never}
                defaultOrder="paymentDate"
              />
            )}
          </MainPageSection>
        )}

        {(creditNotes.data ?? []).length > 0 && (
          <MainPageSection title="Credit Notes">
            <EnhancedTable
              title="Credit Notes"
              header={creditHeaders}
              data={creditRows as never}
              defaultOrder="number"
            />
          </MainPageSection>
        )}
      </DetailPageLayout>

      <GenericDialog open={creditOpen} onClose={() => setCreditOpen(false)} title={`Credit note against ${inv.number}`}>
        <DynamicFormWidget
          fields={creditFields}
          drawerMode
          submitLabel="Issue Credit Note"
          onSubmit={async (values) => {
            const raw = values.amount;
            const amount = raw === '' || raw == null ? null : Number(raw);
            // A credit larger than the invoice would turn a correction into
            // negative revenue, so it is refused before it reaches the server.
            if (amount != null && (!Number.isFinite(amount) || amount <= 0 || amount > inv.grandTotal)) {
              toast.error(`Credit must be between 0 and the invoice total of ${inv.grandTotal} ${inv.currency}.`);
              return false;
            }
            const ok = await run(
              () => postJson(`/api/accounting/invoices/${id}/credit-note`, { amount, reason: values.reason }),
              'Credit note created as a draft — post it to reduce the receivable',
            );
            if (ok) setCreditOpen(false);
            return ok;
          }}
        />
      </GenericDialog>

      <GenericDialog open={cancelOpen} onClose={() => setCancelOpen(false)} title={`Cancel ${inv.number}`}>
        <DynamicFormWidget
          fields={cancelFields}
          drawerMode
          submitLabel="Cancel Invoice"
          onSubmit={async (values) => {
            const ok = await run(
              () => postJson(`/api/accounting/invoices/${id}/cancel`, { reason: values.reason }),
              'Invoice cancelled — its packages are free to be invoiced again',
            );
            if (ok) setCancelOpen(false);
            return ok;
          }}
        />
      </GenericDialog>
    </>
  );
}
