import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import { getJson } from '../../api/client';
import MainPageTitle from '../../components/layout-components/main-layout/MainPageTitle';
import PageTitleWrapper from '../../components/PageTitleWrapper';

interface StatCardProps {
  title: string;
  count: number | undefined;
  isLoading: boolean;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, isLoading, color = '#00A6A6' }) => (
  <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ color: '#6E759F', fontWeight: 500, mb: 1 }}>
        {title}
      </Typography>
      {isLoading ? (
        <CircularProgress size={28} />
      ) : (
        <Typography variant="h3" sx={{ fontWeight: 700, color }}>
          {count ?? 0}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: () => getJson<any[]>('/api/customers'),
  });

  const { data: shipments, isLoading: loadingShipments } = useQuery({
    queryKey: ['/api/shipments'],
    queryFn: () => getJson<any[]>('/api/shipments'),
  });

  const { data: packages, isLoading: loadingPackages } = useQuery({
    queryKey: ['/api/packages'],
    queryFn: () => getJson<any[]>('/api/packages'),
  });

  const activePending = (shipments ?? []).filter(
    (s: any) => s.status === 'Pending' || s.status === 'NearlyFull',
  ).length;

  return (
    <>
      <PageTitleWrapper>
        <MainPageTitle title="Dashboard" subtitle="Admin operations console for shipments, packages, media and messaging." />
      </PageTitleWrapper>
      <Box sx={{ px: 3, pb: 4 }}>
        {!loadingShipments && activePending < 2 && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => navigate('/shipments')}>
                Create Shipment
              </Button>
            }
          >
            Only {activePending} active container(s) (Pending / Nearly Full) available. At least 2 are recommended.
          </Alert>
        )}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total Customers"
              count={customers?.length}
              isLoading={loadingCustomers}
              color="#00A6A6"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total Shipments"
              count={shipments?.length}
              isLoading={loadingShipments}
              color="#243043"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard
              title="Total Packages"
              count={packages?.length}
              isLoading={loadingPackages}
              color="#7B5EA7"
            />
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default DashboardPage;
