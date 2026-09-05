import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { GenericDialog } from '@/components/dialogs';
import { GenericInput, GenericNumberInput, GenericSelect } from '@/components/inputs';
import { Button } from '@/components/ui/button';
import { postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';

interface BulkAddItemsDialogProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  goodsItems: Record<string, string>;
  unitItems: Record<string, string>;
  onSaved: () => void;
}

interface Row {
  goodTypeId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  note: string;
}

const emptyRow = (): Row => ({ goodTypeId: '', quantity: '1', unit: 'Box', unitPrice: '', note: '' });

export function BulkAddItemsDialog({
  open,
  onClose,
  packageId,
  goodsItems,
  unitItems,
  onSaved,
}: BulkAddItemsDialogProps) {
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setRows([emptyRow(), emptyRow(), emptyRow()]);
  }, [open]);

  const update = (idx: number, patch: Partial<Row>) =>
    setRows((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const submit = async () => {
    const filled = rows.filter((r) => r.goodTypeId);
    if (filled.length === 0) {
      toast.error('Pick a good type on at least one row.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        items: filled.map((r) => ({
          goodTypeId: Number(r.goodTypeId),
          quantity: Number(r.quantity) || 1,
          unit: r.unit || 'Box',
          unitPrice: r.unitPrice === '' ? null : Number(r.unitPrice),
          note: r.note || null,
        })),
      };
      const res = await postJson<{ added: number }>(`/api/packages/${packageId}/items/bulk`, body);
      toast.success(`${res.added} item(s) added`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(parseApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GenericDialog open={open} onClose={onClose} title="Bulk Add Items" size="lg">
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-lg border bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/60">
              <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Item {idx + 1}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={rows.length <= 1}
                onClick={() => setRows((arr) => arr.filter((_, i) => i !== idx))}
                aria-label={`Remove item ${idx + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <GenericSelect
                  name={`bulk-good-${idx}`}
                  title="Good Type"
                  value={row.goodTypeId}
                  items={goodsItems}
                  onChange={(v) => update(idx, { goodTypeId: v })}
                />
              </div>
              <GenericNumberInput
                name={`bulk-qty-${idx}`}
                title="Qty"
                value={row.quantity}
                min={1}
                onChange={(v) => update(idx, { quantity: String(v) })}
              />
              <GenericSelect
                name={`bulk-unit-${idx}`}
                title="Unit"
                value={row.unit}
                items={unitItems}
                onChange={(v) => update(idx, { unit: v ?? 'Box' })}
              />
              <GenericNumberInput
                name={`bulk-price-${idx}`}
                title="Unit Price ($)"
                value={row.unitPrice}
                min={0}
                step={0.01}
                onChange={(v) => update(idx, { unitPrice: String(v) })}
              />
              <div className="sm:col-span-2 md:col-span-3">
                <GenericInput
                  name={`bulk-note-${idx}`}
                  title="Note"
                  value={row.note}
                  onChange={(v) => update(idx, { note: v })}
                />
              </div>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRows((arr) => [...arr, emptyRow()])}>
              + Add Row
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRows((arr) => [...arr, ...Array.from({ length: 5 }, emptyRow)])}
            >
              + Add 5 Rows
            </Button>
          </div>
          <Button onClick={submit} disabled={saving}>
            Save {rows.filter((r) => r.goodTypeId).length || ''} Item(s)
          </Button>
        </div>
      </div>
    </GenericDialog>
  );
}
