import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Divider, IconButton, Stack, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { getJson, postJson } from '../../../api/client';
import GenericDialog from '../../../components/GenericDialog/GenericDialog';
import DynamicFormWidget from '../../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField } from '../../../components/dynamic-widget';
import GenericInput from '../../../components/input-components/GenericTextInput';
import GenericNumberInput from '../../../components/input-components/GenericNumberInput';
import GenericSelectInput from '../../../components/input-components/GenericSelectInput';

interface AddPackageDialogProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
}

const AddPackageDialog = ({ open, onClose, shipmentId }: AddPackageDialogProps) => {
  const qc = useQueryClient();
  const [newPkgItems, setNewPkgItems] = useState<{ goodTypeId: string; quantity: string; note: string }[]>([]);

  const customersQuery = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const goodTypesQuery = useQuery<any[]>({
    queryKey: ['/api/good-types'],
    queryFn: () => getJson<any[]>('/api/good-types'),
  });

  const customersItems = (customersQuery.data ?? []).reduce(
    (acc: Record<string, string>, c: any) => { acc[String(c.id)] = `${c.name} (#${c.id})`; return acc; }, {},
  );

  const goodTypesItems = (goodTypesQuery.data ?? []).reduce(
    (acc: Record<string, string>, g: any) => { acc[String(g.id)] = g.nameEn; return acc; }, {},
  );

  const handleClose = () => {
    onClose();
    setNewPkgItems([]);
  };

  const handleSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await postJson(`/api/shipments/${shipmentId}/packages`, {
        customerId: Number(values.customerId),
        provisionMethod: values.provisionMethod,
        supplyOrderId: null,
        weightKg: values.weightKg ? Number(values.weightKg) : null,
        cbm: values.cbm ? Number(values.cbm) : null,
        note: values.note || null,
        items: newPkgItems.filter(i => i.goodTypeId).map(i => ({
          goodTypeId: Number(i.goodTypeId),
          quantity: Number(i.quantity) || 1,
          note: i.note || null,
        })),
      });
      toast.success('Package created');
      qc.invalidateQueries({ queryKey: ['/api/packages'] });
      qc.invalidateQueries({ queryKey: ['/api/shipments', shipmentId] });
      handleClose();
      return true;
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create package');
      return false;
    }
  };

  return (
    <GenericDialog open={open} onClose={handleClose} title="Add Package to Shipment">
      <DynamicFormWidget
        title=""
        drawerMode
        fields={{
          customerId: { type: DynamicField.SELECT, name: 'customerId', title: 'Customer', required: true, disabled: false, value: '', items: customersItems, grid: { xs: 6 } },
          provisionMethod: { type: DynamicField.SELECT, name: 'provisionMethod', title: 'Provision Method', required: true, disabled: false, value: 'CustomerProvided', items: { CustomerProvided: 'Customer Provided', ProcuredForCustomer: 'Procured For Customer' }, grid: { xs: 6 } },
          weightKg: { type: DynamicField.NUMBER, name: 'weightKg', title: 'Weight (kg)', required: false, disabled: false, value: '', min: 0, grid: { xs: 6 } },
          cbm: { type: DynamicField.NUMBER, name: 'cbm', title: 'CBM', required: false, disabled: false, value: '', min: 0, grid: { xs: 6 } },
          note: { type: DynamicField.TEXT, name: 'note', title: 'Note', required: false, disabled: false, value: '' },
        }}
        onSubmit={handleSubmit}
      >
        <Divider />
        <Typography variant="subtitle1">Items (optional)</Typography>
        {newPkgItems.map((item, idx) => (
          <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <GenericSelectInput name={`item-good-type-${idx}`} title="Good Type" value={item.goodTypeId} items={goodTypesItems} onChange={(v: any) => {
              const updated = [...newPkgItems]; updated[idx] = { ...updated[idx], goodTypeId: v }; setNewPkgItems(updated);
            }} type="" error="" disabled={false} />
            <GenericNumberInput name={`item-qty-${idx}`} title="Qty" value={item.quantity} onChange={(v: any) => {
              const updated = [...newPkgItems]; updated[idx] = { ...updated[idx], quantity: v }; setNewPkgItems(updated);
            }} error="" disabled={false} />
            <GenericInput name={`item-note-${idx}`} title="Note" value={item.note} onChange={(v: any) => {
              const updated = [...newPkgItems]; updated[idx] = { ...updated[idx], note: v }; setNewPkgItems(updated);
            }} type="text" error="" disabled={false} />
            <IconButton size="small" onClick={() => setNewPkgItems(items => items.filter((_, i) => i !== idx))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => setNewPkgItems(items => [...items, { goodTypeId: '', quantity: '1', note: '' }])}>
          + Add Item
        </Button>
      </DynamicFormWidget>
    </GenericDialog>
  );
};

export default AddPackageDialog;
