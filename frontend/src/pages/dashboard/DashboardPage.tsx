import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { getJson } from '../../api/client';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';
import { BRAND_TEAL, BRAND_NAVY, BRAND_PURPLE, SHIPMENT_STATUS_CHIPS, PKG_STATUS_CHIPS } from '../../constants/statusColors';
import { SHIPMENT_STATUS_LABELS, PKG_STATUS_LABELS } from '../../constants/statusLabels';
import Loader from '../../components/Loader';

interface StatCardProps {
  title: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, color = BRAND_TEAL, subtitle }) => (
  <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="subtitle2" sx={{ color: '#6E759F', fontWeight: 500, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 700, color }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: '#999' }}>{subtitle}</Typography>
      )}
    </CardContent>
  </Card>
);

interface StatusBreakdownProps {
  title: string;
  data: Record<string, number>;
  chips: Record<string, { color: string; backgroundColor: string }>;
  labels: Record<string, string>;
}

const StatusBreakdown: React.FC<StatusBreakdownProps> = ({ title, data, chips, labels }) => (
  <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="subtitle2" sx={{ color: '#6E759F', fontWeight: 500, mb: 1.5 }}>
        {title}
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {Object.entries(data).map(([status, count]) => (
          <Chip
            key={status}
            label={`${labels[status] ?? status}: ${count}`}
            size="small"
            sx={{
              backgroundColor: chips[status]?.backgroundColor ?? '#e0e0e0',
              color: chips[status]?.color ?? '#333',
              fontWeight: 600,
            }}
          />
        ))}
      </Stack>
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['/api/stats/overview'],
    queryFn: () => getJson<any>('/api/stats/overview'),
  });

  if (isLoading) return <Loader />;

  const s = stats ?? {};
  const shipmentsByStatus = s.shipmentsByStatus ?? {};
  const packagesByStatus = s.packagesByStatus ?? {};
  const activePending = (shipmentsByStatus.Draft ?? 0) + (shipmentsByStatus.Scheduled ?? 0);
  const totalShipments = Object.values(shipmentsByStatus).reduce((a: number, b: any) => a + b, 0);
  const totalPackages = Object.values(packagesByStatus).reduce((a: number, b: any) => a + b, 0);

  return (
    <>
      <PageTitleWrapper>
        <MainPageTitle title="Dashboard" subtitle="Operations overview" />
      </PageTitleWrapper>
      <Box sx={{ px: 3, pb: 4 }}>
        {activePending < 2 && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/ops/shipments')}>
                Create Shipment
              </Button>
            }
          >
            Only {activePending} active container(s) (Draft / Scheduled). At least 2 recommended.
          </Alert>
        )}

        {(s.packagesMissingDeparturePhotos > 0 || s.packagesMissingArrivalPhotos > 0) && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {s.packagesMissingDeparturePhotos > 0 && (
              <span>{s.packagesMissingDeparturePhotos} package(s) missing departure photos. </span>
            )}
            {s.packagesMissingArrivalPhotos > 0 && (
              <span>{s.packagesMissingArrivalPhotos} package(s) missing arrival photos.</span>
            )}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <StatCard title="Customers" value={s.totalCustomers ?? 0} color={BRAND_TEAL} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Shipments" value={totalShipments} color={BRAND_NAVY} subtitle={`${s.shipmentsThisMonth ?? 0} this month`} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Packages" value={totalPackages} color={BRAND_PURPLE} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard title="Pending Charges" value={`${(s.totalPendingCharges ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#ed6c02" subtitle="active packages" />
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <StatusBreakdown title="Shipments by Status" data={shipmentsByStatus} chips={SHIPMENT_STATUS_CHIPS} labels={SHIPMENT_STATUS_LABELS} />
          </Grid>
          <Grid item xs={12} md={6}>
            <StatusBreakdown title="Packages by Status" data={packagesByStatus} chips={PKG_STATUS_CHIPS} labels={PKG_STATUS_LABELS} />
          </Grid>
        </Grid>

        <Stack direction="row" gap={2}>
          <Button variant="contained" onClick={() => navigate('/ops/shipments')}>View Shipments</Button>
          <Button variant="outlined" onClick={() => navigate('/ops/packages')}>View Packages</Button>
        </Stack>
      </Box>
    </>
  );
};

export default DashboardPage;
