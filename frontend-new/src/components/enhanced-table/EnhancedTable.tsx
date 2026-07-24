import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  formatCurrencyNumber,
  formatDate,
  formatDateTime,
  formatIntPhoneNumber,
} from '@/helpers/formatting-utils';
import { EnhancedTableColumnType, type EnhanceTableHeaderTypes, type Order } from './types';
import { TableFilterTypes, type ITableFilterType } from './filter-types';
import { GenericDateRangePicker } from '@/components/inputs/GenericDateRangePicker';
import { BRAND_TEAL } from '@/constants/statusColors';

interface EnhancedTableProps {
  title: string;
  header: EnhanceTableHeaderTypes[];
  data: Record<string, Record<string, unknown>>;
  defaultOrder?: string;
  defaultDirection?: Order;
  filters?: ITableFilterType[];
  toolbarActions?: ReactNode;
  pageSize?: number;
  selectionEnabled?: boolean;
  // Rendered in a bar above the table whenever rows are selected — receives
  // the selected row ids and a callback to clear the selection (call it after
  // a bulk action completes).
  renderBulkActions?: (selected: string[], clearSelection: () => void) => ReactNode;
}

// Same options on all viewports — the previous window.innerWidth check wasn't
// reactive to resize/rotation and the dropdown is compact anyway.
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function CellContent({
  column,
  row,
  rowId,
  value,
}: {
  column: EnhanceTableHeaderTypes;
  row: Record<string, unknown>;
  rowId: string;
  value: unknown;
}) {
  switch (column.type) {
    case EnhancedTableColumnType.TEXT:
    case EnhancedTableColumnType.NUMBER:
      return <>{value as ReactNode}</>;
    case EnhancedTableColumnType.DATE:
      return <>{formatDate(value)}</>;
    case EnhancedTableColumnType.DATETIME:
      return <>{formatDateTime(value)}</>;
    case EnhancedTableColumnType.CURRENCY:
      return <>{formatCurrencyNumber(value, column.currency ?? 'USD')}</>;
    case EnhancedTableColumnType.PhoneNumber:
      return <>{formatIntPhoneNumber(String(value ?? ''))}</>;
    case EnhancedTableColumnType.LINK:
      return (
        <a className="text-primary underline" href={column.url(row)}>
          {value as ReactNode}
        </a>
      );
    case EnhancedTableColumnType.Clickable:
      return (
        <button
          type="button"
          className="text-primary hover:underline text-left"
          onClick={() => column.onClick(rowId, row)}
        >
          {(value as ReactNode) ?? '—'}
        </button>
      );
    case EnhancedTableColumnType.COLORED_CHIP: {
      const tagsRaw = column.chipValueKey ? row[column.chipValueKey] : value;
      const tags =
        tagsRaw == null
          ? []
          : Array.isArray(tagsRaw)
          ? tagsRaw.map(String)
          : [String(tagsRaw)];
      const displayLabel = (k: string): string => column.chipLabels?.[k] ?? k;
      // When chipValueKey is set, the cell text is the raw value (e.g. "10/50 (20%)")
      // and only the chip swatch reflects the lookup key.
      if (column.chipValueKey) {
        const key = String(row[column.chipValueKey] ?? '');
        const palette = column.chipColors?.[key];
        return (
          <Badge
            className="font-normal"
            style={{
              color: palette?.color ?? undefined,
              backgroundColor: palette?.backgroundColor ?? undefined,
            }}
          >
            {String(value ?? '—')}
          </Badge>
        );
      }
      return (
        <div className="flex flex-wrap gap-1">
          {tags.map((k) => {
            const palette = column.chipColors?.[k];
            return (
              <Badge
                key={k}
                className="font-normal"
                style={{
                  color: palette?.color ?? undefined,
                  backgroundColor: palette?.backgroundColor ?? undefined,
                }}
              >
                {displayLabel(k)}
              </Badge>
            );
          })}
        </div>
      );
    }
    case EnhancedTableColumnType.Action:
      return (
        <div className="flex items-center gap-0.5">
          {column.actions.map((a, i) =>
            a.hidden?.(row) ? null : (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => a.onClick(rowId, row)}
                    className="size-9 sm:size-8"
                  >
                    {a.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{a.label}</TooltipContent>
              </Tooltip>
            ),
          )}
        </div>
      );
    case EnhancedTableColumnType.CUSTOM:
      return <>{column.render(row, rowId)}</>;
    default:
      return <>{value as ReactNode}</>;
  }
}

export function EnhancedTable({
  title,
  header,
  data,
  defaultOrder,
  defaultDirection = 'desc',
  filters = [],
  toolbarActions,
  pageSize: initialPageSize = 10,
  selectionEnabled = false,
  renderBulkActions,
}: EnhancedTableProps) {
  const [orderBy, setOrderBy] = useState<string>(defaultOrder ?? header[0]?.id ?? '');
  const [order, setOrder] = useState<Order>(defaultDirection);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState<string[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});

  const allRows = useMemo<Array<Record<string, unknown> & { id: string }>>(
    () => Object.entries(data).map(([id, row]) => ({ ...row, id })),
    [data],
  );

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some(
          (v) => v != null && String(v).toLowerCase().includes(needle),
        ),
      );
    }
    for (const [name, value] of Object.entries(filterValues)) {
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
      const filterDef = filters.find((f) => f.name === name);
      if (!filterDef) continue;
      if (filterDef.type === TableFilterTypes.SELECT) {
        rows = rows.filter((r) => String(r[name] ?? '') === String(value));
      } else if (filterDef.type === TableFilterTypes.DATERANGE) {
        const range = value as { from?: string; to?: string };
        rows = rows.filter((r) => {
          const cell = String(r[name] ?? '').slice(0, 10);
          if (!cell) return false;
          if (range.from && cell < range.from) return false;
          if (range.to && cell > range.to) return false;
          return true;
        });
      }
    }
    return rows;
  }, [allRows, search, filterValues, filters]);

  const sortedRows = useMemo(() => {
    if (!orderBy) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[orderBy];
      const bv = b[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return order === 'asc' ? -1 : 1;
      if (bv == null) return order === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return order === 'asc' ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return order === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, orderBy, order]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const visibleRows = useMemo(
    () => sortedRows.slice(page * pageSize, page * pageSize + pageSize),
    [sortedRows, page, pageSize],
  );

  // Reset to page 0 when filters/search reduce visible range.
  if (page > 0 && page >= pageCount) setPage(0);

  const toggleSort = (id: string) => {
    if (orderBy === id) setOrder(order === 'asc' ? 'desc' : 'asc');
    else {
      setOrderBy(id);
      setOrder('asc');
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? visibleRows.map((r) => String(r.id)) : []);
  };

  const toggleSelectOne = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const colSpan = header.length + (selectionEnabled ? 1 : 0);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b text-white"
        style={{ backgroundColor: BRAND_TEAL }}
      >
        <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 opacity-60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8 h-9 bg-white text-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-2.5 opacity-60 hover:opacity-100"
                aria-label="Clear search"
              >
                <X className="size-4 text-foreground" />
              </button>
            )}
          </div>
          {toolbarActions}
        </div>
      </div>

      {/* Filters row */}
      {filters.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 px-3 sm:px-4 py-2 border-b bg-muted/30">
          {filters.map((f) => {
            if (f.type === TableFilterTypes.SELECT) {
              const v = (filterValues[f.name] as string | undefined) ?? '';
              return (
                <Select
                  key={f.name}
                  value={v || undefined}
                  onValueChange={(val) =>
                    setFilterValues({ ...filterValues, [f.name]: val === '__all__' ? '' : val })
                  }
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder={f.title} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All {f.title}</SelectItem>
                    {Object.entries(f.options).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }
            return (
              <GenericDateRangePicker
                key={f.name}
                name={f.name}
                title=""
                value={filterValues[f.name] as never}
                onChange={(v) => setFilterValues({ ...filterValues, [f.name]: v })}
                placeholder={f.title}
              />
            );
          })}
        </div>
      )}

      {/* Bulk actions bar — appears when rows are selected */}
      {selectionEnabled && selected.length > 0 && renderBulkActions && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 sm:px-4 py-2 border-b bg-accent/50">
          <span className="text-sm font-medium">{selected.length} selected</span>
          <div className="flex flex-wrap gap-2">
            {renderBulkActions(selected, () => setSelected([]))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionEnabled && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      visibleRows.length > 0 &&
                      visibleRows.every((r) => selected.includes(String(r.id)))
                    }
                    onCheckedChange={(v) => toggleSelectAll(!!v)}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {header.map((h) => (
                <TableHead
                  key={h.id}
                  className={cn(
                    'text-xs sm:text-sm font-semibold',
                    h.numeric && 'text-right',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(h.id)}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    {h.label}
                    {orderBy === h.id ? (
                      order === 'asc' ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
                  No data
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => {
                const id = String(row.id);
                return (
                  <TableRow key={id}>
                    {selectionEnabled && (
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(id)}
                          onCheckedChange={() => toggleSelectOne(id)}
                          aria-label={`Select ${id}`}
                        />
                      </TableCell>
                    )}
                    {header.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          'text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-3',
                          column.numeric && 'text-right',
                        )}
                      >
                        <CellContent
                          column={column}
                          row={row}
                          rowId={id}
                          value={row[column.id]}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-t bg-muted/30 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-20 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>
            {sortedRows.length === 0
              ? '0–0 of 0'
              : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sortedRows.length)} of ${sortedRows.length}`}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage(0)}
            className="hidden sm:inline-flex"
            aria-label="First page"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={page >= pageCount - 1}
            onClick={() => setPage(pageCount - 1)}
            className="hidden sm:inline-flex"
            aria-label="Last page"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
