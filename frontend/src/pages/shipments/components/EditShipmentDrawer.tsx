import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { patchJson, parseApiError } from '../../../api/client';
import GenericDrawer from '../../../components/drawer/GenericDrawer';
import DynamicFormWidget from '../../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, DynamicFieldTypes } from '../../../components/dynamic-widget';

interface EditShipmentDrawerProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
  shipmentData: {
    tiiuCode: string | null;
    plannedDepartureDate: string | null;
    plannedArrivalDate: string | null;
    maxWeightKg: number | null;
    maxCbm: number | null;
  };
}

const EditShipmentDrawer = ({ open, onClose, shipmentId, shipmentData }: EditShipmentDrawerProps) => {
  const qc = useQueryClient();

  const updateShipment = useMutation({
    mutationFn: (values: Record<string, any>) =>
      patchJson(`/api/shipments/${shipmentId}`, {
        tiiuCode: values.tiiuCode || null,
        plannedDepartureDate: values.plannedDepartureDate || null,
        plannedArrivalDate: values.plannedArrivalDate || null,
        maxWeightKg: values.maxWeightKg === '' || values.maxWeightKg == null ? null : Number(values.maxWeightKg),
        maxCbm: values.maxCbm === '' || values.maxCbm == null ? null : Number(values.maxCbm),
      }),
    onSuccess: () => {
      toast.success('Shipment info updated');
      qc.invalidateQueries({ queryKey: ['/api/shipments', shipmentId] });
      onClose();
    },
    onError: (e: any) => {
      toast.error(parseApiError(e).message ?? 'Update failed');
    },
  });

  const editFields: Record<string, DynamicFieldTypes> = {
    tiiuCode: {
      type: DynamicField.TEXT,
      name: 'tiiuCode',
      title: 'TIIU Code',
      required: false,
      disabled: false,
      value: shipmentData.tiiuCode ?? '',
    },
    plannedDepartureDate: {
      type: DynamicField.DATE,
      name: 'plannedDepartureDate',
      title: 'Planned Departure Date',
      required: true,
      disabled: false,
      value: shipmentData.plannedDepartureDate ?? null,
    },
    plannedArrivalDate: {
      type: DynamicField.DATE,
      name: 'plannedArrivalDate',
      title: 'Planned Arrival Date',
      required: true,
      disabled: false,
      value: shipmentData.plannedArrivalDate ?? null,
    },
    // CBM-first per repo convention.
    maxCbm: {
      type: DynamicField.NUMBER,
      name: 'maxCbm',
      title: 'Max CBM (0 = unlimited)',
      required: false,
      disabled: false,
      value: shipmentData.maxCbm ?? 0,
      min: 0,
    },
    maxWeightKg: {
      type: DynamicField.NUMBER,
      name: 'maxWeightKg',
      title: 'Max Weight (Kg, 0 = unlimited)',
      required: false,
      disabled: false,
      value: shipmentData.maxWeightKg ?? 0,
      min: 0,
    },
  };

  return (
    <GenericDrawer open={open} title="Edit Shipment Info" onClose={onClose}>
      <DynamicFormWidget
        title=""
        drawerMode
        fields={editFields}
        onSubmit={async (values) => {
          try {
            await updateShipment.mutateAsync(values);
            return true;
          } catch {
            return false;
          }
        }}
      />
    </GenericDrawer>
  );
};

export default EditShipmentDrawer;
