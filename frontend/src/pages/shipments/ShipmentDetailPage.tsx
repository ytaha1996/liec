import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Link as MuiLink,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, api, getJson, postJson } from '../../api/client';
import { useAppDispatch } from '../../redux/hooks';
import { OpenConfirmation } from '../../redux/confirmation/confirmationReducer';
import EnhancedTable from '../../components/enhanced-table/EnhancedTable';
import {
  EnhanceTableHeaderTypes,
  EnhancedTableColumnType,
} from '../../components/enhanced-table';
import MainPageSection from '../../components/layout-components/main-layout/MainPageSection';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import { PhotoGallery } from '../../components/media/PhotoGallery';

interface Props {
  id: string;
}

const SHIPMENT_STATUS_CHIPS: Record<string, { color: string; backgroundColor: string }> = {
  Draft: { color: '#333', backgroundColor: '#e0e0e0' },
  Scheduled: { color: '#fff', backgroundColor: '#0288d1' },
  ReadyToDepart: { color: '#fff', backgroundColor: '#ed6c02' },
  Departed: { color: '#fff', backgroundColor: '#1565c0' },
  Arrived: { color: '#fff', backgroundColor: '#2e7d32' },
  Closed: { color: '#fff', backgroundColor: '#616161' },
  Cancelled: { color: '#fff', backgroundColor: '#c62828' },
};

const TRANSITION_ACTIONS: { label: string; action: string }[] = [
  { label: 'Schedule', action: 'schedule' },
  { label: 'Ready To Depart', action: 'ready-to-depart' },
  { label: 'Depart', action: 'depart' },
  { label: 'Arrive', action: 'arrive' },
  { label: 'Close', action: 'close' },
  { label: 'Cancel', action: 'cancel' },
];

const ShipmentDetailPage = ({ id }: Props) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateError | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [tiiuDraft, setTiiuDraft] = useState('');

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ['/api/shipments', id],
    queryFn: () => getJson<any>(`/api/shipments/${id}`),
  });

  const mediaQuery = useQuery<any[]>({
    queryKey: ['/api/shipments', id, 'media'],
    queryFn: () => getJson<any[]>(`/api/shipments/${id}/media`),
  });

  const packagesQuery = useQuery<any[]>({
    queryKey: ['/api/packages'],
    queryFn: () => getJson<any[]>('/api/packages'),
  });

  const customersQuery = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const customersMap = (customersQuery.data ?? []).reduce((acc: Record<number, string>, c: any) => {
    acc[c.id] = `${c.name} (#${c.id})`;
    return acc;
  }, {});

  const shipmentPackages = (packagesQuery.data ?? []).filter(
    (p) => String(p.shipmentId) === String(id),
  );

  const packageTableData = shipmentPackages.reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = {
      ...item,
      customer: customersMap[item.customerId] ?? `#${item.customerId}`,
      hasDeparturePhotos: String(item.hasDeparturePhotos),
      hasArrivalPhotos: String(item.hasArrivalPhotos),
    };
    return acc;
  }, {});

  const packageHeadersWithNav: EnhanceTableHeaderTypes[] = [
    {
      id: 'id',
      label: 'Package ID',
      type: EnhancedTableColumnType.Clickable,
      numeric: false,
      disablePadding: false,
      onClick: (_tableId: string, row: Record<string, any>) => navigate(`/packages/${row.id}`),
    },
    { id: 'customer', label: 'Customer', type: EnhancedTableColumnType.TEXT, numeric: false, disablePadding: false },
    {
      id: 'status',
      label: 'Status',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: SHIPMENT_STATUS_CHIPS,
      chipLabels: {},
    },
    {
      id: 'hasDeparturePhotos',
      label: 'Departure Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#fff', backgroundColor: '#c62828' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
    {
      id: 'hasArrivalPhotos',
      label: 'Arrival Photos',
      type: EnhancedTableColumnType.COLORED_CHIP,
      numeric: false,
      disablePadding: false,
      chipColors: {
        true: { color: '#fff', backgroundColor: '#2e7d32' },
        false: { color: '#fff', backgroundColor: '#c62828' },
      },
      chipLabels: { true: 'Yes', false: 'No' },
    },
  ];

  const move = useMutation({
    mutationFn: (action: string) => postJson(`/api/shipments/${id}/${action}`),
    onSuccess: () => {
      setGate(null);
      toast.success('Shipment updated');
      qc.invalidateQueries({ queryKey: ['/api/shipments', id] });
    },
    onError: (e: any) => {
      const payload = e?.response?.data ?? {};
      if (payload.code === 'PHOTO_GATE_FAILED') {
        setGate(payload as GateError);
      }
      toast.error(payload.message ?? 'Transition failed');
    },
  });

  const updateTiiu = useMutation({
    mutationFn: (code: string) => api.patch(`/api/shipments/${id}/tiiu`, { tiiuCode: code }).then((r) => r.data),
    onSuccess: () => { toast.success('TIIU updated'); qc.invalidateQueries({ queryKey: ['/api/shipments', id] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'TIIU update failed'),
  });

  const syncTracking = useMutation({
    mutationFn: (code: string) => postJson(`/api/shipments/${id}/tracking/sync`, { code }),
    onSuccess: () => { toast.success('Tracking synced'); qc.invalidateQueries({ queryKey: ['/api/shipments', id] }); },
    onError: () => toast.error('Tracking sync failed'),
  });

  const sendBulk = useMutation({
    mutationFn: (kind: 'status' | 'departure' | 'arrival') => {
      if (kind === 'status') return postJson(`/api/shipments/${id}/whatsapp/status/bulk`);
      return postJson(`/api/shipments/${id}/whatsapp/photos/${kind}/bulk`);
    },
    onSuccess: () => toast.success('Bulk campaign created'),
    onError: () => toast.error('Bulk send failed'),
  });

  useEffect(() => {
    setTiiuDraft(data?.tiiuCode ?? '');
  }, [data?.tiiuCode]);

  if (isLoading) {
    return <Box sx={{ p: 3 }}><Typography>Loading...</Typography></Box>;
  }

  if (isError || !data) {
    return <Box sx={{ p: 3 }}><Alert severity="error">Shipment not found.</Alert></Box>;
  }

  return (
    <Box>
      <PageTitleWrapper>
        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: '#00A6A6' }}>
            Shipment {data.refCode}
          </Typography>
          <Chip
            label={data.status}
            size="small"
            sx={{
              backgroundColor: SHIPMENT_STATUS_CHIPS[data.status]?.backgroundColor ?? '#e0e0e0',
              color: SHIPMENT_STATUS_CHIPS[data.status]?.color ?? '#333',
            }}
          />
        </Stack>
      </PageTitleWrapper>

      <Box sx={{ px: 3, pb: 3 }}>

        <MainPageSection title="TIIU Code">
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              label="TIIU"
              value={tiiuDraft}
              onChange={(e) => setTiiuDraft(e.target.value.toUpperCase())}
              inputProps={{ maxLength: 4 }}
              disabled={data.status !== 'Draft'}
              helperText={data.status === 'Draft' ? 'Editable in Draft only. Required before Schedule/Depart.' : 'Locked after Draft.'}
            />
            {data.status === 'Draft' && (
              <Button variant="outlined" onClick={() => updateTiiu.mutate(tiiuDraft)} disabled={!tiiuDraft.trim() || updateTiiu.isPending}>
                Save TIIU
              </Button>
            )}
          </Stack>
        </MainPageSection>

        <MainPageSection title="Status Transitions">
          {gate?.code === 'PHOTO_GATE_FAILED' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {gate.message}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Package</TableCell>
                    <TableCell>Stage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(gate.missing ?? []).map((m) => (
                    <TableRow key={`${m.packageId}-${m.stage}`}>
                      <TableCell>
                        <MuiLink component={RouterLink} to={`/packages/${m.packageId}`}>
                          #{m.packageId}
                        </MuiLink>
                      </TableCell>
                      <TableCell>{m.stage}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Alert>
          )}
          <Stack direction="row" gap={1} flexWrap="wrap">
            {TRANSITION_ACTIONS.map(({ label, action }) => (
              <Button
                key={action}
                variant="outlined"
                color={action === 'cancel' ? 'error' : 'primary'}
                onClick={() =>
                  action === 'cancel'
                    ? dispatch(OpenConfirmation({
                        open: true,
                        title: 'Cancel Shipment',
                        message: 'Are you sure you want to cancel this shipment? This cannot be undone.',
                        onSubmit: () => move.mutate('cancel'),
                      }))
                    : move.mutate(action)
                }
                disabled={move.isPending}
              >
                {label}
              </Button>
            ))}
          </Stack>
        </MainPageSection>

        {(data.maxWeightKg > 0 || data.maxVolumeM3 > 0) && (
          <MainPageSection title="Container Capacity">
            {data.maxWeightKg > 0 && (() => {
              const pct = Math.min((data.totalWeightKg / data.maxWeightKg) * 100, 100);
              return (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Weight: {data.totalWeightKg} / {data.maxWeightKg} kg ({pct.toFixed(1)}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={pct >= 90 ? 'error' : pct >= 80 ? 'warning' : 'primary'}
                  />
                </Box>
              );
            })()}
            {data.maxVolumeM3 > 0 && (() => {
              const pct = Math.min((data.totalVolumeM3 / data.maxVolumeM3) * 100, 100);
              return (
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Volume: {data.totalVolumeM3} / {data.maxVolumeM3} m³ ({pct.toFixed(1)}%)
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={pct >= 90 ? 'error' : pct >= 80 ? 'warning' : 'primary'}
                  />
                </Box>
              );
            })()}
          </MainPageSection>
        )}

        <MainPageSection title="External Tracking Sync">
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <TextField size="small" label="Tracking code" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
            <Button variant="outlined" onClick={() => syncTracking.mutate(trackingCode)} disabled={syncTracking.isPending || !trackingCode.trim()}>Sync Tracking</Button>
            <Typography variant="body2">Current: {data.externalTrackingCode ?? '-'} / ETA: {data.externalEstimatedArrivalAt ? new Date(data.externalEstimatedArrivalAt).toLocaleString() : '-'}</Typography>
          </Stack>
        </MainPageSection>

        <MainPageSection title="WhatsApp Bulk Actions">
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => sendBulk.mutate('status')} disabled={sendBulk.isPending}>
              Status Bulk
            </Button>
            <Button variant="outlined" onClick={() => sendBulk.mutate('departure')} disabled={sendBulk.isPending}>
              Departure Bulk
            </Button>
            <Button variant="outlined" onClick={() => sendBulk.mutate('arrival')} disabled={sendBulk.isPending}>
              Arrival Bulk
            </Button>
          </Stack>
        </MainPageSection>

        <MainPageSection title="Packages">
          <EnhancedTable
            title="Packages in Shipment"
            header={packageHeadersWithNav}
            data={packageTableData}
            defaultOrder="id"
          />
        </MainPageSection>

        <MainPageSection title="Photos">
          <PhotoGallery media={mediaQuery.data ?? []} />
        </MainPageSection>
      </Box>
    </Box>
  );
};

export default ShipmentDetailPage;
