import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { patchJson } from '../../../api/client';
import GenericDialog from '../../../components/GenericDialog/GenericDialog';
import DynamicFormWidget from '../../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField } from '../../../components/dynamic-widget';

interface EditPackageDialogProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  packageData: { weightKg: number | null; cbm: number | null; note: string | null };
}

const EditPackageDialog = ({ open, onClose, packageId, packageData }: EditPackageDialogProps) => {
  const qc = useQueryClient();

  const updatePackage = useMutation({
    mutationFn: (values: Record<string, any>) =>
      patchJson(`/api/packages/${packageId}`, {
        weightKg: values.weightKg !== undefined ? Number(values.weightKg) : undefined,
        cbm: values.cbm !== undefined ? Number(values.cbm) : undefined,
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('Package updated');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Update failed');
    },
  });

  return (
    <GenericDialog open={open} onClose={onClose} title="Edit Package">
      <DynamicFormWidget
        title=""
        drawerMode
        fields={{
          weightKg: { type: DynamicField.NUMBER, name: 'weightKg', title: 'Weight (Kg)', required: false, disabled: false, value: packageData.weightKg ?? 0 },
          cbm: { type: DynamicField.NUMBER, name: 'cbm', title: 'CBM', required: false, disabled: false, value: packageData.cbm ?? 0 },
          note: { type: DynamicField.TEXT, name: 'note', title: 'Note', required: false, disabled: false, value: packageData.note ?? '' },
        }}
        onSubmit={async (values) => {
          try {
            await updatePackage.mutateAsync(values);
            return true;
          } catch {
            return false;
          }
        }}
      />
    </GenericDialog>
  );
};

export default EditPackageDialog;
