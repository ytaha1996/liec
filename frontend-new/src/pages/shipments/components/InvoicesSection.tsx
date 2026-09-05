import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MainPageSection } from '@/components/layout';
import { EnhancedTable } from '@/components/enhanced-table';
import { EnhancedTableColumnType, type IEnhancedTableHeader } from '@/components/enhanced-table/types';
import { Money } from '@/components/accounting';
import { EmptyState } from '@/components/feedback';
import { getJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { useAppDispatch } from '@/redux/hooks';
import { OpenConfirmation } from '@/redux/confirmation/confirmationReducer';
import { INVOICE_STATE_LABELS } from '@/constants/statusLabels';
import { INVOICE_STATE_CHIPS } from '@/constants/statusColors';

interface InvoiceSummary {
  id: number;
  number: string;
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

interface GenerationResult {
  created: number;
  packagesBilled: number;
  packagesSkipped: number;
}

/**
 * Customer invoices for one container. Generation produces drafts only — Finance
 * reviews them before anything reaches the ledger — and is safe to run twice,
 * because packages already carrying an invoice line are skipped.
 */
export function InvoicesSection({ shipmentId, canInvoice }: { shipmentId: string; canInvoice: boolean }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);

  const invoices = useLoader<InvoiceSummary[]>(() =>
    getJson<InvoiceSummary[]>(`/api/shipments/${shipmentId}/invoices`),
  );
  useInitializeFunction([invoices.reload], [shipmentId]);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await postJson<GenerationResult>(`/api/shipments/${shipmentId}/invoices/generate`);
      if (r.created === 0) {
        toast.info(
          r.packagesSkipped > 0
            ? 'Every package on this container is already invoiced.'
            : 'Nothing to invoice on this container yet.',
        );
      } else {
        toast.success(
          `${r.created} draft invoice(s) created for ${r.packagesBilled} package(s)` +
            (r.packagesSkipped > 0 ? ` — ${r.packagesSkipped} already invoiced` : ''),
        );
      }
      await invoices.reload();
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setGenerating(false);
    }
  };

  const rows = (invoices.data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, i) => {
    acc[String(i.id)] = { ...i, customer: `${i.customerName} (#${i.customerId})` };
    return acc;
  }, {});

  const currency = invoices.data?.[0]?.currency ?? 'XAF';
  const live = (invoices.data ?? []).filter((i) => i.state !== 'Cancelled');
  // A credit note reverses, so it subtracts — counting it as billed is how a
  // reversal quietly reads as more revenue.
  const invoicedTotal = live.reduce((s, i) => s + (i.type === 'CreditNote' ? -i.grandTotal : i.grandTotal), 0);
  const draftCount = live.filter((i) => i.state === 'Draft').length;
  const postedCount = live.filter((i) => i.state === 'Posted').length;

  const headers: IEnhancedTableHeader[] = [
    {
      id: 'number',
      label: 'Invoice',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_id, row) => navigate(`/finance/invoices/${row.id}`),
    },
    {
      id: 'customer',
      label: 'Customer',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_id, row) => navigate(`/master/customers/${row.customerId}`),
    },
    {
      id: 'state',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      chipColors: INVOICE_STATE_CHIPS,
      chipLabels: INVOICE_STATE_LABELS,
    },
    { id: 'lineCount', label: 'Lines', type: EnhancedTableColumnType.NUMBER, numeric: true },
    { id: 'untaxedTotal', label: 'Untaxed', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'taxTotal', label: 'Tax', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'grandTotal', label: 'Total', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'invoiceDate', label: 'Date', type: EnhancedTableColumnType.DATE },
  ];

  return (
    <MainPageSection
      title="Customer Invoices"
      actions={
        canInvoice ? (
          <Button
            size="sm"
            disabled={generating}
            onClick={() =>
              dispatch(
                OpenConfirmation({
                  title: 'Generate invoices',
                  message:
                    'Create one draft invoice per customer for every package not yet invoiced on this container. ' +
                    'Nothing is posted to the accounts — drafts can be reviewed and corrected first. ' +
                    'Running this again later only picks up packages added since.',
                  onSubmit: generate,
                }),
              )
            }
          >
            {generating ? 'Generating…' : 'Generate Invoices'}
          </Button>
        ) : null
      }
    >
      {(invoices.data ?? []).length === 0 ? (
        <EmptyState message="No invoices for this container yet." />
      ) : (
        <>
          <EnhancedTable title="Customer Invoices" header={headers} data={rows as never} defaultOrder="number" />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span>
              Invoiced <Money amount={invoicedTotal} currency={currency} />
            </span>
            <span className="text-muted-foreground">
              {draftCount} draft, {postedCount} posted
            </span>
          </div>
        </>
      )}
    </MainPageSection>
  );
}
