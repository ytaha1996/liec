import { toast } from 'sonner';
import { parseISO, isBefore } from 'date-fns';
import { GenericDrawer } from '@/components/dialogs';
import { DynamicFormWidget, DynamicField, type FieldMap } from '@/components/dynamic-form';
import { patchJson } from '@/api/client';
import { parseApiError } from '@/api/parseApiError';

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
  onSaved: () => void;
}

export function EditShipmentDrawer({
  open,
  onClose,
  shipmentId,
  shipmentData,
  onSaved,
}: EditShipmentDrawerProps) {
  const fields: FieldMap = {
    tiiuCode: {
      type: DynamicField.TEXT,
      name: 'tiiuCode',
      title: 'TIIU Code',
      value: shipmentData.tiiuCode ?? '',
    },
    plannedDepartureDate: {
      type: DynamicField.DATE,
      name: 'plannedDepartureDate',
      title: 'Planned Departure Date',
      required: true,
      value: shipmentData.plannedDepartureDate ?? null,
      grid: { sm: 6, md: 6 },
    },
    plannedArrivalDate: {
      type: DynamicField.DATE,
      name: 'plannedArrivalDate',
      title: 'Planned Arrival Date',
      required: true,
      value: shipmentData.plannedArrivalDate ?? null,
      grid: { sm: 6, md: 6 },
      customValidator: (_v, vals) => {
        const dep = vals.plannedDepartureDate as string | undefined;
        const arr = vals.plannedArrivalDate as string | undefined;
        if (!dep || !arr) return '';
        return isBefore(parseISO(arr), parseISO(dep)) ? 'Arrival must be on or after departure' : '';
      },
    },
    maxCbm: {
      type: DynamicField.NUMBER,
      name: 'maxCbm',
      title: 'Max CBM (0 = unlimited)',
      value: shipmentData.maxCbm ?? 0,
      min: 0,
      grid: { sm: 6, md: 6 },
    },
    maxWeightKg: {
      type: DynamicField.NUMBER,
      name: 'maxWeightKg',
      title: 'Max Weight (Kg, 0 = unlimited)',
      value: shipmentData.maxWeightKg ?? 0,
      min: 0,
      grid: { sm: 6, md: 6 },
    },
  };

  const submit = async (values: Record<string, unknown>): Promise<boolean> => {
    try {
      await patchJson(`/api/shipments/${shipmentId}`, {
        tiiuCode: values.tiiuCode || null,
        plannedDepartureDate: values.plannedDepartureDate || null,
        plannedArrivalDate: values.plannedArrivalDate || null,
        maxWeightKg:
          values.maxWeightKg === '' || values.maxWeightKg == null ? null : Number(values.maxWeightKg),
        maxCbm: values.maxCbm === '' || values.maxCbm == null ? null : Number(values.maxCbm),
      });
      toast.success('Shipment info updated');
      onSaved();
      onClose();
      return true;
    } catch (e) {
      toast.error(parseApiError(e).message);
      return false;
    }
  };

  return (
    <GenericDrawer open={open} onClose={onClose} title="Edit Shipment Info">
      <DynamicFormWidget fields={fields} onSubmit={submit} drawerMode />
    </GenericDrawer>
  );
}
