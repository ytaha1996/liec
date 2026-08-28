import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MainPageTitle, MainPageSection } from '@/components/layout';
import { EnhancedTable } from '@/components/enhanced-table';
import { EnhancedTableColumnType, type IEnhancedTableHeader } from '@/components/enhanced-table/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { GenericSelect, GenericDatePicker, GenericNumberInput } from '@/components/inputs';
import { EmptyState } from '@/components/feedback';
import { getJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SHIPMENT_STATUS_LABELS } from '@/constants/statusLabels';

interface ReportDefinition {
  key: string;
  title: string;
  description: string;
  filters: string[];
}

interface ReportColumn {
  key: string;
  label: string;
  type: 'Text' | 'Number' | 'Decimal3' | 'Currency';
}

interface ReportResult {
  key: string;
  title: string;
  currency: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals: Record<string, unknown>;
}

// Totals can carry keys that aren't columns (a customer count on a report
// grouped by month, say) — those get their label here.
const EXTRA_TOTAL_LABELS: Record<string, string> = {
  customers: 'Customers',
  shipments: 'Shipments',
  packages: 'Packages',
  months: 'Months',
};

const COLUMN_TYPE: Record<ReportColumn['type'], IEnhancedTableHeader['type']> = {
  Text: EnhancedTableColumnType.TEXT,
  Number: EnhancedTableColumnType.NUMBER,
  Decimal3: EnhancedTableColumnType.NUMBER,
  Currency: EnhancedTableColumnType.CURRENCY,
};

export default function ReportsPage() {
  usePageTitle('Reports');

  const [selected, setSelected] = useState('customer-summary');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [shipmentStatus, setShipmentStatus] = useState<string | null>(null);
  const [originWarehouseId, setOriginWarehouseId] = useState<string | null>(null);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<string | null>(null);
  const [limit, setLimit] = useState('15');
  const [exporting, setExporting] = useState(false);

  const catalogue = useLoader<ReportDefinition[]>(() => getJson<ReportDefinition[]>('/api/reports'));
  const customers = useLoader<{ id: number; name: string }[]>(() =>
    getJson<{ id: number; name: string }[]>('/api/customers'),
  );
  const shipments = useLoader<{ id: number; refCode: string }[]>(() =>
    getJson<{ id: number; refCode: string }[]>('/api/shipments'),
  );
  const warehouses = useLoader<{ id: number; name: string; code: string }[]>(() =>
    getJson<{ id: number; name: string; code: string }[]>('/api/warehouses'),
  );

  useInitializeFunction([catalogue.reload, customers.reload, shipments.reload, warehouses.reload]);

  const definition = (catalogue.data ?? []).find((d) => d.key === selected);
  const filters = definition?.filters ?? [];
  const supports = (name: string) => filters.includes(name);

  // Only the filters this report honours reach the API — sending the rest would
  // imply they narrow something when they don't.
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.includes('from') && from) p.set('from', from);
    if (filters.includes('to') && to) p.set('to', to);
    if (filters.includes('customerId') && customerId) p.set('customerId', customerId);
    if (filters.includes('shipmentId') && shipmentId) p.set('shipmentId', shipmentId);
    if (filters.includes('shipmentStatus') && shipmentStatus) p.set('shipmentStatus', shipmentStatus);
    if (filters.includes('originWarehouseId') && originWarehouseId) p.set('originWarehouseId', originWarehouseId);
    if (filters.includes('destinationWarehouseId') && destinationWarehouseId)
      p.set('destinationWarehouseId', destinationWarehouseId);
    if (filters.includes('limit') && limit) p.set('limit', limit);
    return p.toString();
  }, [filters, from, to, customerId, shipmentId, shipmentStatus, originWarehouseId, destinationWarehouseId, limit]);

  const filterBody = useMemo(() => {
    const body: Record<string, unknown> = {};
    if (filters.includes('from') && from) body.from = from;
    if (filters.includes('to') && to) body.to = to;
    if (filters.includes('customerId') && customerId) body.customerId = Number(customerId);
    if (filters.includes('shipmentId') && shipmentId) body.shipmentId = Number(shipmentId);
    if (filters.includes('shipmentStatus') && shipmentStatus) body.shipmentStatus = shipmentStatus;
    if (filters.includes('originWarehouseId') && originWarehouseId) body.originWarehouseId = Number(originWarehouseId);
    if (filters.includes('destinationWarehouseId') && destinationWarehouseId)
      body.destinationWarehouseId = Number(destinationWarehouseId);
    if (filters.includes('limit') && limit) body.limit = Number(limit);
    return body;
  }, [filters, from, to, customerId, shipmentId, shipmentStatus, originWarehouseId, destinationWarehouseId, limit]);

  const report = useLoader<ReportResult>(() => getJson<ReportResult>(`/api/reports/${selected}?${query}`));
  const reloadReport = report.reload;

  // Re-runs whenever the chosen report or its filters change.
  useEffect(() => {
    if (definition) void reloadReport();
  }, [selected, query, definition, reloadReport]);

  const runExport = async () => {
    setExporting(true);
    try {
      const r = await postJson<{ publicUrl: string }>(`/api/exports/reports/${selected}`, filterBody);
      if (r?.publicUrl) window.open(r.publicUrl, '_blank', 'noopener,noreferrer');
      toast.success('Export ready');
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setExporting(false);
    }
  };

  const data = report.data;
  const ccy = data?.currency ?? 'XAF';

  const headers = useMemo(
    () =>
      (data?.columns ?? []).map((c) => ({
        id: c.key,
        label: c.label,
        type: COLUMN_TYPE[c.type],
        numeric: c.type !== 'Text',
        ...(c.type === 'Currency' ? { currency: ccy } : {}),
      })) as IEnhancedTableHeader[],
    [data, ccy],
  );

  const tableData = useMemo(
    () =>
      (data?.rows ?? []).reduce<Record<string, Record<string, unknown>>>((acc, r, i) => {
        acc[String(r.id ?? i)] = r;
        return acc;
      }, {}),
    [data],
  );

  // Stat cards mirror the totals row, formatted the way their column would be.
  const stats = useMemo(() => {
    if (!data) return [];
    const columnByKey = new Map(data.columns.map((c) => [c.key, c]));
    return Object.entries(data.totals).map(([key, value]) => {
      const col = columnByKey.get(key);
      const label = col?.label ?? EXTRA_TOTAL_LABELS[key] ?? key;
      const num = typeof value === 'number' ? value : Number(value ?? 0);
      const text =
        col?.type === 'Currency'
          ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: ccy === 'XAF' ? 0 : 2 }).format(num)} ${ccy}`
          : col?.type === 'Decimal3'
            ? num.toFixed(3)
            : String(value ?? '—');
      return { key, label, text, highlight: key === 'totalBilled' };
    });
  }, [data, ccy]);

  const optionsFrom = <T,>(list: T[] | null | undefined, id: (x: T) => string, label: (x: T) => string) =>
    (list ?? []).reduce<Record<string, string>>((acc, x) => {
      acc[id(x)] = label(x);
      return acc;
    }, {});

  return (
    <>
      <MainPageTitle
        title="Reports"
        action={{
          title: exporting ? 'Exporting…' : 'Export to Excel',
          onClick: runExport,
          disabled: exporting || !data,
        }}
      />

      <div className="px-4 sm:px-6 pb-6 space-y-4">
        <MainPageSection title="Reports">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(catalogue.data ?? []).map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelected(d.key)}
                aria-pressed={d.key === selected}
                className={cn(
                  'text-left rounded-lg border p-4 transition-colors hover:bg-accent',
                  d.key === selected && 'border-primary ring-1 ring-primary bg-accent/40',
                )}
              >
                <p className="font-semibold">{d.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
              </button>
            ))}
          </div>
        </MainPageSection>

        <MainPageSection title="Filters">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supports('from') && (
              <GenericDatePicker
                name="from"
                title="From (planned departure)"
                value={from}
                onChange={(v) => setFrom(v ?? null)}
              />
            )}
            {supports('to') && (
              <GenericDatePicker
                name="to"
                title="To (planned departure)"
                value={to}
                onChange={(v) => setTo(v ?? null)}
              />
            )}
            {supports('customerId') && (
              <GenericSelect
                name="customerId"
                title="Customer"
                value={customerId ?? ''}
                onChange={(v) => setCustomerId(v || null)}
                allowEmpty
                emptyLabel="All customers"
                items={optionsFrom(customers.data, (c) => String(c.id), (c) => c.name)}
              />
            )}
            {supports('shipmentId') && (
              <GenericSelect
                name="shipmentId"
                title="Shipment"
                value={shipmentId ?? ''}
                onChange={(v) => setShipmentId(v || null)}
                allowEmpty
                emptyLabel="All shipments"
                items={optionsFrom(shipments.data, (s) => String(s.id), (s) => s.refCode)}
              />
            )}
            {supports('shipmentStatus') && (
              <GenericSelect
                name="shipmentStatus"
                title="Shipment status"
                value={shipmentStatus ?? ''}
                onChange={(v) => setShipmentStatus(v || null)}
                allowEmpty
                emptyLabel="All statuses"
                items={SHIPMENT_STATUS_LABELS}
              />
            )}
            {supports('originWarehouseId') && (
              <GenericSelect
                name="originWarehouseId"
                title="Origin"
                value={originWarehouseId ?? ''}
                onChange={(v) => setOriginWarehouseId(v || null)}
                allowEmpty
                emptyLabel="All origins"
                items={optionsFrom(warehouses.data, (w) => String(w.id), (w) => `${w.name} (${w.code})`)}
              />
            )}
            {supports('destinationWarehouseId') && (
              <GenericSelect
                name="destinationWarehouseId"
                title="Destination"
                value={destinationWarehouseId ?? ''}
                onChange={(v) => setDestinationWarehouseId(v || null)}
                allowEmpty
                emptyLabel="All destinations"
                items={optionsFrom(warehouses.data, (w) => String(w.id), (w) => `${w.name} (${w.code})`)}
              />
            )}
            {supports('limit') && (
              <GenericNumberInput
                name="limit"
                title="How many"
                value={limit}
                onChange={(v) => setLimit(v == null ? '15' : String(v))}
                min={1}
              />
            )}
          </div>
        </MainPageSection>

        {stats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.map((s) => (
              <Card key={s.key}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">{s.label}</p>
                  <p className={s.highlight ? 'text-lg font-bold text-primary' : 'text-lg font-semibold'}>
                    {s.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {report.loading ? null : (data?.rows ?? []).length === 0 ? (
          <EmptyState message="Nothing matches these filters." />
        ) : (
          <EnhancedTable
            title={data?.title ?? 'Report'}
            header={headers}
            data={tableData as never}
            defaultOrder={headers[0]?.id}
            defaultDirection="asc"
          />
        )}
      </div>
    </>
  );
}
