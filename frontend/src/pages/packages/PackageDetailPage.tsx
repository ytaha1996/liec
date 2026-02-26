import { ChangeEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, api, getJson, postJson, putJson, uploadMultipart } from '../../api/client';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import { EnhanceTableHeaderTypes, EnhancedTableColumnType } from '../../components/enhanced-table';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import { PhotoGallery } from '../../components/media/PhotoGallery';

interface Props { id: string; }
const PKG_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = { Draft: { color: '#333', backgroundColor: '#e0e0e0' }, Received: { color: '#fff', backgroundColor: '#0288d1' }, Packed: { color: '#fff', backgroundColor: '#ed6c02' }, ReadyToShip: { color: '#fff', backgroundColor: '#6d4c41' }, Shipped: { color: '#fff', backgroundColor: '#1565c0' }, ArrivedAtDestination: { color: '#fff', backgroundColor: '#2e7d32' }, ReadyForHandout: { color: '#fff', backgroundColor: '#7b1fa2' }, HandedOut: { color: '#fff', backgroundColor: '#616161' }, Cancelled: { color: '#fff', backgroundColor: '#c62828' } };
const TRANSITION_ACTIONS = [{ label: 'Receive', action: 'receive' }, { label: 'Pack', action: 'pack' }, { label: 'Ready To Ship', action: 'ready-to-ship' }, { label: 'Ship', action: 'ship' }, { label: 'Arrive Destination', action: 'arrive-destination' }, { label: 'Ready For Handout', action: 'ready-for-handout' }, { label: 'Handout', action: 'handout' }, { label: 'Cancel', action: 'cancel' }];
const PHOTO_STAGES = ['Receiving', 'Departure', 'Arrival', 'Other'];

export default function PackageDetailPage({ id }: Props) {
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateError | null>(null);
  const [photoStage, setPhotoStage] = useState('Receiving');
  const [meta, setMeta] = useState({ routingCode: '', containerId: '', pricingRateOverridePerKg: '', pricingRateOverridePerM3: '', customerDiscountPercent: '' });
  const [fee, setFee] = useState({ name: '', amount: '' });

  const { data, isLoading, isError } = useQuery<any>({ queryKey: ['/api/packages', id], queryFn: () => getJson<any>(`/api/packages/${id}`) });
  const mediaQuery = useQuery<any[]>({ queryKey: ['/api/packages', id, 'media'], queryFn: () => getJson<any[]>(`/api/packages/${id}/media`) });

  const transition = useMutation({ mutationFn: (action: string) => postJson(`/api/packages/${id}/${action}`), onSuccess: () => { setGate(null); qc.invalidateQueries({ queryKey: ['/api/packages', id] }); }, onError: (e: any) => { const payload = e?.response?.data ?? {}; if (payload.code === 'PHOTO_GATE_FAILED') setGate(payload as GateError); toast.error(payload.message ?? 'Transition failed'); } });
  const saveMeta = useMutation({ mutationFn: () => api.patch(`/api/packages/${id}/metadata`, { routingCode: meta.routingCode || undefined, containerId: meta.containerId ? Number(meta.containerId) : undefined, pricingRateOverridePerKg: meta.pricingRateOverridePerKg ? Number(meta.pricingRateOverridePerKg) : undefined, pricingRateOverridePerM3: meta.pricingRateOverridePerM3 ? Number(meta.pricingRateOverridePerM3) : undefined, customerDiscountPercent: meta.customerDiscountPercent ? Number(meta.customerDiscountPercent) : undefined }).then(r => r.data), onSuccess: () => { toast.success('Metadata updated'); qc.invalidateQueries({ queryKey: ['/api/packages', id] }); } });
  const addFee = useMutation({ mutationFn: () => postJson(`/api/packages/${id}/fees`, { name: fee.name, amount: Number(fee.amount) }), onSuccess: () => { toast.success('Fee added'); setFee({ name: '', amount: '' }); qc.invalidateQueries({ queryKey: ['/api/packages', id] }); } });
  const addItem = useMutation({ mutationFn: (payload: any) => postJson(`/api/packages/${id}/items`, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/packages', id] }) });
  const updateItem = useMutation({ mutationFn: (payload: any) => putJson(`/api/packages/${id}/items/${payload.id}`, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/packages', id] }) });
  const deleteItem = useMutation({ mutationFn: (itemId: number) => api.delete(`/api/packages/${id}/items/${itemId}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/packages', id] }) });
  const upload = useMutation({ mutationFn: (file: File) => { const fd = new FormData(); fd.append('stage', photoStage); fd.append('file', file); return uploadMultipart(`/api/packages/${id}/media`, fd); }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/packages', id, 'media'] }); qc.invalidateQueries({ queryKey: ['/api/packages', id] }); } });

  if (isLoading) return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  if (isError || !data) return <Box sx={{ p: 3 }}><Alert severity="error">Package not found.</Alert></Box>;
  const pkg = data.package ?? data;
  const items: any[] = data.items ?? [];
  const fees: any[] = data.fees ?? [];
  const itemsTableData = items.reduce((acc: Record<string, any>, item: any) => { acc[item.id] = item; return acc; }, {});

  const itemHeaders: EnhanceTableHeaderTypes[] = [
    { id: 'goodId', label: 'Good ID', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'quantity', label: 'Quantity', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'weightKg', label: 'Weight', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'volumeM3', label: 'Volume', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
    { id: 'lineCharge', label: 'Line Charge', type: EnhancedTableColumnType.CURRENCY, numeric: true, disablePadding: false },
    { id: 'actions', label: 'Actions', type: EnhancedTableColumnType.Action, numeric: false, disablePadding: false, actions: [{ icon: null, label: 'Edit Qty+Dims', onClick: (tableId: string) => { const i = itemsTableData[tableId]; const quantity = Number(prompt('Quantity', String(i.quantity)) ?? i.quantity); const weightKg = Number(prompt('Weight', String(i.weightKg)) ?? i.weightKg); const volumeM3 = Number(prompt('Volume', String(i.volumeM3)) ?? i.volumeM3); updateItem.mutate({ id: i.id, goodId: i.goodId, quantity, weightKg, volumeM3 }); }, hidden: () => false }, { icon: null, label: 'Delete', onClick: (tableId: string) => deleteItem.mutate(itemsTableData[tableId].id), hidden: () => false }] }
  ];

  return <Box><PageTitleWrapper><Stack direction="row" alignItems="center" gap={2} flexWrap="wrap"><Typography variant="h3">Package #{id}</Typography><Chip label={pkg.status} size="small" sx={{ backgroundColor: PKG_STATUS_CHIPS[pkg.status]?.backgroundColor ?? '#e0e0e0', color: PKG_STATUS_CHIPS[pkg.status]?.color ?? '#333' }} /></Stack></PageTitleWrapper>
  <Box sx={{ px: 3, pb: 3 }}>
    <MainPageSection title="Status Transitions">{gate?.code === 'PHOTO_GATE_FAILED' && <Alert severity="error" sx={{ mb: 2 }}>{gate.message}<Table size="small"><TableHead><TableRow><TableCell>Package</TableCell><TableCell>Stage</TableCell><TableCell>Link</TableCell></TableRow></TableHead><TableBody>{(gate.missing ?? []).map(m => <TableRow key={`${m.packageId}-${m.stage}`}><TableCell>{m.packageId}</TableCell><TableCell>{m.stage}</TableCell><TableCell><Button component={Link} to={`/packages/${m.packageId}`} size="small">Open</Button></TableCell></TableRow>)}</TableBody></Table></Alert>}<Stack direction="row" gap={1} flexWrap="wrap">{TRANSITION_ACTIONS.map(({ label, action }) => <Button key={action} variant="outlined" onClick={() => transition.mutate(action)}>{label}</Button>)}</Stack></MainPageSection>
    <MainPageSection title="Routing / Pricing Metadata"><Stack direction="row" gap={2} flexWrap="wrap"><TextField label="Routing Code" size="small" value={meta.routingCode} onChange={e => setMeta({ ...meta, routingCode: e.target.value })} placeholder={pkg.routingCode ?? ''} /><TextField label="Container Id" size="small" value={meta.containerId} onChange={e => setMeta({ ...meta, containerId: e.target.value })} placeholder={pkg.containerId?.toString() ?? ''} /><TextField label="Override Rate/Kg" size="small" value={meta.pricingRateOverridePerKg} onChange={e => setMeta({ ...meta, pricingRateOverridePerKg: e.target.value })} /><TextField label="Override Rate/M3" size="small" value={meta.pricingRateOverridePerM3} onChange={e => setMeta({ ...meta, pricingRateOverridePerM3: e.target.value })} /><TextField label="Discount %" size="small" value={meta.customerDiscountPercent} onChange={e => setMeta({ ...meta, customerDiscountPercent: e.target.value })} /><Button variant="contained" onClick={() => saveMeta.mutate()}>Save</Button></Stack></MainPageSection>
    <MainPageSection title="Pricing Snapshot"><Card variant="outlined"><CardContent><Typography>Subtotal: {pkg.subtotalAmount}</Typography><Typography>Fees: {pkg.additionalFeesAmount}</Typography><Typography>Discount %: {pkg.customerDiscountPercent}</Typography><Typography>Final Charge: {pkg.chargeAmount} {pkg.currency}</Typography></CardContent></Card></MainPageSection>
    <MainPageSection title="Items"><Stack direction="row" gap={1} sx={{ mb: 2 }}><Button variant="outlined" onClick={() => { const goodId = Number(prompt('Good ID', '1')); const quantity = Number(prompt('Qty', '1')); const weightKg = Number(prompt('Weight', '1')); const volumeM3 = Number(prompt('Volume', '1')); addItem.mutate({ goodId, quantity, weightKg, volumeM3 }); }}>Add Item</Button></Stack><EnhancedTable title="Package Items" header={itemHeaders} data={itemsTableData} defaultOrder="goodId" /></MainPageSection>
    <MainPageSection title="Additional Fees"><Stack direction="row" gap={2}><TextField size="small" label="Name" value={fee.name} onChange={e => setFee({ ...fee, name: e.target.value })} /><TextField size="small" label="Amount" value={fee.amount} onChange={e => setFee({ ...fee, amount: e.target.value })} /><Button variant="outlined" onClick={() => addFee.mutate()}>Add Fee</Button></Stack><Box sx={{ mt: 1 }}>{fees.map((f: any) => <Typography key={f.id}>{f.name}: {f.amount}</Typography>)}</Box></MainPageSection>
    <MainPageSection title="Upload Photo"><Stack direction="row" gap={2}><TextField select label="Stage" size="small" value={photoStage} onChange={(e) => setPhotoStage(e.target.value)}>{PHOTO_STAGES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField><Button component="label" variant="outlined">Upload<input hidden type="file" onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) upload.mutate(file); }} /></Button></Stack></MainPageSection>
    <MainPageSection title="Photo Gallery"><PhotoGallery media={mediaQuery.data ?? []} /></MainPageSection>
  </Box></Box>;
}
