import React from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAppSelector } from './redux/hooks';
import GenericLayout from './layouts/GenericLayout/GenericLayout';
import { applications } from './application';

import DashboardPage from './pages/dashboard/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerDetailPage from './pages/customers/CustomerDetailPage';
import WarehousesPage from './pages/warehouses/WarehousesPage';
import GoodTypesPage from './pages/good-types/GoodTypesPage';
import PricingConfigsPage from './pages/pricing/PricingConfigsPage';
import ShipmentsPage from './pages/shipments/ShipmentsPage';
import ShipmentDetailPage from './pages/shipments/ShipmentDetailPage';
import PackagesPage from './pages/packages/PackagesPage';
import PackageDetailPage from './pages/packages/PackageDetailPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import SupplyOrdersPage from './pages/supply-orders/SupplyOrdersPage';
import MessagingLogsPage from './pages/messaging/MessagingLogsPage';
import GroupHelperExportPage from './pages/messaging/GroupHelperExportPage';

const CustomerDetailWrap = () => { const { id = '0' } = useParams(); return <CustomerDetailPage id={id} />; };
const ShipmentDetailWrap = () => { const { id = '0' } = useParams(); return <ShipmentDetailPage id={id} />; };
const PackageDetailWrap = () => { const { id = '0' } = useParams(); return <PackageDetailPage id={id} />; };

export const Protected: React.FC = () => {
  const isAuthenticated = useAppSelector((s) => s.user.isAuthenticated);
  const currentUser = useAppSelector((s) => s.user);
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const userApplications = applications(currentUser);
  const prefix = location.pathname.startsWith('/master')
    ? 'masterData'
    : location.pathname.startsWith('/comms')
      ? 'communications'
      : 'operations';

  const currentApp = userApplications[prefix];
  const modules = Object.values(currentApp.modules);
  const pages = modules.map(m => m.title);
  const links = modules.map(m => m.route);

  return (
    <Routes>
      <Route path="" element={<GenericLayout pages={pages} links={links} appName={`Shipping Platform — ${currentApp.title}`} />}>
        <Route path="/" element={<Navigate to="/ops/dashboard" replace />} />

        <Route path="/ops/dashboard" element={<DashboardPage />} />
        <Route path="/ops/shipments" element={<ShipmentsPage />} />
        <Route path="/ops/shipments/:id" element={<ShipmentDetailWrap />} />
        <Route path="/ops/packages" element={<PackagesPage />} />
        <Route path="/ops/packages/:id" element={<PackageDetailWrap />} />

        <Route path="/master/customers" element={<CustomersPage />} />
        <Route path="/master/customers/:id" element={<CustomerDetailWrap />} />
        <Route path="/master/warehouses" element={<WarehousesPage />} />
        <Route path="/master/good-types" element={<GoodTypesPage />} />
        <Route path="/master/pricing-configs" element={<PricingConfigsPage />} />
        <Route path="/master/suppliers" element={<SuppliersPage />} />
        <Route path="/master/supply-orders" element={<SupplyOrdersPage />} />

        <Route path="/comms/messaging-logs" element={<MessagingLogsPage />} />
        <Route path="/comms/group-helper-export" element={<GroupHelperExportPage />} />

        <Route path="*" element={<Navigate to="/ops/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
