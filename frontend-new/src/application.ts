import {
  LayoutDashboard,
  Ship,
  Users,
  Warehouse,
  Tag,
  DollarSign,
  Building2,
  ShoppingCart,
  Coins,
  MessageSquare,
  FileDown,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { canSee, type UserRole } from '@/helpers/rbac';

export interface AppModule {
  name: string;
  route: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  hidden: boolean;
}

export interface AppGroup {
  name: string;
  title: string;
  route: string;
  // Accent color drives the launcher tile + section header.
  color: string;
  modules: AppModule[];
}

const visible = (role: UserRole, moduleKey: string): boolean => canSee(role, moduleKey);

export const buildApplications = (role: UserRole): AppGroup[] => {
  const groups: AppGroup[] = [
    {
      name: 'operations',
      title: 'Operations',
      route: '/ops',
      color: '#00A6A6',
      modules: [
        { name: 'dashboard', route: '/ops/dashboard', title: 'Dashboard', description: 'Live overview', icon: LayoutDashboard, hidden: !visible(role, 'dashboard') },
        { name: 'shipments', route: '/ops/shipments', title: 'Shipments', description: 'Containers & routes', icon: Ship, hidden: !visible(role, 'shipments') },
      ],
    },
    {
      name: 'masterData',
      title: 'Master Data',
      route: '/master',
      color: '#243043',
      modules: [
        { name: 'customers', route: '/master/customers', title: 'Customers', description: 'Customer records', icon: Users, hidden: !visible(role, 'customers') },
        { name: 'warehouses', route: '/master/warehouses', title: 'Warehouses', description: 'Origin & destination', icon: Warehouse, hidden: !visible(role, 'warehouses') },
        { name: 'goodTypes', route: '/master/good-types', title: 'Good Types', description: 'Item categories', icon: Tag, hidden: !visible(role, 'goodTypes') },
        { name: 'pricing', route: '/master/pricing-configs', title: 'Pricing', description: 'Rate configs', icon: DollarSign, hidden: !visible(role, 'pricing') },
        { name: 'suppliers', route: '/master/suppliers', title: 'Suppliers', description: 'Vendor list', icon: Building2, hidden: !visible(role, 'suppliers') },
        { name: 'supplyOrders', route: '/master/supply-orders', title: 'Supply Orders', description: 'Procurement', icon: ShoppingCart, hidden: !visible(role, 'supplyOrders') },
        { name: 'currencies', route: '/master/currencies', title: 'Currencies', description: 'FX rate chain', icon: Coins, hidden: !visible(role, 'currencies') },
      ],
    },
    {
      name: 'communications',
      title: 'Communications',
      route: '/comms',
      color: '#7B5EA7',
      modules: [
        { name: 'messaging', route: '/comms/messaging-logs', title: 'Messaging Logs', description: 'WhatsApp campaigns', icon: MessageSquare, hidden: !visible(role, 'messaging') },
        { name: 'groupHelper', route: '/comms/group-helper-export', title: 'Group Export', description: 'Bulk contacts', icon: FileDown, hidden: !visible(role, 'groupHelper') },
      ],
    },
    {
      name: 'admin',
      title: 'Admin',
      route: '/admin',
      color: '#c62828',
      modules: [
        { name: 'users', route: '/admin/users', title: 'Users', description: 'Team & roles', icon: UserCog, hidden: !visible(role, 'users') },
      ],
    },
  ];

  // Drop modules the user can't see, then drop whole apps that have no visible modules.
  return groups
    .map((g) => ({ ...g, modules: g.modules.filter((m) => !m.hidden) }))
    .filter((g) => g.modules.length > 0);
};

// Resolve the current "app" from the URL prefix so the header can show only
// that app's modules in its primary nav.
export const currentAppFromPath = (groups: AppGroup[], pathname: string): AppGroup | null => {
  return groups.find((g) => pathname.startsWith(g.route)) ?? groups[0] ?? null;
};
