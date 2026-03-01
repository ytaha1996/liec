import { IApplication } from './IApplication';
import { IUserStore } from './redux/user/types';

export const applications = (_user: IUserStore): Record<string, IApplication> => {
  return {
    operations: {
      title: 'Operations',
      name: 'operations',
      route: '/ops',
      modules: {
        dashboard: { name: 'dashboard', route: '/ops/dashboard', title: 'Dashboard' },
        shipments: { name: 'shipments', route: '/ops/shipments', title: 'Shipments' },
        packages: { name: 'packages', route: '/ops/packages', title: 'Packages' },
      }
    },
    masterData: {
      title: 'Master Data',
      name: 'masterData',
      route: '/master',
      modules: {
        customers: { name: 'customers', route: '/master/customers', title: 'Customers' },
        warehouses: { name: 'warehouses', route: '/master/warehouses', title: 'Warehouses' },
        goodTypes: { name: 'goodTypes', route: '/master/good-types', title: 'Good Types' },
        pricing: { name: 'pricing', route: '/master/pricing-configs', title: 'Pricing' },
        suppliers: { name: 'suppliers', route: '/master/suppliers', title: 'Suppliers' },
        supplyOrders: { name: 'supplyOrders', route: '/master/supply-orders', title: 'Supply Orders' },
      }
    },
    communications: {
      title: 'Communications',
      name: 'communications',
      route: '/comms',
      modules: {
        messaging: { name: 'messaging', route: '/comms/messaging-logs', title: 'Messaging Logs' },
        groupHelper: { name: 'groupHelper', route: '/comms/group-helper-export', title: 'Group Helper Export' },
      }
    }
  };
};
