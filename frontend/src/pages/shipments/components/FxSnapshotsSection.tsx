import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Alert, Box, Button, Stack } from '@mui/material';
import { Icon } from '@iconify/react';
import { api, getJson, putJson, parseApiError } from '../../../api/client';
import EnhancedTable from '../../../components/enhanced-table/EnhancedTable';
import {
  EnhancedTableColumnType,
  IEnhancedTextHeader,
  EnhancedTableActionHeader,
  EnhanceTableHeaderTypes,
} from '../../../components/enhanced-table';
import GenericDialog from '../../../components/GenericDialog/GenericDialog';
import DynamicFormWidget from '../../../components/dynamic-widget/DynamicFormWidget';
import { DynamicField, IDynamicNumberField, IDynamicSelectField } from '../../../components/dynamic-widget';
import MainPageSection from '../../../components/layout-components/main-layout/MainPageSection';
import { useCurrenciesLookup } from '../../../api/currencies';
import { OpenConfirmation } from '../../../redux/confirmation/confirmationReducer';
import { useAppDispatch } from '../../../redux/hooks';

interface Snapshot {
  id: number;
  shipmentId: number;
  event: 'Departed' | 'Arrived' | 'Manual';
  currencyCode: string;
  rateToBase: number;
  capturedAt: string;
}

interface Props {
  shipmentId: string;
  canManage: boolean;
}

const FxSnapshotsSection = ({ shipmentId, canManage }: Props) => {
  const qc = useQueryClient();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<string | null>(null);
  const [defaultRate, setDefaultRate] = useState<string>('');

  const { data: snapshots = [] } = useQuery<Snapshot[]>({
    queryKey: ['/api/shipments', shipmentId, 'fx-snapshots'],
    queryFn: () => getJson<Snapshot[]>(`/api/shipments/${shipmentId}/fx-snapshots`),
  });

  const currenciesQuery = useCurrenciesLookup();
  const currencyItems: Record<string, string> = (currenciesQuery.data ?? []).reduce(
    (acc: Record<string, string>, c) => { acc[c.code] = c.code; return acc; }, {});

  const upsert = useMutation({
    mutationFn: (payload: { code: string; rate: number }) =>
      putJson(`/api/shipments/${shipmentId}/fx-snapshots/${payload.code}`, { rateToBase: payload.rate }),
    onSuccess: () => {
      toast.success('FX rate override saved');
      qc.invalidateQueries({ queryKey: ['/api/shipments', shipmentId, 'fx-snapshots'] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Save failed'),
  });

  const remove = useMutation({
    mutationFn: (code: string) => api.delete(`/api/shipments/${shipmentId}/fx-snapshots/${code}`).then((r) => r.data),
    onSuccess: () => {
      toast.success('Manual override removed');
      qc.invalidateQueries({ queryKey: ['/api/shipments', shipmentId, 'fx-snapshots'] });
    },
    onError: (e: any) => toast.error(parseApiError(e).message ?? 'Delete failed'),
  });

  const tableData = snapshots.reduce((acc: Record<string, any>, s) => {
    acc[s.id] = {
      ...s,
      capturedAtDisplay: new Date(s.capturedAt).toLocaleString(),
      rateDisplay: Number(s.rateToBase).toString(),
    };
    return acc;
  }, {});

  const header: EnhanceTableHeaderTypes[] = [
    { id: 'event', label: 'Event', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'currencyCode', label: 'Currency', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'rateDisplay', label: 'Rate to Base', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    { id: 'capturedAtDisplay', label: 'Captured At', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false } as IEnhancedTextHeader,
    {
      id: 'actions',
      label: 'Actions',
      type: EnhancedTableColumnType.Action,
      numeric: false,
      disablePadding: false,
      actions: [
        {
          icon: <Icon icon="mdi:pencil" />,
          label: 'Edit',
          onClick: (id: string) => {
            const row = snapshots.find((s) => String(s.id) === id);
            if (!row) return;
            setDefaultCurrency(row.currencyCode);
            setDefaultRate(String(row.rateToBase));
            setOpen(true);
          },
          hidden: (row: Record<string, any>) => !canManage || row?.event !== 'Manual',
        },
        {
          icon: <Icon icon="mdi:delete" />,
          label: 'Delete',
          onClick: (id: string) => {
            const row = snapshots.find((s) => String(s.id) === id);
            if (!row) return;
            dispatch(OpenConfirmation({
              open: true,
              title: 'Remove Override',
              message: `Remove the manual override for ${row.currencyCode}? The shipment will revert to the auto-captured Departed snapshot (or live rates).`,
              onSubmit: () => remove.mutate(row.currencyCode),
            }));
          },
          hidden: (row: Record<string, any>) => !canManage || row?.event !== 'Manual',
        },
      ],
    } as EnhancedTableActionHeader,
  ];

  const fields = {
    currencyCode: {
      type: DynamicField.SELECT,
      name: 'currencyCode',
      title: 'Currency',
      required: true,
      disabled: false,
      items: currencyItems,
      value: defaultCurrency ?? '',
    } as IDynamicSelectField,
    rateToBase: {
      type: DynamicField.NUMBER,
      name: 'rateToBase',
      title: 'Rate to Base (1 currency unit = ? base)',
      required: true,
      disabled: false,
      value: defaultRate,
      min: 0,
      step: 0.000001,
    } as IDynamicNumberField,
  };

  const handleSubmit = async (values: Record<string, any>): Promise<boolean> => {
    try {
      await upsert.mutateAsync({ code: values.currencyCode, rate: Number(values.rateToBase) });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <MainPageSection title="FX Snapshots">
      <Alert severity="info" sx={{ mb: 1.5 }}>
        Manual overrides take precedence over auto-captured Departed/Arrived snapshots. Delete an override to revert to auto-captured rates.
      </Alert>
      {canManage && (
        <Stack direction="row" gap={1} sx={{ mb: 2 }}>
          <Button variant="contained" size="small" onClick={() => { setDefaultCurrency(null); setDefaultRate(''); setOpen(true); }}>
            Override Rate
          </Button>
        </Stack>
      )}
      {snapshots.length === 0 ? (
        <Box sx={{ py: 2, color: 'text.secondary' }}>
          No FX snapshots yet. Snapshots are captured automatically on Depart and Arrive.
        </Box>
      ) : (
        <EnhancedTable header={header} data={tableData} title="FX Snapshots" defaultOrder="event" />
      )}
      <GenericDialog open={open} onClose={() => setOpen(false)} title="Override FX Rate">
        <DynamicFormWidget title="" drawerMode fields={fields} onSubmit={handleSubmit} />
      </GenericDialog>
    </MainPageSection>
  );
};

export default FxSnapshotsSection;
