import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Box, Button, IconButton, Stack } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getJson, postJson, parseApiError } from '../../../api/client';
import GenericDialog from '../../../components/GenericDialog/GenericDialog';
import GenericInput from '../../../components/input-components/GenericTextInput';
import GenericNumberInput from '../../../components/input-components/GenericNumberInput';
import GenericSelectInput from '../../../components/input-components/GenericSelectInput';
import { useUnitsLookup } from '../../../api/lookups';

interface Props {
  open: boolean;
  onClose: () => void;
  packageId: string;
}

interface Row {
  goodTypeId: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  note: string;
}

const emptyRow = (): Row => ({ goodTypeId: '', quantity: '1', unit: 'Box', unitPrice: '', note: '' });

const BulkAddItemsDialog = ({ open, onClose, packageId }: Props) => {
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);

  const goodsQuery = useQuery<any[]>({
    queryKey: ['/api/good-types'],
    queryFn: () => getJson<any[]>('/api/good-types'),
  });
  const goodsItems: Record<string, string> = (goodsQuery.data ?? []).reduce(
    (acc: Record<string, string>, g: any) => { acc[String(g.id)] = g.nameEn; return acc; }, {},
  );

  const unitsQuery = useUnitsLookup();
  const unitItems: Record<string, string> = (unitsQuery.data ?? []).reduce(
    (acc: Record<string, string>, u) => { acc[u.code] = u.label; return acc; }, {},
  );

  const submit = useMutation({
    mutationFn: (payload: any) => postJson(`/api/packages/${packageId}/items/bulk`, payload),
    onSuccess: (res: any) => {
      toast.success(`${res?.added ?? 0} item(s) added`);
      qc.invalidateQueries({ queryKey: ['/api/packages', packageId] });
      setRows([emptyRow(), emptyRow(), emptyRow()]);
      onClose();
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Bulk add failed'),
  });

  const update = (idx: number, patch: Partial<Row>) =>
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const handleSubmit = async () => {
    const valid = rows
      .filter(r => r.goodTypeId)
      .map(r => ({
        goodTypeId: Number(r.goodTypeId),
        quantity: Number(r.quantity) || 1,
        unit: r.unit || 'Box',
        unitPrice: r.unitPrice === '' || r.unitPrice == null ? null : Number(r.unitPrice),
        note: r.note || null,
      }));
    if (valid.length === 0) {
      toast.error('Add at least one row with a Good Type');
      return;
    }
    await submit.mutateAsync({ items: valid });
  };

  return (
    <GenericDialog open={open} onClose={onClose} title="Bulk Add Items">
      <Box sx={{ p: 2, minWidth: 720 }}>
        {rows.map((row, idx) => (
          <Stack key={idx} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{ flex: 2 }}>
              <GenericSelectInput name={`gt-${idx}`} title="Good Type" value={row.goodTypeId} items={goodsItems} onChange={(v: any) => update(idx, { goodTypeId: v })} type="" error="" disabled={false} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <GenericNumberInput name={`qty-${idx}`} title="Qty" value={row.quantity} min={1} onChange={(v: any) => update(idx, { quantity: v })} error="" disabled={false} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <GenericSelectInput name={`unit-${idx}`} title="Unit" value={row.unit} items={unitItems} onChange={(v: any) => update(idx, { unit: v ?? 'Box' })} type="" error="" disabled={false} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <GenericNumberInput name={`up-${idx}`} title="Unit Price ($)" value={row.unitPrice} min={0} step={0.01} onChange={(v: any) => update(idx, { unitPrice: v })} error="" disabled={false} />
            </Box>
            <Box sx={{ flex: 2 }}>
              <GenericInput name={`note-${idx}`} title="Note" value={row.note} onChange={(v: any) => update(idx, { note: v })} type="text" error="" disabled={false} />
            </Box>
            <IconButton size="small" disabled={rows.length <= 1} onClick={() => setRows(prev => prev.filter((_, i) => i !== idx))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}

        <Stack direction="row" gap={1} sx={{ mt: 2 }}>
          <Button variant="outlined" size="small" onClick={() => setRows(prev => [...prev, emptyRow()])}>+ Add Row</Button>
          <Button variant="outlined" size="small" onClick={() => setRows(prev => [...prev, emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()])}>+ Add 5 Rows</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="contained" onClick={handleSubmit} disabled={submit.isPending}>Submit</Button>
        </Stack>
      </Box>
    </GenericDialog>
  );
};

export default BulkAddItemsDialog;
