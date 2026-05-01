import { IApplication } from './IApplication';
import { IUserStore } from './redux/user/types';
import { MODULE_ACCESS, UserRole } from './helpers/rbac';

export const applications = (_user: IUserStore): Record<string, IApplication> => {
  const role = (_user.role || 'Field') as UserRole;
  const canSee = (mod: string) => MODULE_ACCESS[mod]?.includes(role) ?? false;

  return {
    operations: {
      title: 'Operations',
      name: 'operations',
      route: '/ops',
      modules: {
        dashboard: { name: 'dashboard', route: '/ops/dashboard', title: 'Dashboard', hidden: !canSee('dashboard') },
        shipments: { name: 'shipments', route: '/ops/shipments', title: 'Shipments', hidden: !canSee('shipments') },
        packages: { name: 'packages', route: '/ops/packages', title: 'Packages', hidden: !canSee('packages') },
      }
    },
    masterData: {
      title: 'Master Data',
      name: 'masterData',
      route: '/master',
      modules: {
        customers: { name: 'customers', route: '/master/customers', title: 'Customers', hidden: !canSee('customers') },
        warehouses: { name: 'warehouses', route: '/master/warehouses', title: 'Warehouses', hidden: !canSee('warehouses') },
        goodTypes: { name: 'goodTypes', route: '/master/good-types', title: 'Good Types', hidden: !canSee('goodTypes') },
        pricing: { name: 'pricing', route: '/master/pricing-configs', title: 'Pricing', hidden: !canSee('pricing') },
        suppliers: { name: 'suppliers', route: '/master/suppliers', title: 'Suppliers', hidden: !canSee('suppliers') },
        supplyOrders: { name: 'supplyOrders', route: '/master/supply-orders', title: 'Supply Orders', hidden: !canSee('supplyOrders') },
        currencies: { name: 'currencies', route: '/master/currencies', title: 'Currencies', hidden: !canSee('currencies') },
      }
    },
    communications: {
      title: 'Communications',
      name: 'communications',
      route: '/comms',
      modules: {
        messaging: { name: 'messaging', route: '/comms/messaging-logs', title: 'Messaging Logs', hidden: !canSee('messaging') },
        groupHelper: { name: 'groupHelper', route: '/comms/group-helper-export', title: 'Group Helper Export', hidden: !canSee('groupHelper') },
      }
    },
    admin: {
      title: 'Admin',
      name: 'admin',
      route: '/admin',
      hidden: !canSee('users'),
      modules: {
        users: { name: 'users', route: '/admin/users', title: 'Users', hidden: !canSee('users') },
      }
    }
  };
};
