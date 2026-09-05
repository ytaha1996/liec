import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MainPageTitle, MainPageSection } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { GenericDialog } from '@/components/dialogs';
import { GenericSelect, GenericInput, GenericNumberInput, GenericDatePicker } from '@/components/inputs';
import { LoadFailed, TableSkeleton, EmptyState } from '@/components/feedback';
import { Money } from '@/components/accounting';
import { getJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUserRole, canRecordPayment } from '@/helpers/rbac';
import { allocationTotal, validateAllocation } from './allocation';

interface CustomerBalance {
  customerId: number;
  customerName: string;
  currency: string;
  invoiced: number;
  credited: number;
  paid: number;
  outstanding: number;
}

interface OpenInvoice {
  invoiceId: number;
  number: string;
  total: number;
  paid: number;
  outstanding: number;
  status: string;
}

interface PaymentRow {
  id: number;
  number: string;
  customerId: number;
  customerName: string;
  amount: number;
  currency: string;
  method: string;
  reference?: string | null;
  paymentDate: string;
  allocated: number;
}

const METHODS = { Cash: 'Cash', BankTransfer: 'Bank transfer', Cheque: 'Cheque', Other: 'Other' };

/**
 * ACC-17/18: what each customer owes, and the one place a payment is recorded.
 * A payment is allocated across invoices rather than flagged onto one, because
 * a customer settling two containers with a single transfer is the normal case.
 */
export default function ReceivablesPage() {
  usePageTitle('Receivables');
  const navigate = useNavigate();
  const role = useUserRole();
  const writable = canRecordPayment(role);

  const [payOpen, setPayOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerBalance | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [method, setMethod] = useState('BankTransfer');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [allocations, setAllocations] = useState<Record<number, number | ''>>({});
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const balances = useLoader<CustomerBalance[]>(() =>
    getJson<CustomerBalance[]>('/api/accounting/customers/balances'),
  );
  const payments = useLoader<PaymentRow[]>(() => getJson<PaymentRow[]>('/api/accounting/payments'));

  const { initializing, error } = useInitializeFunction([balances.reload, payments.reload]);

  // Fetched directly rather than through a loader: a loader's fetcher closes
  // over the customer from the last render, so opening the dialog would ask for
  // the previous customer's invoices — or, on the first open, for nobody's.
  const startPayment = async (row: CustomerBalance) => {
    setCustomer(row);
    setAmount('');
    setReference('');
    setMethod('BankTransfer');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setAllocations({});
    setOpenInvoices([]);
    setLoadedFor(null);
    setPayOpen(true);
    try {
      const open = await getJson<OpenInvoice[]>(
        `/api/accounting/customers/${row.customerId}/open-invoices`,
      );
      setOpenInvoices(open);
      setLoadedFor(row.customerId);
    } catch (e) {
      toast.error(parseApiError(e).message);
    }
  };

  const numericAmount = amount === '' ? 0 : Number(amount);
  const allocated = allocationTotal(allocations);
  // Until this customer's open invoices land, an empty list is
  // indistinguishable from "nothing outstanding" — recording now would put the
  // whole payment on account without anyone noticing.
  const loadingInvoices = customer == null || loadedFor !== customer.customerId;
  const invoices = loadingInvoices ? [] : openInvoices;
  const problem = loadingInvoices
    ? 'Loading this customer’s open invoices…'
    : validateAllocation(numericAmount, allocations, invoices);

  /** Fill each invoice oldest-first until the payment runs out. */
  const autoAllocate = () => {
    let remaining = numericAmount;
    const next: Record<number, number | ''> = {};
    for (const i of invoices) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, i.outstanding);
      next[i.invoiceId] = take;
      remaining -= take;
    }
    setAllocations(next);
  };

  const record = async () => {
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      await postJson('/api/accounting/payments', {
        customerId: customer!.customerId,
        amount: numericAmount,
        currencyCode: customer!.currency,
        method,
        reference: reference || null,
        paymentDate,
        allocations: Object.entries(allocations)
          .filter(([, v]) => v !== '' && Number(v) > 0)
          .map(([k, v]) => ({ invoiceId: Number(k), amount: Number(v) })),
      });
      toast.success('Payment recorded');
      setPayOpen(false);
      await Promise.all([balances.reload(), payments.reload()]);
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const balanceRows = useMemo(
    () =>
      (balances.data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, b) => {
        acc[String(b.customerId)] = { ...b, customer: `${b.customerName} (#${b.customerId})` };
        return acc;
      }, {}),
    [balances.data],
  );

  const currency = balances.data?.[0]?.currency ?? 'XAF';

  const balanceHeaders: EnhanceTableHeaderTypes[] = [
    {
      id: 'customer',
      label: 'Customer',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_id, row) => navigate(`/master/customers/${row.customerId}`),
    },
    { id: 'invoiced', label: 'Invoiced', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'credited', label: 'Credited', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'paid', label: 'Paid', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'outstanding', label: 'Outstanding', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    ...(writable
      ? [
          {
            id: 'actions',
            label: 'Actions',
            type: EnhancedTableColumnType.Action,
            actions: [
              {
                icon: <Banknote className="size-4" />,
                label: 'Record Payment',
                onClick: (_id: string, row: Record<string, unknown>) => {
                  void startPayment(row as unknown as CustomerBalance);
                },
              },
            ],
          } as EnhanceTableHeaderTypes,
        ]
      : []),
  ];

  const paymentRows = useMemo(
    () =>
      (payments.data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, p) => {
        acc[String(p.id)] = {
          ...p,
          customer: `${p.customerName} (#${p.customerId})`,
          reference: p.reference ?? '--',
          unallocated: p.amount - p.allocated,
        };
        return acc;
      }, {}),
    [payments.data],
  );

  const paymentHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'number', label: 'Payment', type: EnhancedTableColumnType.TEXT },
    { id: 'paymentDate', label: 'Date', type: EnhancedTableColumnType.DATE },
    {
      id: 'customer',
      label: 'Customer',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_id, row) => navigate(`/master/customers/${row.customerId}`),
    },
    { id: 'method', label: 'Method', type: EnhancedTableColumnType.TEXT },
    { id: 'reference', label: 'Reference', type: EnhancedTableColumnType.TEXT },
    { id: 'amount', label: 'Amount', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'allocated', label: 'Allocated', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'unallocated', label: 'On account', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
  ];

  const totalOutstanding = (balances.data ?? []).reduce((s, b) => s + b.outstanding, 0);

  return (
    <>
      <MainPageTitle
        title="Receivables"
        subtitle="What each customer was invoiced, has paid, and still owes"
        chips={
          <Badge variant="outline">
            Outstanding <Money amount={totalOutstanding} currency={currency} className="ml-1 font-semibold" />
          </Badge>
        }
      />
      <div className="px-4 sm:px-6 pb-6">
        {initializing ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <LoadFailed what="receivables" onRetry={balances.reload} />
        ) : (
          <>
            <MainPageSection title="Customer Balances">
              {Object.keys(balanceRows).length === 0 ? (
                <EmptyState message="Nothing posted yet — balances appear once invoices are posted to the ledger." />
              ) : (
                <EnhancedTable
                  title="Customer Balances"
                  header={balanceHeaders}
                  data={balanceRows as never}
                  defaultOrder="outstanding"
                  defaultDirection="desc"
                />
              )}
            </MainPageSection>

            <MainPageSection title="Payments">
              {Object.keys(paymentRows).length === 0 ? (
                <EmptyState message="No payments recorded yet." />
              ) : (
                <EnhancedTable
                  title="Payments"
                  header={paymentHeaders}
                  data={paymentRows as never}
                  defaultOrder="paymentDate"
                  defaultDirection="desc"
                />
              )}
            </MainPageSection>
          </>
        )}
      </div>

      <GenericDialog
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={customer ? `Record payment — ${customer.customerName}` : 'Record payment'}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GenericNumberInput
              name="amount"
              title={`Amount received (${customer?.currency ?? 'XAF'})`}
              required
              value={amount}
              min={0}
              onChange={(v) => setAmount(v === '' || v == null ? '' : Number(v))}
            />
            <GenericSelect name="method" title="Method" value={method} items={METHODS} onChange={setMethod} />
            <GenericInput
              name="reference"
              title="Reference (cheque no., transfer id)"
              value={reference}
              onChange={setReference}
            />
            <GenericDatePicker name="paymentDate" title="Payment date" value={paymentDate} onChange={(v) => setPaymentDate(String(v ?? ''))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Allocate to invoices</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={numericAmount <= 0 || loadingInvoices}
                onClick={autoAllocate}
              >
                Auto-allocate oldest first
              </Button>
            </div>

            {loadingInvoices ? (
              <EmptyState message="Loading this customer’s open invoices…" />
            ) : invoices.length === 0 ? (
              <EmptyState message="This customer has no posted invoices outstanding. The payment will sit on account." />
            ) : (
              <div className="rounded-md border divide-y">
                {invoices.map((i) => (
                  <div key={i.invoiceId} className="flex flex-wrap items-center gap-3 p-3">
                    <button
                      type="button"
                      className="text-primary underline underline-offset-2 min-w-40 text-left"
                      onClick={() => navigate(`/finance/invoices/${i.invoiceId}`)}
                    >
                      {i.number}
                    </button>
                    <span className="text-sm text-muted-foreground">
                      outstanding <Money amount={i.outstanding} currency={customer?.currency} />
                    </span>
                    <Input
                      className="w-36 ml-auto"
                      type="number"
                      min={0}
                      max={i.outstanding}
                      aria-label={`Allocate to ${i.number}`}
                      value={allocations[i.invoiceId] ?? ''}
                      onChange={(e) =>
                        setAllocations((prev) => ({
                          ...prev,
                          [i.invoiceId]: e.target.value === '' ? '' : Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <span>
                Allocated <Money amount={allocated} currency={customer?.currency} />
              </span>
              <span>
                On account{' '}
                <Money amount={Math.max(0, numericAmount - allocated)} currency={customer?.currency} muted />
              </span>
              {problem && <span className="text-destructive">{problem}</span>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving || !!problem} onClick={record}>
              {saving ? 'Recording…' : 'Record Payment'}
            </Button>
          </div>
        </div>
      </GenericDialog>
    </>
  );
}
