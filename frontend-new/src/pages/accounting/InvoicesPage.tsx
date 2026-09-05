import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainPageTitle } from '@/components/layout';
import { EnhancedTable, EnhancedTableColumnType, type EnhanceTableHeaderTypes } from '@/components/enhanced-table';
import { LoadFailed, TableSkeleton, EmptyState } from '@/components/feedback';
import { GenericSelect } from '@/components/inputs';
import { getJson } from '@/api/client';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { INVOICE_STATE_LABELS } from '@/constants/statusLabels';
import { INVOICE_STATE_CHIPS } from '@/constants/statusColors';

interface InvoiceRow {
  id: number;
  number: string;
  shipmentId: number;
  shipmentRef: string;
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

const STATES = { Draft: 'Draft', Posted: 'Posted', Cancelled: 'Cancelled' };

/**
 * Every invoice the company has raised. Drafts sit here until Finance posts
 * them (ACC-04), so this list doubles as the review queue.
 */
export default function InvoicesPage() {
  usePageTitle('Invoices');
  const navigate = useNavigate();
  const [state, setState] = useState('');

  const invoices = useLoader<InvoiceRow[]>(() =>
    getJson<InvoiceRow[]>(`/api/invoices${state ? `?state=${state}` : ''}`),
  );
  const { initializing, error } = useInitializeFunction([invoices.reload], [state]);

  const rows = useMemo(
    () =>
      (invoices.data ?? []).reduce<Record<string, Record<string, unknown>>>((acc, i) => {
        acc[String(i.id)] = {
          ...i,
          customer: `${i.customerName} (#${i.customerId})`,
          // A credit note is a negative document; showing it with the same sign
          // as an invoice is how a reversal quietly reads as more revenue.
          signedTotal: i.type === 'CreditNote' ? -i.grandTotal : i.grandTotal,
        };
        return acc;
      }, {}),
    [invoices.data],
  );

  const currency = invoices.data?.[0]?.currency ?? 'XAF';

  const headers: EnhanceTableHeaderTypes[] = [
    {
      id: 'number',
      label: 'Invoice',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_id, row) => navigate(`/finance/invoices/${row.id}`),
    },
    {
      id: 'shipmentRef',
      label: 'Container',
      type: EnhancedTableColumnType.Clickable,
      onClick: (_id, row) => navigate(`/ops/shipments/${row.shipmentId}`),
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
    { id: 'type', label: 'Type', type: EnhancedTableColumnType.TEXT },
    { id: 'lineCount', label: 'Lines', type: EnhancedTableColumnType.NUMBER, numeric: true },
    { id: 'signedTotal', label: 'Total', type: EnhancedTableColumnType.CURRENCY, currency, numeric: true },
    { id: 'invoiceDate', label: 'Date', type: EnhancedTableColumnType.DATE },
  ];

  return (
    <>
      <MainPageTitle title="Invoices" subtitle="Customer billing across every container" />
      <div className="px-4 sm:px-6 pb-6 flex flex-col gap-4">
        <div className="sm:w-56">
          <GenericSelect
            name="state"
            title="Status"
            value={state}
            items={STATES}
            allowEmpty
            emptyLabel="All states"
            placeholder="All states"
            onChange={setState}
          />
        </div>
        {initializing ? (
          <TableSkeleton rows={6} columns={8} />
        ) : error ? (
          <LoadFailed what="invoices" onRetry={invoices.reload} />
        ) : Object.keys(rows).length === 0 ? (
          <EmptyState message="No invoices yet. Generate them from a container's page." />
        ) : (
          <EnhancedTable
            title="Invoices"
            header={headers}
            data={rows as never}
            defaultOrder="number"
            defaultDirection="desc"
          />
        )}
      </div>
    </>
  );
}
