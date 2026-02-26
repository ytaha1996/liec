import React from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAppSelector } from './redux/hooks';
import GenericLayout from './layouts/GenericLayout/GenericLayout';
import { applications } from './application';

// Import all page components
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import WarehousesPage from './pages/warehouses/WarehousesPage';
import GoodTypesPage from './pages/good-types/GoodTypesPage';
import GoodsPage from './pages/goods/GoodsPage';
import PricingConfigsPage from './pages/pricing/PricingConfigsPage';
import ShipmentsPage from './pages/shipments/ShipmentsPage';
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage';
import PackagesPage from './pages/packages/PackagesPage';
import PackageDetailPage from './pages/packages/PackageDetailPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import SupplyOrdersPage from './pages/supply-orders/SupplyOrdersPage';
import MessagingLogsPage from './pages/messaging/MessagingLogsPage';

const CustomerDetailWrap = () => { const { id = '0' } = useParams(); return <CustomerDetailPage id={id} />; };
const ShipmentDetailWrap = () => { const { id = '0' } = useParams(); return <ShipmentDetailPage id={id} />; };
const PackageDetailWrap = () => { const { id = '0' } = useParams(); return <PackageDetailPage id={id} />; };

export const Protected: React.FC = () => {
  const isAuthenticated = useAppSelector((s) => s.user.isAuthenticated);
  const currentUser = useAppSelector((s) => s.user);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const userApplications = applications(currentUser);
  const shippingApp = userApplications['shipping'];
  const modules = Object.values(shippingApp.modules);
  const pages = modules.map(m => m.title);
  const links = modules.map(m => m.route);

  return (
    <Routes>
      <Route path="" element={<GenericLayout pages={pages} links={links} appName="Shipping Platform" />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/:id" element={<CustomerDetailWrap />} />
        <Route path="/warehouses" element={<WarehousesPage />} />
        <Route path="/good-types" element={<GoodTypesPage />} />
        <Route path="/goods" element={<GoodsPage />} />
        <Route path="/pricing-configs" element={<PricingConfigsPage />} />
        <Route path="/shipments" element={<ShipmentsPage />} />
        <Route path="/shipments/:id" element={<ShipmentDetailWrap />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/packages/:id" element={<PackageDetailWrap />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/supply-orders" element={<SupplyOrdersPage />} />
        <Route path="/messaging-logs" element={<MessagingLogsPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
};
