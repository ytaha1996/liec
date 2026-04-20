import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { postJson } from '../../../api/client';
import GenericDialog from '../../../components/GenericDialog/GenericDialog';
import DynamicFormWidget from '../../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../../components/dynamic-widget';

interface PricingOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  packageId: string;
  initialOverrideType?: 'RatePerKg' | 'RatePerCbm' | 'TotalCharge';
}

const PricingOverrideDialog = ({ open, onClose, packageId, initialOverrideType = 'RatePerKg' }: PricingOverrideDialogProps) => {
  const qc = useQueryClient();

  const applyOverride = useMutation({
    mutationFn: (payload: { overrideType: string; newValue: number; reason: string }) =>
      postJson(`/api/packages/${packageId}/pricing-override`, payload),
    onSuccess: () => {
      toast.success('Pricing override applied');
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId, 'pricing-overrides'] });
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Override failed');
    },
  });

  const fields: Record<string, DynamicFieldTypes> = {
    overrideType: {
      type: DynamicField.SELECT,
      name: 'overrideType',
      title: 'Override Type',
      required: true,
      disabled: false,
      value: initialOverrideType,
      items: { RatePerKg: 'Rate Per Kg', RatePerCbm: 'Rate Per CBM', TotalCharge: 'Total Charge' },
    },
    newValue: {
      type: DynamicField.NUMBER,
      name: 'newValue',
      title: 'New Value',
      required: true,
      disabled: false,
      value: '',
      min: 0,
    },
    reason: {
      type: DynamicField.TEXTAREA,
      name: 'reason',
      title: 'Reason',
      required: true,
      disabled: false,
      value: '',
    },
  };

  return (
    <GenericDialog open={open} onClose={onClose} title="Override Pricing">
      <DynamicFormWidget
        title=""
        drawerMode
        fields={fields}
        onSubmit={async (values) => {
          try {
            await applyOverride.mutateAsync({
              overrideType: values.overrideType,
              newValue: Number(values.newValue),
              reason: values.reason,
            });
            return true;
          } catch {
            return false;
          }
        }}
      />
    </GenericDialog>
  );
};

export default PricingOverrideDialog;
