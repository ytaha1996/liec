import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { GenericDialog } from '@/components/dialogs';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import {
  GenericInput,
  GenericNumberInput,
  GenericSelect,
} from '@/components/inputs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getJson, postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';
import { useLoader } from '@/hooks/useLoader';
import { useInitializeFunction } from '@/hooks/useInitializeFunction';
import { fetchUnits, type LookupItem } from '@/api/lookups';

interface AddPackageDialogProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
  onSaved: () => void;
}

interface InlineItem {
  goodTypeId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  note: string;
}

const emptyItem = (): InlineItem => ({
  goodTypeId: '',
  quantity: '1',
  unit: 'Box',
  unitPrice: '',
  note: '',
});

export function AddPackageDialog({ open, onClose, shipmentId, onSaved }: AddPackageDialogProps) {
  const [items, setItems] = useState<InlineItem[]>([emptyItem(), emptyItem(), emptyItem()]);

  const customers = useLoader<Array<{ id: number; name: string }>>(() => getJson('/api/customers'));
  const goodTypes = useLoader<Array<{ id: number; nameEn: string }>>(() => getJson('/api/good-types'));
  const suppliers = useLoader<Array<{ id: number; name: string }>>(() => getJson('/api/suppliers'));
  const units = useLoader<LookupItem[]>(fetchUnits);

  useInitializeFunction([customers.reload, goodTypes.reload, suppliers.reload, units.reload]);

  useEffect(() => {
    if (open) setItems([emptyItem(), emptyItem(), emptyItem()]);
  }, [open]);

  const customersItems = useMemo(
    () =>
      (customers.data ?? []).reduce<Record<string, string>>((acc, c) => {
        acc[String(c.id)] = `${c.name} (#${c.id})`;
        return acc;
      }, {}),
    [customers.data],
  );
  const suppliersItems = useMemo(
    () =>
      (suppliers.data ?? []).reduce<Record<string, string>>((acc, s) => {
        acc[String(s.id)] = s.name;
        return acc;
      }, {}),
    [suppliers.data],
  );
  const goodTypesItems = useMemo(
    () =>
      (goodTypes.data ?? []).reduce<Record<string, string>>((acc, g) => {
        acc[String(g.id)] = g.nameEn;
        return acc;
      }, {}),
    [goodTypes.data],
  );
  const unitItems = useMemo(
    () =>
      (units.data ?? []).reduce<Record<string, string>>((acc, u) => {
        acc[u.code] = u.label;
        return acc;
      }, {}),
    [units.data],
  );

  const fields: FieldMap = {
    customerId: {
      type: DynamicField.SELECT,
      name: 'customerId',
      title: 'Customer',
      required: true,
      items: customersItems,
      value: '',
      grid: { sm: 6, md: 6 },
    },
    provisionMethod: {
      type: DynamicField.SELECT,
      name: 'provisionMethod',
      title: 'Provision Method',
      required: true,
      items: {
        CustomerProvided: 'Customer Provided',
        ProcuredForCustomer: 'Procured For Customer',
      },
      value: 'CustomerProvided',
      grid: { sm: 6, md: 6 },
    },
    cbm: {
      type: DynamicField.NUMBER,
      name: 'cbm',
      title: 'CBM',
      value: 0,
      min: 0,
      grid: { sm: 6, md: 6 },
    },
    weightKg: {
      type: DynamicField.NUMBER,
      name: 'weightKg',
      title: 'Weight (kg)',
      value: 0,
      min: 0,
      grid: { sm: 6, md: 6 },
    },
    note: {
      type: DynamicField.TEXT,
      name: 'note',
      title: 'Note',
      value: '',
    },
    soSupplierId: {
      type: DynamicField.SELECT,
      name: 'soSupplierId',
      title: 'Supplier',
      items: suppliersItems,
      value: '',
      conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
      conditionalRequired: (v) => v.provisionMethod === 'ProcuredForCustomer',
      grid: { sm: 6, md: 6 },
    },
    soName: {
      type: DynamicField.TEXT,
      name: 'soName',
      title: 'Item / Order Name',
      value: '',
      conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
      conditionalRequired: (v) => v.provisionMethod === 'ProcuredForCustomer',
      grid: { sm: 6, md: 6 },
    },
    soPurchasePrice: {
      type: DynamicField.NUMBER,
      name: 'soPurchasePrice',
      title: 'Purchase Price',
      value: '',
      min: 0,
      conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
      conditionalRequired: (v) => v.provisionMethod === 'ProcuredForCustomer',
      grid: { sm: 6, md: 6 },
    },
    soDetails: {
      type: DynamicField.TEXT,
      name: 'soDetails',
      title: 'Details',
      value: '',
      conditionalHidden: (v) => v.provisionMethod !== 'ProcuredForCustomer',
      grid: { sm: 6, md: 6 },
    },
  };

  const handleSubmit = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      const body: Record<string, unknown> = {
        customerId: Number(values.customerId),
        provisionMethod: values.provisionMethod,
        supplyOrderId: null,
        weightKg: values.weightKg ? Number(values.weightKg) : null,
        cbm: values.cbm ? Number(values.cbm) : null,
        note: values.note || null,
        items: items
          .filter((i) => i.goodTypeId)
          .map((i) => ({
            goodTypeId: Number(i.goodTypeId),
            quantity: Number(i.quantity) || 1,
            unit: i.unit || 'Box',
            unitPrice: i.unitPrice === '' || i.unitPrice == null ? null : Number(i.unitPrice),
            note: i.note || null,
          })),
      };
      if (values.provisionMethod === 'ProcuredForCustomer') {
        body.supplyOrder = {
          supplierId: Number(values.soSupplierId),
          name: values.soName,
          purchasePrice: Number(values.soPurchasePrice),
          details: values.soDetails || null,
        };
      }
      await postJson(`/api/shipments/${shipmentId}/packages`, body);
      toast.success('Package created');
      onSaved();
      onClose();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  const updateItem = (idx: number, patch: Partial<InlineItem>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  return (
    <GenericDialog open={open} onClose={onClose} title="Add Package to Shipment" size="lg">
      <DynamicFormWidget fields={fields} onSubmit={handleSubmit} drawerMode>
        <Separator className="my-4" />
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Items (optional)</p>
          <p className="text-xs text-muted-foreground">
            {items.filter((i) => i.goodTypeId).length} of {items.length} filled
          </p>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border bg-muted/30 overflow-hidden"
            >
              {/* Item header — index + delete. Always reachable, never overflows. */}
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/60">
                <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Item {idx + 1}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={items.length <= 1}
                  onClick={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                  aria-label={`Remove item ${idx + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {/* Body: 1 col on phones, 2 cols on sm+, 4 cols on md+ for fast entry on wide screens. */}
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <GenericSelect
                    name={`item-good-${idx}`}
                    title="Good Type"
                    value={item.goodTypeId}
                    items={goodTypesItems}
                    onChange={(v) => updateItem(idx, { goodTypeId: v })}
                  />
                </div>
                <GenericNumberInput
                  name={`item-qty-${idx}`}
                  title="Qty"
                  value={item.quantity}
                  min={1}
                  onChange={(v) => updateItem(idx, { quantity: String(v) })}
                />
                <GenericSelect
                  name={`item-unit-${idx}`}
                  title="Unit"
                  value={item.unit}
                  items={unitItems}
                  onChange={(v) => updateItem(idx, { unit: v ?? 'Box' })}
                />
                <GenericNumberInput
                  name={`item-price-${idx}`}
                  title="Price ($)"
                  value={item.unitPrice}
                  min={0}
                  step={0.01}
                  onChange={(v) => updateItem(idx, { unitPrice: String(v) })}
                />
                <div className="sm:col-span-2 md:col-span-3">
                  <GenericInput
                    name={`item-note-${idx}`}
                    title="Note"
                    value={item.note}
                    onChange={(v) => updateItem(idx, { note: v })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((arr) => [...arr, emptyItem()])}
          >
            + Add Item
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((arr) => [...arr, ...Array.from({ length: 5 }, emptyItem)])}
          >
            + Add 5 Rows
          </Button>
        </div>
      </DynamicFormWidget>
    </GenericDialog>
  );
}
