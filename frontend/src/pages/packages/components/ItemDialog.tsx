import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getJson, postJson, putJson } from '../../../api/client';
import GenericDialog from '../../../components/GenericDialog/GenericDialog';
import DynamicFormWidget from '../../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../../components/dynamic-widget';

interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  editingItem?: Record<string, any> | null;
}

const buildItemFields = (initial: Record<string, any> | undefined, goodsItems: Record<string, string>): Record<string, DynamicFieldTypes> => ({
  goodTypeId: {
    type: DynamicField.SELECT,
    name: 'goodTypeId',
    title: 'Good Type',
    required: true,
    disabled: false,
    items: goodsItems,
    value: String(initial?.goodTypeId ?? ''),
  },
  quantity: {
    type: DynamicField.NUMBER,
    name: 'quantity',
    title: 'Quantity',
    required: true,
    disabled: false,
    value: initial?.quantity ?? 1,
  },
  note: {
    type: DynamicField.TEXT,
    name: 'note',
    title: 'Note',
    required: false,
    disabled: false,
    value: initial?.note ?? '',
  },
});

const ItemDialog = ({ open, onClose, packageId, editingItem }: ItemDialogProps) => {
  const qc = useQueryClient();

  const goodsQuery = useQuery<any[]>({
    queryKey: ['/api/good-types'],
    queryFn: () => getJson<any[]>('/api/good-types'),
  });

  const goodsItems: Record<string, string> = (goodsQuery.data ?? []).reduce(
    (acc: Record<string, string>, g: any) => { acc[String(g.id)] = g.nameEn; return acc; }, {},
  );

  const addItem = useMutation({
    mutationFn: (values: Record<string, any>) =>
      postJson(`/api/packages/${packageId}/items`, {
        goodTypeId: Number(values.goodTypeId),
        quantity: Number(values.quantity),
        note: values.note || null,
      }),
    onSuccess: () => {
      toast.success('Item added');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
      onClose();
    },
    onError: () => toast.error('Add item failed'),
  });

  const putItem = useMutation({
    mutationFn: ({ itemId, values }: { itemId: number; values: Record<string, any> }) =>
      putJson(`/api/packages/${packageId}/items/${itemId}`, {
        goodTypeId: Number(values.goodTypeId),
        quantity: Number(values.quantity),
        note: values.note || null,
      }),
    onSuccess: () => {
      toast.success('Item updated');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
      onClose();
    },
    onError: () => toast.error('Update failed'),
  });

  const handleSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      if (editingItem) await putItem.mutateAsync({ itemId: editingItem.id, values });
      else await addItem.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <GenericDialog
      open={open}
      title={editingItem ? 'Edit Item' : 'Add Item'}
      onClose={onClose}
    >
      <DynamicFormWidget
        title=""
        drawerMode
        fields={buildItemFields(editingItem ?? undefined, goodsItems)}
        onSubmit={handleSubmit}
      />
    </GenericDialog>
  );
};

export default ItemDialog;
