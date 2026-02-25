import { AppBar, Box, Button, Container, Toolbar } from '@mui/material';
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import {
  CustomersPage,
  DashboardPage,
  GoodTypesPage,
  GoodsPage,
  LoginPage,
  MessagingLogsPage,
  PackageDetailPage,
  PackagesPage,
  PricingConfigsPage,
  ShipmentDetailPage,
  ShipmentsPage,
  SuppliersPage,
  SupplyOrdersPage,
  WarehousesPage
} from './pages/Pages';

const PkgWrap = () => {
  const { id = '0' } = useParams();
  return <PackageDetailPage id={id} />;
};

const ShipmentWrap = () => {
  const { id = '0' } = useParams();
  return <ShipmentDetailPage id={id} />;
};

export const App = () => (
  <Box>
    <AppBar position='static'>
      <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
        <Button color='inherit' component={Link} to='/'>Dashboard</Button>
        <Button color='inherit' component={Link} to='/customers'>Customers</Button>
        <Button color='inherit' component={Link} to='/warehouses'>Warehouses</Button>
        <Button color='inherit' component={Link} to='/good-types'>GoodTypes</Button>
        <Button color='inherit' component={Link} to='/goods'>Goods</Button>
        <Button color='inherit' component={Link} to='/pricing-configs'>Pricing</Button>
        <Button color='inherit' component={Link} to='/shipments'>Shipments</Button>
        <Button color='inherit' component={Link} to='/packages'>Packages</Button>
        <Button color='inherit' component={Link} to='/suppliers'>Suppliers</Button>
        <Button color='inherit' component={Link} to='/supply-orders'>SupplyOrders</Button>
        <Button color='inherit' component={Link} to='/messaging-logs'>Messaging</Button>
      </Toolbar>
    </AppBar>

    <Container sx={{ py: 2 }}>
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/' element={<DashboardPage />} />
        <Route path='/customers' element={<CustomersPage />} />
        <Route path='/warehouses' element={<WarehousesPage />} />
        <Route path='/good-types' element={<GoodTypesPage />} />
        <Route path='/goods' element={<GoodsPage />} />
        <Route path='/pricing-configs' element={<PricingConfigsPage />} />
        <Route path='/shipments' element={<ShipmentsPage />} />
        <Route path='/shipments/:id' element={<ShipmentWrap />} />
        <Route path='/packages' element={<PackagesPage />} />
        <Route path='/packages/:id' element={<PkgWrap />} />
        <Route path='/suppliers' element={<SuppliersPage />} />
        <Route path='/supply-orders' element={<SupplyOrdersPage />} />
        <Route path='/messaging-logs' element={<MessagingLogsPage />} />
        <Route path='*' element={<Navigate to='/' />} />
      </Routes>
    </Container>
  </Box>
);
