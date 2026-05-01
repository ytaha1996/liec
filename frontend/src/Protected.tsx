import React from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAppSelector } from './redux/hooks';
import GenericLayout from './layouts/GenericLayout/GenericLayout';
import { applications } from './application';
import { MODULE_ACCESS, UserRole } from './helpers/rbac';

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
import CurrenciesPage from './pages/currencies/CurrenciesPage';
import MessagingLogsPage from './pages/messaging/MessagingLogsPage';
import GroupHelperExportPage from './pages/messaging/GroupHelperExportPage';
import UsersPage from './pages/users/UsersPage';
import NotFoundPage from './pages/NotFoundPage';

const CustomerDetailWrap = () => { const { id = '0' } = useParams(); return <CustomerDetailPage id={id} />; };
const ShipmentDetailWrap = () => { const { id = '0' } = useParams(); return <ShipmentDetailPage id={id} />; };
const PackageDetailWrap = () => { const { id = '0' } = useParams(); return <PackageDetailPage id={id} />; };

export const Protected: React.FC = () => {
  const isAuthenticated = useAppSelector((s) => s.user.isAuthenticated);
  const currentUser = useAppSelector((s) => s.user);
  const location = useLocation();
  const role = (currentUser.role || 'Field') as UserRole;
  const can = (mod: string) => MODULE_ACCESS[mod]?.includes(role) ?? false;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const userApplications = applications(currentUser);
  const prefix = location.pathname.startsWith('/admin')
    ? 'admin'
    : location.pathname.startsWith('/master')
      ? 'masterData'
      : location.pathname.startsWith('/comms')
        ? 'communications'
        : 'operations';

  const currentApp = userApplications[prefix] ?? userApplications['operations'];
  const visibleModules = Object.values(currentApp.modules).filter(m => !m.hidden);
  const pages = visibleModules.map(m => m.title);
  const links = visibleModules.map(m => m.route);

  return (
    <Routes>
      <Route path="" element={<GenericLayout pages={pages} links={links} appName={`Shipping Platform — ${currentApp.title}`} />}>
        <Route path="/" element={<Navigate to="/ops/dashboard" replace />} />

        <Route path="/ops/dashboard" element={<DashboardPage />} />
        <Route path="/ops/shipments" element={<ShipmentsPage />} />
        <Route path="/ops/shipments/:id" element={<ShipmentDetailWrap />} />
        <Route path="/ops/packages" element={<PackagesPage />} />
        <Route path="/ops/packages/:id" element={<PackageDetailWrap />} />

        {can('customers') && <Route path="/master/customers" element={<CustomersPage />} />}
        {can('customers') && <Route path="/master/customers/:id" element={<CustomerDetailWrap />} />}
        {can('warehouses') && <Route path="/master/warehouses" element={<WarehousesPage />} />}
        {can('goodTypes') && <Route path="/master/good-types" element={<GoodTypesPage />} />}
        {can('pricing') && <Route path="/master/pricing-configs" element={<PricingConfigsPage />} />}
        {can('suppliers') && <Route path="/master/suppliers" element={<SuppliersPage />} />}
        {can('supplyOrders') && <Route path="/master/supply-orders" element={<SupplyOrdersPage />} />}
        {can('currencies') && <Route path="/master/currencies" element={<CurrenciesPage />} />}

        {can('messaging') && <Route path="/comms/messaging-logs" element={<MessagingLogsPage />} />}
        {can('groupHelper') && <Route path="/comms/group-helper-export" element={<GroupHelperExportPage />} />}

        {can('users') && <Route path="/admin/users" element={<UsersPage />} />}

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
