import { toast } from 'sonner';
import { GenericDialog } from '@/components/dialogs';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { postJson, putJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';

interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  editingItem?: Record<string, unknown> | null;
  goodsItems: Record<string, string>;
  unitItems: Record<string, string>;
  onSaved: () => void;
}

const buildFields = (
  initial: Record<string, unknown> | undefined,
  goodsItems: Record<string, string>,
  unitItems: Record<string, string>,
): FieldMap => ({
  goodTypeId: {
    type: DynamicField.SELECT,
    name: 'goodTypeId',
    title: 'Good Type',
    required: true,
    items: goodsItems,
    value: String(initial?.goodTypeId ?? ''),
    grid: { sm: 6, md: 6 },
  },
  quantity: {
    type: DynamicField.NUMBER,
    name: 'quantity',
    title: 'Quantity',
    required: true,
    value: (initial?.quantity as number) ?? 1,
    min: 1,
    grid: { sm: 6, md: 6 },
  },
  unit: {
    type: DynamicField.SELECT,
    name: 'unit',
    title: 'Unit',
    required: true,
    items: unitItems,
    value: (initial?.unit as string) ?? 'Box',
    grid: { sm: 6, md: 6 },
  },
  unitPrice: {
    type: DynamicField.NUMBER,
    name: 'unitPrice',
    title: 'Unit Price ($)',
    value: (initial?.unitPrice as number | string) ?? '',
    min: 0,
    step: 0.01,
    grid: { sm: 6, md: 6 },
  },
  note: {
    type: DynamicField.TEXT,
    name: 'note',
    title: 'Note',
    value: (initial?.note as string) ?? '',
  },
});

export function ItemDialog({
  open,
  onClose,
  packageId,
  editingItem,
  goodsItems,
  unitItems,
  onSaved,
}: ItemDialogProps) {
  const submit = async (values: Record<string, unknown>): Promise<boolean> => {
    const unitPrice = values.unitPrice === '' || values.unitPrice == null ? null : Number(values.unitPrice);
    const body = {
      goodTypeId: Number(values.goodTypeId),
      quantity: Number(values.quantity),
      unit: values.unit,
      unitPrice,
      note: values.note || null,
    };
    try {
      if (editingItem) {
        await putJson(`/api/packages/${packageId}/items/${editingItem.id}`, body);
        toast.success('Item updated');
      } else {
        await postJson(`/api/packages/${packageId}/items`, body);
        toast.success('Item added');
      }
      onSaved();
      onClose();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  return (
    <GenericDialog
      open={open}
      onClose={onClose}
      title={editingItem ? 'Edit Item' : 'Add Item'}
    >
      <DynamicFormWidget
        fields={buildFields(editingItem ?? undefined, goodsItems, unitItems)}
        onSubmit={submit}
        drawerMode
      />
    </GenericDialog>
  );
}
