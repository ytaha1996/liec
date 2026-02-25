import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { GateError, getJson, parseApiError, postJson, putJson, uploadMultipart } from '../api/client';
import { PhotoGallery } from '../components/media/PhotoGallery';
import { GenericCrudPage } from '../components/reusable/GenericCrudPage';
import { GenericColumn, GenericField, RowAction } from '../components/reusable/types';
import { GenericTable } from '../components/reusable/GenericTable';

type AnyObj = Record<string, any>;

const Loading = () => <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>;
const Empty = ({ text }: { text: string }) => <Alert severity='info'>{text}</Alert>;

function CrudPage({ title, endpoint, fields }: { title: string; endpoint: string; fields: GenericField<AnyObj>[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<AnyObj | null>(null);
  const [form, setForm] = useState<Partial<AnyObj>>({});

  const { data = [], isLoading } = useQuery({ queryKey: [endpoint], queryFn: () => getJson<any[]>(endpoint) });

  const save = useMutation({
    mutationFn: async () => edit?.id ? putJson(`${endpoint}/${edit.id}`, form) : postJson(endpoint, form),
    onSuccess: () => {
      setOpen(false);
      setEdit(null);
      setForm({});
      qc.invalidateQueries({ queryKey: [endpoint] });
    }
  });

  const columns: GenericColumn<AnyObj>[] = [
    { key: 'id', header: 'ID', type: 'number' },
    ...fields.map((f) => ({ key: String(f.key), header: f.label, type: f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text' as any }))
  ];

  return (
    <GenericCrudPage<AnyObj>
      title={title}
      rows={data}
      loading={isLoading}
      fields={fields}
      columns={columns}
      open={open}
      formValue={form}
      onOpenCreate={() => { setEdit(null); setForm({}); setOpen(true); }}
      onEdit={(row) => { setEdit(row); setForm(row); setOpen(true); }}
      onFormChange={setForm}
      onClose={() => setOpen(false)}
      onSave={() => save.mutate()}
    />
  );
}

export const LoginPage = () => {
  const [email, setE] = useState('admin@local');
  const [password, setP] = useState('Admin123!');
  const [err, setErr] = useState('');
  const m = useMutation({
    mutationFn: () => postJson<{ token: string }>('/api/auth/login', { email, password }),
    onSuccess: (r) => { localStorage.setItem('token', r.token); setErr(''); },
    onError: (e) => setErr(parseApiError(e).message ?? 'Login failed')
  });

  return (
    <Container>
      <Typography variant='h4'>Admin Login</Typography>
      {err && <Alert severity='error'>{err}</Alert>}
      <Stack gap={1} sx={{ maxWidth: 400, mt: 2 }}>
        <TextField label='Email' value={email} onChange={(e) => setE(e.target.value)} />
        <TextField label='Password' type='password' value={password} onChange={(e) => setP(e.target.value)} />
        <Button onClick={() => m.mutate()} variant='contained'>Login</Button>
      </Stack>
    </Container>
  );
};

export const DashboardPage = () => <Container><Typography variant='h4'>Dashboard</Typography><Typography>Admin shipping operations center.</Typography></Container>;

export const CustomersPage = () => {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['customers'], queryFn: () => getJson<any[]>('/api/customers') });
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState('');

  const sendStatus = useMutation({ mutationFn: ({ customerId, shipmentId }: any) => postJson(`/api/customers/${customerId}/whatsapp/status?shipmentId=${shipmentId}`) });
  const patchConsent = useMutation({ mutationFn: ({ id, consent }: any) => postJson(`/api/customers/${id}/whatsapp-consent`, consent), onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }) });

  const rows = data.filter((x) => !search || `${x.customerRef} ${x.name} ${x.primaryPhone}`.toLowerCase().includes(search.toLowerCase()));
  const columns: GenericColumn<any>[] = [
    { key: 'customerRef', header: 'Ref' },
    { key: 'name', header: 'Name' },
    { key: 'primaryPhone', header: 'Phone' }
  ];
  const actions: RowAction<any>[] = [
    { label: 'Detail', onClick: (r) => setSelected(r) },
    { label: 'Send Status', onClick: (r) => sendStatus.mutate({ customerId: r.id, shipmentId: 1 }) }
  ];

  return (
    <Container>
      <Typography variant='h4'>Customers</Typography>
      <Stack direction='row' gap={1} sx={{ my: 2 }}>
        <TextField size='small' label='Search' value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button variant='outlined' onClick={() => qc.invalidateQueries({ queryKey: ['customers'] })}>Refresh</Button>
      </Stack>
      <GroupExportCard />

      {isLoading ? <Loading /> : rows.length === 0 ? <Empty text='No customers' /> : <GenericTable rows={rows} columns={columns} actions={actions} />}

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth>
        <DialogTitle>Customer Detail</DialogTitle>
        <DialogContent>
          {selected && <Stack gap={1} sx={{ mt: 1 }}>
            <TextField label='Name' value={selected.name} InputProps={{ readOnly: true }} />
            <TextField label='Phone' value={selected.primaryPhone} InputProps={{ readOnly: true }} />
            <Stack direction='row' gap={1}>
              <Button onClick={() => patchConsent.mutate({ id: selected.id, consent: { optInStatusUpdates: true, optInDeparturePhotos: true, optInArrivalPhotos: true, optedOutAt: null } })}>Opt-in All</Button>
              <Button onClick={() => patchConsent.mutate({ id: selected.id, consent: { optInStatusUpdates: false, optInDeparturePhotos: false, optInArrivalPhotos: false, optedOutAt: new Date().toISOString() } })}>Opt-out All</Button>
            </Stack>
          </Stack>}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export const ShipmentsPage = () => {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['shipments'], queryFn: () => getJson<any[]>('/api/shipments') });
  const [gate, setGate] = useState<GateError | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ originWarehouseId: 1, destinationWarehouseId: 2, plannedDepartureDate: new Date().toISOString().slice(0, 10), plannedArrivalDate: new Date().toISOString().slice(0, 10) });

  const transition = useMutation({
    mutationFn: ({ id, action }: { id: number; action: string }) => postJson(`/api/shipments/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments'] }),
    onError: (e) => setGate(parseApiError(e))
  });

  const create = useMutation({ mutationFn: () => postJson('/api/shipments', form), onSuccess: () => { setCreating(false); qc.invalidateQueries({ queryKey: ['shipments'] }); } });

  const columns: GenericColumn<any>[] = [
    { key: 'id', header: 'ID', type: 'number' },
    { key: 'refCode', header: 'RefCode' },
    { key: 'status', header: 'Status' }
  ];
  const actions: RowAction<any>[] = [
    { label: 'Schedule', onClick: (r) => transition.mutate({ id: r.id, action: 'schedule' }) },
    { label: 'Ready', onClick: (r) => transition.mutate({ id: r.id, action: 'ready-to-depart' }) },
    { label: 'Depart', onClick: (r) => transition.mutate({ id: r.id, action: 'depart' }) },
    { label: 'Arrive', onClick: (r) => transition.mutate({ id: r.id, action: 'arrive' }) },
    { label: 'Close', onClick: (r) => transition.mutate({ id: r.id, action: 'close' }) },
    { label: 'WA Bulk', onClick: (r) => postJson(`/api/shipments/${r.id}/whatsapp/status/bulk`) }
  ];

  return (
    <Container>
      <Stack direction='row' justifyContent='space-between'>
        <Typography variant='h4'>Shipments</Typography>
        <Button variant='contained' onClick={() => setCreating(true)}>Create Shipment</Button>
      </Stack>

      {gate?.code === 'PHOTO_GATE_FAILED' && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {gate.message}
          <GenericTable rows={gate.missing as any[]} columns={[{ key: 'packageId', header: 'Package' }, { key: 'customerRef', header: 'Customer' }, { key: 'stage', header: 'Stage' }]} />
        </Alert>
      )}

      {isLoading ? <Loading /> : data.length === 0 ? <Empty text='No shipments' /> : <GenericTable rows={data} columns={columns} actions={actions} />}

      <Dialog open={creating} onClose={() => setCreating(false)}>
        <DialogTitle>Create Shipment</DialogTitle>
        <DialogContent>
          <Stack gap={1} sx={{ mt: 1, minWidth: 360 }}>
            <TextField type='number' label='Origin Warehouse Id' value={form.originWarehouseId} onChange={(e) => setForm((x) => ({ ...x, originWarehouseId: Number(e.target.value) }))} />
            <TextField type='number' label='Destination Warehouse Id' value={form.destinationWarehouseId} onChange={(e) => setForm((x) => ({ ...x, destinationWarehouseId: Number(e.target.value) }))} />
            <TextField type='date' label='Planned Departure' InputLabelProps={{ shrink: true }} value={form.plannedDepartureDate} onChange={(e) => setForm((x) => ({ ...x, plannedDepartureDate: e.target.value }))} />
            <TextField type='date' label='Planned Arrival' InputLabelProps={{ shrink: true }} value={form.plannedArrivalDate} onChange={(e) => setForm((x) => ({ ...x, plannedArrivalDate: e.target.value }))} />
          </Stack>
          <Button sx={{ mt: 2 }} onClick={() => create.mutate()} variant='contained'>Create</Button>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export const PackagesPage = () => {
  const { data = [], isLoading } = useQuery({ queryKey: ['packages'], queryFn: () => getJson<any[]>('/api/packages') });
  const columns: GenericColumn<any>[] = [
    { key: 'id', header: 'ID', type: 'number' },
    { key: 'shipmentId', header: 'Shipment', type: 'number' },
    { key: 'customerId', header: 'Customer', type: 'number' },
    { key: 'status', header: 'Status' }
  ];
  const actions: RowAction<any>[] = [{ label: 'Detail', onClick: (r) => window.location.assign(`/packages/${r.id}`) }];
  return <Container><Typography variant='h4'>Packages</Typography>{isLoading ? <Loading /> : data.length === 0 ? <Empty text='No packages' /> : <GenericTable rows={data} columns={columns} actions={actions} />}</Container>;
};

export const PackageDetailPage = ({ id }: { id: string }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['pkg', id], queryFn: () => getJson<any>(`/api/packages/${id}`) });
  const [gate, setGate] = useState<any>(null);
  const [stage, setStage] = useState('Arrival');

  const transition = useMutation({ mutationFn: (action: string) => postJson(`/api/packages/${id}/${action}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['pkg', id] }), onError: (e) => setGate(parseApiError(e)) });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const f = new FormData();
      f.append('stage', stage);
      f.append('file', file);
      return uploadMultipart(`/api/packages/${id}/media`, f);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pkg', id] })
  });

  const media = data?.media ?? [];
  return (
    <Container>
      <Typography variant='h4'>Package {id}</Typography>
      {isLoading ? <Loading /> : <>
        {gate?.code === 'PHOTO_GATE_FAILED' && <Alert severity='error'>{gate.message}</Alert>}
        <Stack direction='row' gap={1} sx={{ my: 2, flexWrap: 'wrap' }}>
          <Button onClick={() => transition.mutate('receive')}>Receive</Button>
          <Button onClick={() => transition.mutate('pack')}>Pack</Button>
          <Button onClick={() => transition.mutate('ready-to-ship')}>ReadyToShip</Button>
          <Button onClick={() => transition.mutate('ship')}>Ship</Button>
          <Button onClick={() => transition.mutate('arrive-destination')}>ArriveDestination</Button>
          <Button onClick={() => transition.mutate('ready-for-handout')}>ReadyForHandout</Button>
          <Button onClick={() => transition.mutate('handout')}>Handout</Button>
        </Stack>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant='subtitle1'>Pricing Snapshot</Typography>
          <Typography>Weight: {data?.package?.totalWeightKg}</Typography>
          <Typography>Volume: {data?.package?.totalVolumeM3}</Typography>
          <Typography>Rate/Kg: {data?.package?.appliedRatePerKg}</Typography>
          <Typography>Rate/M3: {data?.package?.appliedRatePerM3}</Typography>
          <Typography>Charge: {data?.package?.chargeAmount} {data?.package?.currency}</Typography>
        </Paper>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant='subtitle1'>Upload Photo</Typography>
          <Stack direction='row' gap={1} alignItems='center'>
            <TextField select value={stage} onChange={(e) => setStage(e.target.value)} size='small'>
              <MenuItem value='Receiving'>Receiving</MenuItem>
              <MenuItem value='Departure'>Departure</MenuItem>
              <MenuItem value='Arrival'>Arrival</MenuItem>
              <MenuItem value='Other'>Other</MenuItem>
            </TextField>
            <Button component='label' variant='outlined'>Choose & Upload
              <input hidden type='file' onChange={(e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) upload.mutate(file); }} />
            </Button>
          </Stack>
        </Paper>
        <PhotoGallery media={media} />
      </>}
    </Container>
  );
};

export const MessagingLogsPage = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: ['campaigns'], queryFn: () => getJson<any[]>('/api/whatsapp/campaigns') });
  const details = useQuery({ queryKey: ['campaign', selected], queryFn: () => getJson<any[]>(`/api/whatsapp/campaigns/${selected}`), enabled: !!selected });

  return (
    <Container>
      <Typography variant='h4'>Messaging Logs</Typography>
      {isLoading ? <Loading /> : data.length === 0 ? <Empty text='No campaigns' /> : (
        <GenericTable rows={data} columns={[
          { key: 'id', header: 'ID', type: 'number' },
          { key: 'type', header: 'Type' },
          { key: 'shipmentId', header: 'Shipment', type: 'number' },
          { key: 'recipientCount', header: 'Recipients', type: 'number' },
          { key: 'completed', header: 'Completed', type: 'boolean' }
        ]} actions={[{ label: 'View Logs', onClick: (r) => setSelected(r.id) }]} />
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth='md'>
        <DialogTitle>Delivery Logs</DialogTitle>
        <DialogContent>
          {details.isLoading ? <Loading /> : (
            <GenericTable rows={details.data ?? []} columns={[
              { key: 'customerId', header: 'CustomerId', type: 'number' },
              { key: 'phone', header: 'Phone' },
              { key: 'result', header: 'Result' },
              { key: 'failureReason', header: 'Reason' },
              { key: 'sentAt', header: 'SentAt', type: 'date' }
            ]} />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export const GroupExportCard = () => {
  const m = useMutation({ mutationFn: (format: 'csv' | 'vcf') => postJson<{ publicUrl: string }>('/api/exports/group-helper', { format }), onSuccess: (r) => window.open(r.publicUrl, '_blank') });
  return <Box sx={{ mt: 2 }}><Alert severity='warning'>WhatsApp groups reveal phone numbers to all members.</Alert><Stack direction='row' gap={1} sx={{ mt: 1 }}><Button onClick={() => m.mutate('csv')}>Export CSV</Button><Button onClick={() => m.mutate('vcf')}>Export VCF</Button></Stack></Box>;
};

export const WarehousesPage = () => <CrudPage title='Warehouses' endpoint='/api/warehouses' fields={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'city', label: 'City' }, { key: 'country', label: 'Country' }, { key: 'maxWeightKg', label: 'MaxWeightKg', type: 'number' }, { key: 'maxVolumeM3', label: 'MaxVolumeM3', type: 'number' }, { key: 'isActive', label: 'IsActive', type: 'select', options: [{ label: 'true', value: true }, { label: 'false', value: false }] }]} />;
export const GoodTypesPage = () => <CrudPage title='GoodTypes' endpoint='/api/good-types' fields={[{ key: 'nameEn', label: 'Name EN' }, { key: 'nameAr', label: 'Name AR' }, { key: 'ratePerKg', label: 'Rate/Kg', type: 'number' }, { key: 'ratePerM3', label: 'Rate/M3', type: 'number' }, { key: 'isActive', label: 'IsActive', type: 'select', options: [{ label: 'true', value: true }, { label: 'false', value: false }] }]} />;
export const GoodsPage = () => <CrudPage title='Goods' endpoint='/api/goods' fields={[{ key: 'goodTypeId', label: 'GoodTypeId', type: 'number' }, { key: 'nameEn', label: 'Name EN' }, { key: 'nameAr', label: 'Name AR' }, { key: 'unit', label: 'Unit' }, { key: 'isActive', label: 'IsActive', type: 'select', options: [{ label: 'true', value: true }, { label: 'false', value: false }] }]} />;
export const PricingConfigsPage = () => <CrudPage title='Pricing Configs' endpoint='/api/pricing-configs' fields={[{ key: 'name', label: 'Name' }, { key: 'currency', label: 'Currency' }, { key: 'effectiveFrom', label: 'Effective From', type: 'date' }, { key: 'effectiveTo', label: 'Effective To', type: 'date' }, { key: 'defaultRatePerKg', label: 'Rate/Kg', type: 'number' }, { key: 'defaultRatePerM3', label: 'Rate/M3', type: 'number' }, { key: 'status', label: 'Status' }]} />;
export const SuppliersPage = () => <CrudPage title='Suppliers' endpoint='/api/suppliers' fields={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'isActive', label: 'IsActive', type: 'select', options: [{ label: 'true', value: true }, { label: 'false', value: false }] }]} />;
export const SupplyOrdersPage = () => <CrudPage title='Supply Orders' endpoint='/api/supply-orders' fields={[{ key: 'customerId', label: 'CustomerId', type: 'number' }, { key: 'supplierId', label: 'SupplierId', type: 'number' }, { key: 'packageId', label: 'PackageId', type: 'number' }, { key: 'name', label: 'Name' }, { key: 'purchasePrice', label: 'PurchasePrice', type: 'number' }, { key: 'details', label: 'Details', type: 'multiline' }]} />;
