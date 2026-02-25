import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GateError, getJson, postJson } from '../../api/client';
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

const SHIPMENT_STATUS_CHIPS = {
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
  const qc = useQueryClient();
  const [gate, setGate] = useState<GateError | null>(null);

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

  const shipmentPackages = (packagesQuery.data ?? []).filter(
    (p) => String(p.shipmentId) === String(id),
  );

  const packageTableData = shipmentPackages.reduce((acc: Record<string, any>, item: any) => {
    acc[item.id] = { ...item, hasDeparturePhotos: String(item.hasDeparturePhotos), hasArrivalPhotos: String(item.hasArrivalPhotos) };
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
    { id: 'customerId', label: 'Customer ID', type: EnhancedTableColumnType.NUMBER, numeric: true, disablePadding: false },
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

  const sendBulk = useMutation({
    mutationFn: (kind: 'status' | 'departure' | 'arrival') => {
      if (kind === 'status') return postJson(`/api/shipments/${id}/whatsapp/status/bulk`);
      return postJson(`/api/shipments/${id}/whatsapp/photos/${kind}/bulk`);
    },
    onSuccess: () => toast.success('Bulk campaign created'),
    onError: () => toast.error('Bulk send failed'),
  });

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
              backgroundColor: (SHIPMENT_STATUS_CHIPS as any)[data.status]?.backgroundColor ?? '#e0e0e0',
              color: (SHIPMENT_STATUS_CHIPS as any)[data.status]?.color ?? '#333',
            }}
          />
        </Stack>
      </PageTitleWrapper>

      <Box sx={{ px: 3, pb: 3 }}>
        <MainPageSection title="Status Transitions">
          {gate?.code === 'PHOTO_GATE_FAILED' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {gate.message}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Package</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Stage</TableCell>
                    <TableCell>Link</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(gate.missing ?? []).map((m) => (
                    <TableRow key={`${m.packageId}-${m.stage}`}>
                      <TableCell>{m.packageId}</TableCell>
                      <TableCell>{m.customerRef}</TableCell>
                      <TableCell>{m.stage}</TableCell>
                      <TableCell>
                        <Button component={Link} to={`/packages/${m.packageId}`} size="small">Open</Button>
                      </TableCell>
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
                onClick={() => move.mutate(action)}
                disabled={move.isPending}
              >
                {label}
              </Button>
            ))}
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
