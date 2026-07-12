import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { ConfirmationBox } from '@/components/dialogs';
import { ErrorBoundary } from '@/components/feedback';
import { setUnauthorizedHandler } from '@/api/client';
import { useAppDispatch } from '@/redux/hooks';
import { LogoutUser } from '@/redux/user/userReducer';

import LoginPage from '@/pages/auth/LoginPage';
import ProfilePage from '@/pages/auth/ProfilePage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ShipmentsPage from '@/pages/shipments/ShipmentsPage';
import ShipmentDetailPage from '@/pages/shipments/ShipmentDetailPage';
import PackagesPage from '@/pages/packages/PackagesPage';
import PackageDetailPage from '@/pages/packages/PackageDetailPage';
import CustomersPage from '@/pages/customers/CustomersPage';
import CustomerDetailPage from '@/pages/customers/CustomerDetailPage';
import WarehousesPage from '@/pages/warehouses/WarehousesPage';
import GoodTypesPage from '@/pages/good-types/GoodTypesPage';
import PricingConfigsPage from '@/pages/pricing/PricingConfigsPage';
import SuppliersPage from '@/pages/suppliers/SuppliersPage';
import SupplyOrdersPage from '@/pages/supply-orders/SupplyOrdersPage';
import CurrenciesPage from '@/pages/currencies/CurrenciesPage';
import MessagingLogsPage from '@/pages/messaging/MessagingLogsPage';
import GroupHelperExportPage from '@/pages/messaging/GroupHelperExportPage';
import UsersPage from '@/pages/users/UsersPage';
import NotFoundPage from '@/pages/NotFoundPage';

function AuthBridge() {
  // Wire the 401 handler now that the React tree is mounted — DataService
  // calls `onUnauthorized` whenever the backend returns 401, and we want it
  // to dispatch logout + redirect using the live store/router.
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  useEffect(() => {
    setUnauthorizedHandler(() => {
      dispatch(LogoutUser());
      navigate('/login', { replace: true });
    });
  }, [dispatch, navigate]);
  return null;
}

function ProtectedLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthBridge />
      <ConfirmationBox />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/ops/dashboard" replace />} />

          {/* Operations */}
          <Route path="/ops/dashboard" element={<DashboardPage />} />
          <Route path="/ops/shipments" element={<ShipmentsPage />} />
          <Route path="/ops/shipments/:id" element={<ShipmentDetailPage />} />
          <Route path="/ops/packages" element={<PackagesPage />} />
          <Route path="/ops/packages/:id" element={<PackageDetailPage />} />

          {/* Master Data */}
          <Route path="/master/customers" element={<CustomersPage />} />
          <Route path="/master/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/master/warehouses" element={<WarehousesPage />} />
          <Route path="/master/good-types" element={<GoodTypesPage />} />
          <Route path="/master/pricing-configs" element={<PricingConfigsPage />} />
          <Route path="/master/suppliers" element={<SuppliersPage />} />
          <Route path="/master/supply-orders" element={<SupplyOrdersPage />} />
          <Route path="/master/currencies" element={<CurrenciesPage />} />

          {/* Communications */}
          <Route path="/comms/messaging-logs" element={<MessagingLogsPage />} />
          <Route path="/comms/group-helper-export" element={<GroupHelperExportPage />} />

          {/* Admin */}
          <Route path="/admin/users" element={<UsersPage />} />

          {/* Profile */}
          <Route path="/profile" element={<ProfilePage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
