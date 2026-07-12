import { toast } from 'sonner';
import { GenericDialog } from '@/components/dialogs';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { postJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';

interface PricingOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  initialOverrideType?: 'RatePerKg' | 'RatePerCbm' | 'TotalCharge';
  onSaved: () => void;
}

export function PricingOverrideDialog({
  open,
  onClose,
  packageId,
  initialOverrideType = 'RatePerKg',
  onSaved,
}: PricingOverrideDialogProps) {
  const fields: FieldMap = {
    overrideType: {
      type: DynamicField.SELECT,
      name: 'overrideType',
      title: 'Override Type',
      required: true,
      value: initialOverrideType,
      items: {
        RatePerKg: 'Rate Per Kg',
        RatePerCbm: 'Rate Per CBM',
        TotalCharge: 'Total Charge',
      },
      grid: { sm: 12, md: 12 },
    },
    newValue: {
      type: DynamicField.NUMBER,
      name: 'newValue',
      title: 'New Value',
      required: true,
      value: '',
      min: 0,
    },
    reason: {
      type: DynamicField.TEXTAREA,
      name: 'reason',
      title: 'Reason',
      required: true,
      value: '',
    },
  };

  const submit = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      await postJson(`/api/packages/${packageId}/pricing-override`, {
        overrideType: values.overrideType,
        newValue: Number(values.newValue),
        reason: values.reason,
      });
      toast.success('Pricing override applied');
      onSaved();
      onClose();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  return (
    <GenericDialog open={open} onClose={onClose} title="Override Pricing">
      <DynamicFormWidget fields={fields} onSubmit={submit} drawerMode />
    </GenericDialog>
  );
}
