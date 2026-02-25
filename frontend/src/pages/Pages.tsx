import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { api, getJson, parseApiError, postJson, putJson, uploadMultipart } from '../api/client';
import { FormModal } from '../components/common/Common';
import { FormDateInput, FormSwitch, FormTextField } from '../components/forms/Fields';
import { PhotoGallery } from '../components/media/PhotoGallery';
import { GenericTable } from '../components/reusable/GenericTable';
import { GenericField } from '../components/reusable/types';

type AnyObj = Record<string, any>;
const Loading = () => <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;

function useToast() {
  const [message, setMessage] = useState('');
  return {
    show: (m: string) => setMessage(m),
    node: <Snackbar open={!!message} autoHideDuration={3000} onClose={() => setMessage('')} message={message} />
  };
}

function GateMissingTable({ gate }: { gate: any }) {
  return (
    <Table size='small'>
      <TableHead>
        <TableRow><TableCell>PackageId</TableCell><TableCell>CustomerRef</TableCell><TableCell>Stage</TableCell><TableCell>Link</TableCell></TableRow>
      </TableHead>
      <TableBody>
        {(gate?.missing ?? []).map((m: any) => (
          <TableRow key={`${m.packageId}-${m.stage}`}>
            <TableCell>{m.packageId}</TableCell><TableCell>{m.customerRef}</TableCell><TableCell>{m.stage}</TableCell>
            <TableCell><Button component={Link} to={`/packages/${m.packageId}`}>Open</Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CrudPage({ title, endpoint, fields, rowActions }: { title: string; endpoint: string; fields: GenericField<AnyObj>[]; rowActions?: (row: AnyObj) => JSX.Element }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<AnyObj | null>(null);
  const toast = useToast();

  const schema = useMemo(
    () => z.object(Object.fromEntries(fields.map((f) => [String(f.key), f.required ? z.any().refine((v) => v !== '' && v !== null && v !== undefined, `${f.label} is required`) : z.any().optional()]))),
    [fields]
  );
  const form = useForm<AnyObj>({ resolver: zodResolver(schema), defaultValues: {} });
  const { data = [], isLoading } = useQuery({ queryKey: [endpoint], queryFn: () => getJson<any[]>(endpoint) });

  const save = useMutation({
    mutationFn: (payload: AnyObj) => edit?.id ? putJson(`${endpoint}/${edit.id}`, payload) : postJson(endpoint, payload),
    onSuccess: () => {
      toast.show(`${title} saved`);
      setOpen(false);
      setEdit(null);
      form.reset({});
      qc.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (e) => toast.show(parseApiError(e).message ?? 'Save failed')
  });

  return (
    <Container>
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
        <Typography variant='h4'>{title}</Typography>
        <Button variant='contained' onClick={() => { setEdit(null); form.reset({}); setOpen(true); }}>Create</Button>
      </Stack>
      {isLoading ? <Loading /> : <GenericTable rows={data} columns={[{ key: 'id', header: 'ID', type: 'number' }, ...fields.map((f) => ({ key: String(f.key), header: f.label }))]} actions={[{ label: 'Edit', onClick: (row) => { setEdit(row); form.reset(row); setOpen(true); } }]} />}

      {rowActions && !isLoading && (
        <Paper sx={{ mt: 2, p: 2 }}>
          <Typography variant='subtitle2' sx={{ mb: 1 }}>Detail / Actions</Typography>
          <Stack gap={1}>{data.map((r) => <Box key={r.id}>{rowActions(r)}</Box>)}</Stack>
        </Paper>
      )}

      <FormModal open={open} onClose={() => setOpen(false)} title={`${title} Form`}>
        <Stack gap={1} sx={{ mt: 1 }}>
          {fields.map((f) => {
            const key = String(f.key);
            if (f.type === 'date') return <FormDateInput key={key} name={key} label={f.label} control={form.control} />;
            if (f.type === 'switch') return <FormSwitch key={key} name={key} label={f.label} control={form.control} />;
            return <FormTextField key={key} name={key} label={f.label} control={form.control} />;
          })}
          <Button variant='contained' onClick={form.handleSubmit((v) => save.mutate(v))}>Save</Button>
        </Stack>
      </FormModal>
      {toast.node}
    </Container>
  );
}

export const LoginPage = () => {
  const [email, setEmail] = useState('admin@local');
  const [password, setPassword] = useState('Admin123!');
  const [msg, setMsg] = useState('');
  const login = useMutation({ mutationFn: () => postJson<{ token: string }>('/api/auth/login', { email, password }), onSuccess: (r) => { localStorage.setItem('token', r.token); setMsg('Logged in'); }, onError: (e) => setMsg(parseApiError(e).message ?? 'Login failed') });
  return <Container><Typography variant='h4'>Admin Login</Typography>{msg && <Alert severity={msg === 'Logged in' ? 'success' : 'error'}>{msg}</Alert>}<Stack gap={1} sx={{ mt: 2, maxWidth: 420 }}><TextField label='Email' value={email} onChange={(e) => setEmail(e.target.value)} /><TextField label='Password' type='password' value={password} onChange={(e) => setPassword(e.target.value)} /><Button variant='contained' onClick={() => login.mutate()}>Login</Button></Stack></Container>;
};

export const DashboardPage = () => <Container><Typography variant='h4'>Dashboard</Typography><Typography>Admin operations console for shipments, packages, media and messaging.</Typography></Container>;

function CustomerActions({ customer }: { customer: AnyObj }) {
  const [shipmentId, setShipmentId] = useState('');
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const consentForm = useForm({ defaultValues: { optInStatusUpdates: customer.whatsAppConsent?.optInStatusUpdates ?? true, optInDeparturePhotos: customer.whatsAppConsent?.optInDeparturePhotos ?? true, optInArrivalPhotos: customer.whatsAppConsent?.optInArrivalPhotos ?? true, optedOutAt: customer.whatsAppConsent?.optedOutAt ?? null } });

  const patchConsent = useMutation({ mutationFn: (payload: AnyObj) => api.patch(`/api/customers/${customer.id}/whatsapp-consent`, payload).then((r) => r.data), onSuccess: () => { toast.show('Consent updated'); qc.invalidateQueries({ queryKey: ['/api/customers'] }); setOpen(false); }, onError: (e) => toast.show(parseApiError(e).message ?? 'Consent update failed') });
  const send = useMutation({ mutationFn: (kind: 'status' | 'departure' | 'arrival') => { if (!shipmentId) throw new Error('shipmentId is required'); const endpoint = kind === 'status' ? `/api/customers/${customer.id}/whatsapp/status?shipmentId=${shipmentId}` : `/api/customers/${customer.id}/whatsapp/photos/${kind}?shipmentId=${shipmentId}`; return postJson(endpoint); }, onSuccess: () => toast.show('WhatsApp action sent'), onError: (e) => toast.show(parseApiError(e).message ?? 'Send failed') });

  return <Paper sx={{ p: 1 }}><Stack direction='row' gap={1} alignItems='center' flexWrap='wrap'><Button component={Link} to={`/customers/${customer.id}`}>Open Detail</Button><TextField size='small' label='Shipment Id' value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} /><Button size='small' onClick={() => send.mutate('status')}>Status</Button><Button size='small' onClick={() => send.mutate('departure')}>Departure</Button><Button size='small' onClick={() => send.mutate('arrival')}>Arrival</Button><Button size='small' variant='outlined' onClick={() => setOpen(true)}>Consent</Button></Stack><Dialog open={open} onClose={() => setOpen(false)} fullWidth><DialogTitle>Edit Consent</DialogTitle><DialogContent><Stack gap={1} sx={{ mt: 1 }}><FormSwitch name='optInStatusUpdates' control={consentForm.control} label='Status updates' /><FormSwitch name='optInDeparturePhotos' control={consentForm.control} label='Departure photos' /><FormSwitch name='optInArrivalPhotos' control={consentForm.control} label='Arrival photos' /><FormDateInput name='optedOutAt' control={consentForm.control} label='Opted out at' /></Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)}>Close</Button><Button variant='contained' onClick={consentForm.handleSubmit((v) => patchConsent.mutate(v))}>Save</Button></DialogActions></Dialog>{toast.node}</Paper>;
}

export const CustomersPage = () => <Container><CrudPage title='Customers' endpoint='/api/customers' fields={[{ key: 'customerRef', label: 'CustomerRef', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'primaryPhone', label: 'Phone', required: true }, { key: 'email', label: 'Email' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} rowActions={(r) => <CustomerActions customer={r} />} /><GroupExportCard /></Container>;

export const CustomerDetailPage = ({ id }: { id: string }) => {
  const { data, isLoading } = useQuery({ queryKey: ['customer', id], queryFn: () => getJson<any>(`/api/customers/${id}`) });
  return <Container><Typography variant='h4'>Customer {id}</Typography>{isLoading ? <Loading /> : <><Paper sx={{ p: 2, mb: 2 }}><Typography>Name: {data?.name}</Typography><Typography>CustomerRef: {data?.customerRef}</Typography><Typography>Phone: {data?.primaryPhone}</Typography><Typography>Email: {data?.email ?? '-'}</Typography></Paper>{data ? <CustomerActions customer={data} /> : <Alert severity='info'>Customer not found</Alert>}</>}</Container>;
};

export const ShipmentsPage = () => {
  const qc = useQueryClient();
  const toast = useToast();
  const schema = z.object({ originWarehouseId: z.coerce.number().int().positive(), destinationWarehouseId: z.coerce.number().int().positive(), plannedDepartureDate: z.string().min(1), plannedArrivalDate: z.string().min(1) });
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { originWarehouseId: '', destinationWarehouseId: '', plannedDepartureDate: '', plannedArrivalDate: '' } as any });
  const { data = [], isLoading } = useQuery({ queryKey: ['shipments'], queryFn: () => getJson<any[]>('/api/shipments') });
  const create = useMutation({ mutationFn: (payload: AnyObj) => postJson('/api/shipments', payload), onSuccess: () => { toast.show('Shipment created'); form.reset(); qc.invalidateQueries({ queryKey: ['shipments'] }); }, onError: (e) => toast.show(parseApiError(e).message ?? 'Create failed') });

  return <Container><Typography variant='h4'>Shipments</Typography><Paper sx={{ p: 2, my: 2 }}><Typography variant='subtitle1'>Create Shipment</Typography><Stack direction='row' gap={1} flexWrap='wrap'><FormTextField name='originWarehouseId' control={form.control} label='Origin Warehouse Id' /><FormTextField name='destinationWarehouseId' control={form.control} label='Destination Warehouse Id' /><FormDateInput name='plannedDepartureDate' control={form.control} label='Planned Departure' /><FormDateInput name='plannedArrivalDate' control={form.control} label='Planned Arrival' /><Button variant='contained' onClick={form.handleSubmit((v) => create.mutate(v))}>Create</Button></Stack></Paper>{isLoading ? <Loading /> : <GenericTable rows={data} columns={[{ key: 'id', header: 'ID', type: 'number' }, { key: 'refCode', header: 'RefCode' }, { key: 'status', header: 'Status' }]} actions={[{ label: 'Details', onClick: (r) => window.location.assign(`/shipments/${r.id}`) }]} />}{toast.node}</Container>;
};

export const ShipmentDetailPage = ({ id }: { id: string }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [gate, setGate] = useState<any>(null);
  const { data, isLoading } = useQuery({ queryKey: ['shipment', id], queryFn: () => getJson<any>(`/api/shipments/${id}`) });
  const media = useQuery({ queryKey: ['shipment-media', id], queryFn: () => getJson<any[]>(`/api/shipments/${id}/media`) });
  const packagesQ = useQuery({ queryKey: ['packages'], queryFn: () => getJson<any[]>('/api/packages') });
  const shipmentPackages = (packagesQ.data ?? []).filter((p) => String(p.shipmentId) === id);

  const move = useMutation({ mutationFn: (x: string) => postJson(`/api/shipments/${id}/${x}`), onSuccess: () => { setGate(null); toast.show('Shipment updated'); qc.invalidateQueries({ queryKey: ['shipment', id] }); }, onError: (e) => { const p = parseApiError(e); setGate(p); toast.show(p.message ?? 'Transition failed'); } });
  const sendBulk = useMutation({ mutationFn: (kind: 'status' | 'departure' | 'arrival') => postJson(kind === 'status' ? `/api/shipments/${id}/whatsapp/status/bulk` : `/api/shipments/${id}/whatsapp/photos/${kind}/bulk`), onSuccess: () => toast.show('Bulk campaign created'), onError: (e) => toast.show(parseApiError(e).message ?? 'Send failed') });

  return <Container><Typography variant='h4'>Shipment {id}</Typography>{isLoading ? <Loading /> : <><Paper sx={{ p: 2, mb: 2 }}><Typography>Status: {data?.status}</Typography><Typography>RefCode: {data?.refCode}</Typography></Paper><Stack direction='row' gap={1} sx={{ my: 2, flexWrap: 'wrap' }}>{['schedule', 'ready-to-depart', 'depart', 'arrive', 'close', 'cancel'].map((x) => <Button key={x} onClick={() => move.mutate(x)}>{x}</Button>)}</Stack><Stack direction='row' gap={1} sx={{ my: 2, flexWrap: 'wrap' }}><Button variant='outlined' onClick={() => sendBulk.mutate('status')}>WhatsApp Status Bulk</Button><Button variant='outlined' onClick={() => sendBulk.mutate('departure')}>WhatsApp Departure Bulk</Button><Button variant='outlined' onClick={() => sendBulk.mutate('arrival')}>WhatsApp Arrival Bulk</Button></Stack>{gate?.code === 'PHOTO_GATE_FAILED' && <Alert severity='error'>{gate.message}<GateMissingTable gate={gate} /></Alert>}<Paper sx={{ p: 2, mb: 2 }}><Typography variant='subtitle1'>Packages / Photo Flags</Typography><GenericTable rows={shipmentPackages} columns={[{ key: 'id', header: 'Package', type: 'number' }, { key: 'customerId', header: 'Customer', type: 'number' }, { key: 'status', header: 'Status' }, { key: 'hasDeparturePhotos', header: 'Departure', type: 'boolean' }, { key: 'hasArrivalPhotos', header: 'Arrival', type: 'boolean' }]} actions={[{ label: 'Open', onClick: (r) => window.location.assign(`/packages/${r.id}`) }]} /></Paper><PhotoGallery media={media.data ?? []} /></>}{toast.node}</Container>;
};

export const PackagesPage = () => {
  const { data = [], isLoading } = useQuery({ queryKey: ['packages'], queryFn: () => getJson<any[]>('/api/packages') });
  return <Container><Typography variant='h4'>Packages</Typography>{isLoading ? <Loading /> : <GenericTable rows={data} columns={[{ key: 'id', header: 'ID', type: 'number' }, { key: 'shipmentId', header: 'Shipment', type: 'number' }, { key: 'customerId', header: 'Customer', type: 'number' }, { key: 'status', header: 'Status' }, { key: 'hasDeparturePhotos', header: 'Departure', type: 'boolean' }, { key: 'hasArrivalPhotos', header: 'Arrival', type: 'boolean' }]} actions={[{ label: 'Details', onClick: (r) => window.location.assign(`/packages/${r.id}`) }]} />}</Container>;
};

export const PackageDetailPage = ({ id }: { id: string }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const [stage, setStage] = useState('Receiving');
  const [gate, setGate] = useState<any>(null);
  const [item, setItem] = useState({ goodId: '', quantity: '', weightKg: '', volumeM3: '' });
  const { data, isLoading } = useQuery({ queryKey: ['pkg', id], queryFn: () => getJson<any>(`/api/packages/${id}`) });
  const media = useQuery({ queryKey: ['pkg-media', id], queryFn: () => getJson<any[]>(`/api/packages/${id}/media`) });

  const transition = useMutation({ mutationFn: (action: string) => postJson(`/api/packages/${id}/${action}`), onSuccess: () => { setGate(null); toast.show('Package updated'); qc.invalidateQueries({ queryKey: ['pkg', id] }); }, onError: (e) => { const p = parseApiError(e); setGate(p); toast.show(p.message ?? 'Transition failed'); } });
  const upload = useMutation({ mutationFn: (file: File) => { const fd = new FormData(); fd.append('stage', stage); fd.append('file', file); return uploadMultipart(`/api/packages/${id}/media`, fd); }, onSuccess: () => { toast.show('Photo uploaded'); qc.invalidateQueries({ queryKey: ['pkg-media', id] }); qc.invalidateQueries({ queryKey: ['pkg', id] }); } });
  const addItem = useMutation({ mutationFn: () => postJson(`/api/packages/${id}/items`, { goodId: Number(item.goodId), quantity: Number(item.quantity), weightKg: Number(item.weightKg), volumeM3: Number(item.volumeM3) }), onSuccess: () => { toast.show('Item added'); setItem({ goodId: '', quantity: '', weightKg: '', volumeM3: '' }); qc.invalidateQueries({ queryKey: ['pkg', id] }); }, onError: (e) => toast.show(parseApiError(e).message ?? 'Add item failed') });
  const updateItem = useMutation({ mutationFn: (i: AnyObj) => putJson(`/api/packages/${id}/items/${i.id}`, { goodId: i.goodId, quantity: i.quantity, weightKg: i.weightKg, volumeM3: i.volumeM3 }), onSuccess: () => { toast.show('Item updated'); qc.invalidateQueries({ queryKey: ['pkg', id] }); }, onError: (e) => toast.show(parseApiError(e).message ?? 'Update failed') });
  const deleteItem = useMutation({ mutationFn: (itemId: number) => api.delete(`/api/packages/${id}/items/${itemId}`), onSuccess: () => { toast.show('Item deleted'); qc.invalidateQueries({ queryKey: ['pkg', id] }); }, onError: (e) => toast.show(parseApiError(e).message ?? 'Delete failed') });

  return <Container><Typography variant='h4'>Package {id}</Typography>{isLoading ? <Loading /> : <>{gate?.code === 'PHOTO_GATE_FAILED' && <Alert severity='error'>{gate.message}<GateMissingTable gate={gate} /></Alert>}<Stack direction='row' gap={1} sx={{ my: 2, flexWrap: 'wrap' }}>{['receive', 'pack', 'ready-to-ship', 'ship', 'arrive-destination', 'ready-for-handout', 'handout', 'cancel'].map((a) => <Button key={a} onClick={() => transition.mutate(a)}>{a}</Button>)}</Stack><Paper sx={{ p: 2, mb: 2 }}><Typography variant='subtitle1'>Packing Items</Typography><Stack direction='row' gap={1} flexWrap='wrap'><TextField label='GoodId' size='small' value={item.goodId} onChange={(e) => setItem((s) => ({ ...s, goodId: e.target.value }))} /><TextField label='Qty' size='small' value={item.quantity} onChange={(e) => setItem((s) => ({ ...s, quantity: e.target.value }))} /><TextField label='WeightKg' size='small' value={item.weightKg} onChange={(e) => setItem((s) => ({ ...s, weightKg: e.target.value }))} /><TextField label='VolumeM3' size='small' value={item.volumeM3} onChange={(e) => setItem((s) => ({ ...s, volumeM3: e.target.value }))} /><Button onClick={() => addItem.mutate()} variant='contained'>Add Item</Button></Stack><Box sx={{ mt: 2 }}><GenericTable rows={data?.items ?? []} columns={[{ key: 'id', header: 'Id', type: 'number' }, { key: 'goodId', header: 'GoodId', type: 'number' }, { key: 'quantity', header: 'Qty', type: 'number' }, { key: 'weightKg', header: 'WeightKg', type: 'number' }, { key: 'volumeM3', header: 'VolumeM3', type: 'number' }, { key: 'lineCharge', header: 'LineCharge', type: 'number' }]} actions={[{ label: 'Re-save', onClick: (r) => updateItem.mutate(r) }, { label: 'Delete', onClick: (r) => deleteItem.mutate(r.id) }]} /></Box></Paper><Paper sx={{ p: 2, mb: 2 }}><Typography variant='subtitle1'>Pricing Snapshot</Typography><Typography>Weight: {data?.package?.totalWeightKg}</Typography><Typography>Volume: {data?.package?.totalVolumeM3}</Typography><Typography>Rate/Kg: {data?.package?.appliedRatePerKg}</Typography><Typography>Rate/M3: {data?.package?.appliedRatePerM3}</Typography><Typography>Charge: {data?.package?.chargeAmount} {data?.package?.currency}</Typography></Paper><Paper sx={{ p: 2, mb: 2 }}><Typography variant='subtitle1'>Upload Photo</Typography><Stack direction='row' gap={1} alignItems='center'><TextField select value={stage} onChange={(e) => setStage(e.target.value)} size='small'><MenuItem value='Receiving'>Receiving</MenuItem><MenuItem value='Departure'>Departure</MenuItem><MenuItem value='Arrival'>Arrival</MenuItem><MenuItem value='Other'>Other</MenuItem></TextField><Button component='label' variant='outlined'>Choose & Upload<input hidden type='file' onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) upload.mutate(file); }} /></Button></Stack></Paper><PhotoGallery media={media.data ?? []} /></>}</Container>;
};

export const MessagingLogsPage = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: () => getJson<any[]>('/api/whatsapp/campaigns') });
  const details = useQuery({ queryKey: ['campaign', selected], queryFn: () => getJson<any[]>(`/api/whatsapp/campaigns/${selected}`), enabled: !!selected });
  return <Container><Typography variant='h4'>Messaging Logs</Typography>{isLoading ? <Loading /> : <GenericTable rows={data} columns={[{ key: 'id', header: 'ID', type: 'number' }, { key: 'type', header: 'Type' }, { key: 'shipmentId', header: 'Shipment', type: 'number' }, { key: 'recipientCount', header: 'Recipients', type: 'number' }, { key: 'completed', header: 'Completed', type: 'boolean' }]} actions={[{ label: 'View Logs', onClick: (r) => setSelected(r.id) }]} />}<Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth='md'><DialogTitle>Delivery Logs</DialogTitle><DialogContent>{details.isLoading ? <Loading /> : <GenericTable rows={details.data ?? []} columns={[{ key: 'customerId', header: 'CustomerId', type: 'number' }, { key: 'phone', header: 'Phone' }, { key: 'result', header: 'Result' }, { key: 'failureReason', header: 'Reason' }, { key: 'sentAt', header: 'SentAt', type: 'date' }]} />}</DialogContent></Dialog></Container>;
};

export const GroupExportCard = () => {
  const toast = useToast();
  const m = useMutation({ mutationFn: (format: 'csv' | 'vcf') => postJson<{ publicUrl: string }>('/api/exports/group-helper', { format }), onSuccess: (r) => { window.open(r.publicUrl, '_blank'); toast.show('Export generated'); }, onError: (e) => toast.show(parseApiError(e).message ?? 'Export failed') });
  return <Box sx={{ mt: 2 }}><Alert severity='warning'>WhatsApp groups reveal phone numbers to all members.</Alert><Stack direction='row' gap={1} sx={{ mt: 1 }}><Button onClick={() => m.mutate('csv')}>Export CSV</Button><Button onClick={() => m.mutate('vcf')}>Export VCF</Button></Stack>{toast.node}</Box>;
};

export const WarehousesPage = () => <CrudPage title='Warehouses' endpoint='/api/warehouses' fields={[{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'city', label: 'City', required: true }, { key: 'country', label: 'Country', required: true }, { key: 'maxWeightKg', label: 'MaxWeightKg', required: true }, { key: 'maxVolumeM3', label: 'MaxVolumeM3', required: true }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;
export const GoodTypesPage = () => <CrudPage title='GoodTypes' endpoint='/api/good-types' fields={[{ key: 'nameEn', label: 'Name EN', required: true }, { key: 'nameAr', label: 'Name AR', required: true }, { key: 'ratePerKg', label: 'Rate/Kg' }, { key: 'ratePerM3', label: 'Rate/M3' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;
export const GoodsPage = () => <CrudPage title='Goods' endpoint='/api/goods' fields={[{ key: 'goodTypeId', label: 'GoodTypeId', required: true }, { key: 'nameEn', label: 'Name EN', required: true }, { key: 'nameAr', label: 'Name AR', required: true }, { key: 'canBurn', label: 'CanBurn', type: 'switch' }, { key: 'canBreak', label: 'CanBreak', type: 'switch' }, { key: 'unit', label: 'Unit', required: true }, { key: 'ratePerKgOverride', label: 'Rate/Kg Override' }, { key: 'ratePerM3Override', label: 'Rate/M3 Override' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;

export const PricingConfigsPage = () => {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [], isLoading } = useQuery({ queryKey: ['/api/pricing-configs'], queryFn: () => getJson<any[]>('/api/pricing-configs') });
  const activate = useMutation({ mutationFn: (id: number) => postJson(`/api/pricing-configs/${id}/activate`), onSuccess: () => { toast.show('Activated'); qc.invalidateQueries({ queryKey: ['/api/pricing-configs'] }); } });
  const retire = useMutation({ mutationFn: (id: number) => postJson(`/api/pricing-configs/${id}/retire`), onSuccess: () => { toast.show('Retired'); qc.invalidateQueries({ queryKey: ['/api/pricing-configs'] }); } });

  return <Container><CrudPage title='Pricing Configs' endpoint='/api/pricing-configs' fields={[{ key: 'name', label: 'Name', required: true }, { key: 'currency', label: 'Currency', required: true }, { key: 'effectiveFrom', label: 'Effective From', type: 'date', required: true }, { key: 'effectiveTo', label: 'Effective To', type: 'date' }, { key: 'defaultRatePerKg', label: 'Rate/Kg', required: true }, { key: 'defaultRatePerM3', label: 'Rate/M3', required: true }, { key: 'status', label: 'Status', required: true }]} /><Paper sx={{ p: 2, mt: 2 }}><Typography variant='subtitle2'>Activate/Retire</Typography>{isLoading ? <Loading /> : data.map((cfg) => <Stack direction='row' gap={1} key={cfg.id}><Typography sx={{ minWidth: 240 }}>#{cfg.id} {cfg.name} ({cfg.status})</Typography><Button size='small' onClick={() => activate.mutate(cfg.id)}>Activate</Button><Button size='small' onClick={() => retire.mutate(cfg.id)}>Retire</Button></Stack>)}</Paper>{toast.node}</Container>;
};

export const SuppliersPage = () => <CrudPage title='Suppliers' endpoint='/api/suppliers' fields={[{ key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;

export const SupplyOrdersPage = () => {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [], isLoading } = useQuery({ queryKey: ['/api/supply-orders'], queryFn: () => getJson<any[]>('/api/supply-orders') });
  const transition = useMutation({ mutationFn: ({ id, action }: { id: number; action: string }) => postJson(`/api/supply-orders/${id}/${action}`, action === 'cancel' ? { status: 'Cancelled', cancelReason: 'Cancelled from UI' } : undefined), onSuccess: () => { toast.show('Supply order updated'); qc.invalidateQueries({ queryKey: ['/api/supply-orders'] }); }, onError: (e) => toast.show(parseApiError(e).message ?? 'Transition failed') });

  return <Container><CrudPage title='Supply Orders' endpoint='/api/supply-orders' fields={[{ key: 'customerId', label: 'CustomerId', required: true }, { key: 'supplierId', label: 'SupplierId', required: true }, { key: 'packageId', label: 'PackageId' }, { key: 'name', label: 'Name', required: true }, { key: 'purchasePrice', label: 'PurchasePrice', required: true }, { key: 'details', label: 'Details' }]} /><Paper sx={{ mt: 2, p: 2 }}><Typography variant='subtitle2'>Lifecycle Actions</Typography>{isLoading ? <Loading /> : data.map((row) => <Stack direction='row' gap={1} key={row.id} sx={{ mb: 1 }} alignItems='center'><Typography sx={{ minWidth: 280 }}>#{row.id} {row.name} ({row.status})</Typography>{['approve', 'order', 'deliver-to-warehouse', 'pack-into-package', 'close', 'cancel'].map((action) => <Button key={action} size='small' onClick={() => transition.mutate({ id: row.id, action })}>{action}</Button>)}</Stack>)}</Paper>{toast.node}</Container>;
};
