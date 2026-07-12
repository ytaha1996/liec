import { toast } from 'sonner';
import { GenericDialog } from '@/components/dialogs';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { patchJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';

interface EditPackageDialogProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  packageData: { weightKg: number | null; cbm: number | null; note: string | null };
  onSaved?: () => void;
}

export function EditPackageDialog({
  open,
  onClose,
  packageId,
  packageData,
  onSaved,
}: EditPackageDialogProps) {
  const fields: FieldMap = {
    cbm: {
      type: DynamicField.NUMBER,
      name: 'cbm',
      title: 'CBM',
      required: true,
      value: packageData.cbm ?? 0,
      min: 0.01,
      grid: { sm: 6, md: 6 },
    },
    weightKg: {
      type: DynamicField.NUMBER,
      name: 'weightKg',
      title: 'Weight (Kg)',
      required: true,
      value: packageData.weightKg ?? 0,
      min: 0.01,
      grid: { sm: 6, md: 6 },
    },
    note: {
      type: DynamicField.TEXT,
      name: 'note',
      title: 'Note',
      value: packageData.note ?? '',
    },
  };

  const submit = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      await patchJson(`/api/packages/${packageId}`, {
        weightKg: values.weightKg != null ? Number(values.weightKg) : undefined,
        cbm: values.cbm != null ? Number(values.cbm) : undefined,
        note: values.note,
      });
      toast.success('Package updated');
      onSaved?.();
      onClose();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  return (
    <GenericDialog open={open} onClose={onClose} title="Edit Package">
      <DynamicFormWidget fields={fields} onSubmit={submit} drawerMode />
    </GenericDialog>
  );
}
