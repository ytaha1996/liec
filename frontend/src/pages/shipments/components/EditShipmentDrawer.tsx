import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { patchJson } from '../../../api/client';
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
      }),
    onSuccess: () => {
      toast.success('Shipment info updated');
      qc.invalidateQueries({ queryKey: ['/api/shipments', shipmentId] });
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Update failed');
    },
  });

  const editFields: Record<string, DynamicFieldTypes> = {
    tiiuCode: {
      type: DynamicField.TEXT,
      name: 'tiiuCode',
      title: 'TIIU Code (e.g., MSCU1234567)',
      required: false,
      disabled: false,
      value: shipmentData.tiiuCode ?? '',
      regex: /^[A-Za-z]{3,4}\d{4,7}$/,
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
