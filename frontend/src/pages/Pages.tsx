import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
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
import { getJson, parseApiError, postJson, putJson, uploadMultipart } from '../api/client';
import { FormModal } from '../components/common/Common';
import { FormDateInput, FormSelect, FormSwitch, FormTextField } from '../components/forms/Fields';
import { PhotoGallery } from '../components/media/PhotoGallery';
import { GenericTable } from '../components/reusable/GenericTable';
import { GenericField } from '../components/reusable/types';

type AnyObj = Record<string, any>;
const Loading = () => <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;

function CrudPage({ title, endpoint, fields }: { title: string; endpoint: string; fields: GenericField<AnyObj>[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [snack, setSnack] = useState('');

  const schema = useMemo(() => z.object(Object.fromEntries(fields.map((f) => [String(f.key), f.required ? z.any().refine((v) => v !== '' && v !== null && v !== undefined, `${f.label} is required`) : z.any().optional()]))), [fields]);
  const form = useForm<AnyObj>({ resolver: zodResolver(schema), defaultValues: {} });

  const { data = [], isLoading } = useQuery({ queryKey: [endpoint], queryFn: () => getJson<any[]>(endpoint) });

  const save = useMutation({
    mutationFn: async (payload: AnyObj) => (editId ? putJson(`${endpoint}/${editId}`, payload) : postJson(endpoint, payload)),
    onSuccess: () => {
      setOpen(false);
      setEditId(null);
      form.reset({});
      setSnack(`${title} saved`);
      qc.invalidateQueries({ queryKey: [endpoint] });
    },
    onError: (e) => setSnack(parseApiError(e).message ?? 'Save failed')
  });

  return (
    <Container>
      <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 2 }}>
        <Typography variant='h4'>{title}</Typography>
        <Button variant='contained' onClick={() => { setEditId(null); form.reset({}); setOpen(true); }}>Create</Button>
      </Stack>

      {isLoading ? <Loading /> : (
        <GenericTable
          rows={data}
          columns={[{ key: 'id', header: 'ID', type: 'number' }, ...fields.map((f) => ({ key: String(f.key), header: f.label }))]}
          actions={[{ label: 'Edit', onClick: (row) => { setEditId(row.id); form.reset(row); setOpen(true); } }]}
        />
      )}

      <FormModal open={open} onClose={() => setOpen(false)} title={`${title} Form`}>
        <Stack gap={1} sx={{ mt: 1 }}>
          {fields.map((f) => {
            const key = String(f.key);
            if (f.type === 'select') return <FormSelect key={key} name={key} label={f.label} control={form.control} options={f.options ?? []} />;
            if (f.type === 'switch') return <FormSwitch key={key} name={key} label={f.label} control={form.control} />;
            if (f.type === 'date') return <FormDateInput key={key} name={key} label={f.label} control={form.control} />;
            return <FormTextField key={key} name={key} label={f.label} control={form.control} />;
          })}
          <Button variant='contained' onClick={form.handleSubmit((v) => save.mutate(v))}>Save</Button>
        </Stack>
      </FormModal>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} />
    </Container>
  );
}

export const LoginPage = () => {
  const [email, setE] = useState('admin@local');
  const [password, setP] = useState('Admin123!');
  const [err, setErr] = useState('');
  const m = useMutation({ mutationFn: () => postJson<{ token: string }>('/api/auth/login', { email, password }), onSuccess: (r) => { localStorage.setItem('token', r.token); setErr('Logged in'); }, onError: (e) => setErr(parseApiError(e).message ?? 'Login failed') });
  return <Container><Typography variant='h4'>Admin Login</Typography>{err && <Alert severity={err === 'Logged in' ? 'success' : 'error'}>{err}</Alert>}<Stack gap={1} sx={{ maxWidth: 400, mt: 2 }}><TextField label='Email' value={email} onChange={(e) => setE(e.target.value)} /><TextField label='Password' type='password' value={password} onChange={(e) => setP(e.target.value)} /><Button onClick={() => m.mutate()} variant='contained'>Login</Button></Stack></Container>;
};

export const DashboardPage = () => <Container><Typography variant='h4'>Dashboard</Typography><Typography>Admin operations console.</Typography></Container>;

export const CustomersPage = () => <Container><CrudPage title='Customers' endpoint='/api/customers' fields={[{ key: 'customerRef', label: 'CustomerRef', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'primaryPhone', label: 'Phone', required: true }, { key: 'email', label: 'Email' }, { key: 'isActive', label: 'IsActive', type: 'switch' }, { key: 'whatsAppConsent', label: 'WhatsApp Consent', type: 'switch' }]} /><GroupExportCard /></Container>;

export const ShipmentsPage = () => {
  const { data = [], isLoading } = useQuery({ queryKey: ['shipments'], queryFn: () => getJson<any[]>('/api/shipments') });
  return <Container><Typography variant='h4'>Shipments</Typography>{isLoading ? <Loading /> : <GenericTable rows={data} columns={[{ key: 'id', header: 'ID', type: 'number' }, { key: 'refCode', header: 'RefCode' }, { key: 'status', header: 'Status' }]} actions={[{ label: 'Details', onClick: (r) => window.location.assign(`/shipments/${r.id}`) }]} />}</Container>;
};

const GateMissingTable = ({ gate }: { gate: any }) => (
  <Table size='small'>
    <TableHead><TableRow><TableCell>PackageId</TableCell><TableCell>CustomerRef</TableCell><TableCell>Stage</TableCell><TableCell>Link</TableCell></TableRow></TableHead>
    <TableBody>{(gate?.missing ?? []).map((m: any) => <TableRow key={`${m.packageId}-${m.stage}`}><TableCell>{m.packageId}</TableCell><TableCell>{m.customerRef}</TableCell><TableCell>{m.stage}</TableCell><TableCell><Button component={Link} to={`/packages/${m.packageId}`}>Open</Button></TableCell></TableRow>)}</TableBody>
  </Table>
);

export const ShipmentDetailPage = ({ id }: { id: string }) => {
  const qc = useQueryClient();
  const [gate, setGate] = useState<any>(null);
  const { data, isLoading } = useQuery({ queryKey: ['shipment', id], queryFn: () => getJson<any>(`/api/shipments/${id}`) });
  const media = useQuery({ queryKey: ['shipment-media', id], queryFn: () => getJson<any[]>(`/api/shipments/${id}/media`) });
  const move = useMutation({ mutationFn: (a: string) => postJson(`/api/shipments/${id}/${a}`), onSuccess: () => { setGate(null); qc.invalidateQueries({ queryKey: ['shipment', id] }); }, onError: (e) => setGate(parseApiError(e)) });

  return <Container><Typography variant='h4'>Shipment {id}</Typography>{isLoading ? <Loading /> : <><Stack direction='row' gap={1} sx={{ my: 2, flexWrap: 'wrap' }}>{['schedule', 'ready-to-depart', 'depart', 'arrive', 'close', 'cancel'].map((x) => <Button key={x} onClick={() => move.mutate(x)}>{x}</Button>)}</Stack><Paper sx={{ p: 2, mb: 2 }}><Typography>Status: {data?.status}</Typography><Typography>RefCode: {data?.refCode}</Typography></Paper>{gate?.code === 'PHOTO_GATE_FAILED' && <Alert severity='error'>{gate.message}<GateMissingTable gate={gate} /></Alert>}<PhotoGallery media={media.data ?? []} /></>}</Container>;
};

export const PackagesPage = () => {
  const { data = [], isLoading } = useQuery({ queryKey: ['packages'], queryFn: () => getJson<any[]>('/api/packages') });
  return <Container><Typography variant='h4'>Packages</Typography>{isLoading ? <Loading /> : <GenericTable rows={data} columns={[{ key: 'id', header: 'ID', type: 'number' }, { key: 'shipmentId', header: 'Shipment', type: 'number' }, { key: 'customerId', header: 'Customer', type: 'number' }, { key: 'status', header: 'Status' }]} actions={[{ label: 'Details', onClick: (r) => window.location.assign(`/packages/${r.id}`) }]} />}</Container>;
};

export const PackageDetailPage = ({ id }: { id: string }) => {
  const qc = useQueryClient();
  const [stage, setStage] = useState('Receiving');
  const [gate, setGate] = useState<any>(null);
  const { data, isLoading } = useQuery({ queryKey: ['pkg', id], queryFn: () => getJson<any>(`/api/packages/${id}`) });
  const media = useQuery({ queryKey: ['pkg-media', id], queryFn: () => getJson<any[]>(`/api/packages/${id}/media`) });
  const transition = useMutation({ mutationFn: (action: string) => postJson(`/api/packages/${id}/${action}`), onSuccess: () => { setGate(null); qc.invalidateQueries({ queryKey: ['pkg', id] }); }, onError: (e) => setGate(parseApiError(e)) });
  const upload = useMutation({ mutationFn: (file: File) => { const fd = new FormData(); fd.append('stage', stage); fd.append('file', file); return uploadMultipart(`/api/packages/${id}/media`, fd); }, onSuccess: () => qc.invalidateQueries({ queryKey: ['pkg-media', id] }) });

  return <Container><Typography variant='h4'>Package {id}</Typography>{isLoading ? <Loading /> : <>{gate?.code === 'PHOTO_GATE_FAILED' && <Alert severity='error'>{gate.message}<GateMissingTable gate={gate} /></Alert>}<Stack direction='row' gap={1} sx={{ my: 2, flexWrap: 'wrap' }}>{['receive', 'pack', 'ready-to-ship', 'ship', 'arrive-destination', 'ready-for-handout', 'handout', 'cancel'].map((a) => <Button key={a} onClick={() => transition.mutate(a)}>{a}</Button>)}</Stack><Paper sx={{ p: 2, mb: 2 }}><Typography variant='subtitle1'>Pricing Snapshot</Typography><Typography>Weight: {data?.package?.totalWeightKg}</Typography><Typography>Volume: {data?.package?.totalVolumeM3}</Typography><Typography>Rate/Kg: {data?.package?.appliedRatePerKg}</Typography><Typography>Rate/M3: {data?.package?.appliedRatePerM3}</Typography><Typography>Charge: {data?.package?.chargeAmount} {data?.package?.currency}</Typography></Paper><Paper sx={{ p: 2, mb: 2 }}><Typography variant='subtitle1'>Upload Photo</Typography><Stack direction='row' gap={1} alignItems='center'><TextField select value={stage} onChange={(e) => setStage(e.target.value)} size='small'><MenuItem value='Receiving'>Receiving</MenuItem><MenuItem value='Departure'>Departure</MenuItem><MenuItem value='Arrival'>Arrival</MenuItem><MenuItem value='Other'>Other</MenuItem></TextField><Button component='label' variant='outlined'>Choose & Upload<input hidden type='file' onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) upload.mutate(file); }} /></Button></Stack></Paper><PhotoGallery media={media.data ?? []} /></>}</Container>;
};

export const MessagingLogsPage = () => {
  const { data = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: () => getJson<any[]>('/api/whatsapp/campaigns') });
  return <Container><Typography variant='h4'>Messaging Logs</Typography>{isLoading ? <Loading /> : <GenericTable rows={data} columns={[{ key: 'id', header: 'ID', type: 'number' }, { key: 'type', header: 'Type' }, { key: 'shipmentId', header: 'Shipment', type: 'number' }, { key: 'recipientCount', header: 'Recipients', type: 'number' }, { key: 'completed', header: 'Completed', type: 'boolean' }]} />}</Container>;
};

export const GroupExportCard = () => {
  const [snack, setSnack] = useState('');
  const m = useMutation({ mutationFn: (format: 'csv' | 'vcf') => postJson<{ publicUrl: string }>('/api/exports/group-helper', { format }), onSuccess: (r) => { window.open(r.publicUrl, '_blank'); setSnack('Export generated'); }, onError: (e) => setSnack(parseApiError(e).message ?? 'Export failed') });
  return <Box sx={{ mt: 2 }}><Alert severity='warning'>WhatsApp groups reveal phone numbers to all members.</Alert><Stack direction='row' gap={1} sx={{ mt: 1 }}><Button onClick={() => m.mutate('csv')}>Export CSV</Button><Button onClick={() => m.mutate('vcf')}>Export VCF</Button></Stack><Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack('')} message={snack} /></Box>;
};

export const WarehousesPage = () => <CrudPage title='Warehouses' endpoint='/api/warehouses' fields={[{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'city', label: 'City' }, { key: 'country', label: 'Country' }, { key: 'maxWeightKg', label: 'MaxWeightKg' }, { key: 'maxVolumeM3', label: 'MaxVolumeM3' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;
export const GoodTypesPage = () => <CrudPage title='GoodTypes' endpoint='/api/good-types' fields={[{ key: 'nameEn', label: 'Name EN', required: true }, { key: 'nameAr', label: 'Name AR' }, { key: 'ratePerKg', label: 'Rate/Kg' }, { key: 'ratePerM3', label: 'Rate/M3' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;
export const GoodsPage = () => <CrudPage title='Goods' endpoint='/api/goods' fields={[{ key: 'goodTypeId', label: 'GoodTypeId', required: true }, { key: 'nameEn', label: 'Name EN', required: true }, { key: 'nameAr', label: 'Name AR' }, { key: 'unit', label: 'Unit' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;
export const PricingConfigsPage = () => <CrudPage title='Pricing Configs' endpoint='/api/pricing-configs' fields={[{ key: 'name', label: 'Name', required: true }, { key: 'currency', label: 'Currency', required: true }, { key: 'effectiveFrom', label: 'Effective From', type: 'date' }, { key: 'effectiveTo', label: 'Effective To', type: 'date' }, { key: 'defaultRatePerKg', label: 'Rate/Kg' }, { key: 'defaultRatePerM3', label: 'Rate/M3' }, { key: 'status', label: 'Status' }]} />;
export const SuppliersPage = () => <CrudPage title='Suppliers' endpoint='/api/suppliers' fields={[{ key: 'name', label: 'Name', required: true }, { key: 'email', label: 'Email' }, { key: 'isActive', label: 'IsActive', type: 'switch' }]} />;
export const SupplyOrdersPage = () => <CrudPage title='Supply Orders' endpoint='/api/supply-orders' fields={[{ key: 'customerId', label: 'CustomerId', required: true }, { key: 'supplierId', label: 'SupplierId', required: true }, { key: 'packageId', label: 'PackageId' }, { key: 'name', label: 'Name', required: true }, { key: 'purchasePrice', label: 'PurchasePrice', required: true }, { key: 'details', label: 'Details' }]} />;
