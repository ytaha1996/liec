import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
const CustomerDetailWrap = () => { const { id = '0' } = useParams(); return _jsx(CustomerDetailPage, { id: id }); };
const ShipmentDetailWrap = () => { const { id = '0' } = useParams(); return _jsx(ShipmentDetailPage, { id: id }); };
const PackageDetailWrap = () => { const { id = '0' } = useParams(); return _jsx(PackageDetailPage, { id: id }); };
export const Protected = () => {
    const isAuthenticated = useAppSelector((s) => s.user.isAuthenticated);
    const currentUser = useAppSelector((s) => s.user);
    if (!isAuthenticated)
        return _jsx(Navigate, { to: "/login", replace: true });
    const userApplications = applications(currentUser);
    const shippingApp = userApplications['shipping'];
    const modules = Object.values(shippingApp.modules);
    const pages = modules.map(m => m.title);
    const links = modules.map(m => m.route);
    return (_jsx(Routes, { children: _jsxs(Route, { path: "", element: _jsx(GenericLayout, { pages: pages, links: links, appName: "Shipping Platform" }), children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/customers", element: _jsx(CustomersPage, {}) }), _jsx(Route, { path: "/customers/:id", element: _jsx(CustomerDetailWrap, {}) }), _jsx(Route, { path: "/warehouses", element: _jsx(WarehousesPage, {}) }), _jsx(Route, { path: "/good-types", element: _jsx(GoodTypesPage, {}) }), _jsx(Route, { path: "/goods", element: _jsx(GoodsPage, {}) }), _jsx(Route, { path: "/pricing-configs", element: _jsx(PricingConfigsPage, {}) }), _jsx(Route, { path: "/shipments", element: _jsx(ShipmentsPage, {}) }), _jsx(Route, { path: "/shipments/:id", element: _jsx(ShipmentDetailWrap, {}) }), _jsx(Route, { path: "/packages", element: _jsx(PackagesPage, {}) }), _jsx(Route, { path: "/packages/:id", element: _jsx(PackageDetailWrap, {}) }), _jsx(Route, { path: "/suppliers", element: _jsx(SuppliersPage, {}) }), _jsx(Route, { path: "/supply-orders", element: _jsx(SupplyOrdersPage, {}) }), _jsx(Route, { path: "/messaging-logs", element: _jsx(MessagingLogsPage, {}) }), _jsx(Route, { path: "*", element: _jsx(DashboardPage, {}) })] }) }));
};
