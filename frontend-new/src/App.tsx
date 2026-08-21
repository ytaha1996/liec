import { useEffect } from 'react';
import { toast } from 'sonner';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { RequireModule } from '@/components/layout/RequireModule';
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
      toast.error('Session expired — please sign in again.');
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
          {/* The package list is hidden — packages are managed from their
              shipment. Individual package pages stay reachable. */}
          <Route path="/ops/packages" element={<Navigate to="/ops/shipments" replace />} />
          <Route path="/ops/packages/:id" element={<PackageDetailPage />} />

          {/* Master Data — module-gated per MODULE_ACCESS */}
          <Route path="/master/customers" element={<RequireModule module="customers"><CustomersPage /></RequireModule>} />
          <Route path="/master/customers/:id" element={<RequireModule module="customers"><CustomerDetailPage /></RequireModule>} />
          <Route path="/master/warehouses" element={<RequireModule module="warehouses"><WarehousesPage /></RequireModule>} />
          <Route path="/master/good-types" element={<RequireModule module="goodTypes"><GoodTypesPage /></RequireModule>} />
          <Route path="/master/pricing-configs" element={<RequireModule module="pricing"><PricingConfigsPage /></RequireModule>} />
          <Route path="/master/suppliers" element={<RequireModule module="suppliers"><SuppliersPage /></RequireModule>} />
          <Route path="/master/supply-orders" element={<RequireModule module="supplyOrders"><SupplyOrdersPage /></RequireModule>} />
          <Route path="/master/currencies" element={<RequireModule module="currencies"><CurrenciesPage /></RequireModule>} />

          {/* Communications */}
          <Route path="/comms/messaging-logs" element={<RequireModule module="messaging"><MessagingLogsPage /></RequireModule>} />
          <Route path="/comms/group-helper-export" element={<RequireModule module="groupHelper"><GroupHelperExportPage /></RequireModule>} />

          {/* Admin */}
          <Route path="/admin/users" element={<RequireModule module="users"><UsersPage /></RequireModule>} />

          {/* Profile */}
          <Route path="/profile" element={<ProfilePage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
