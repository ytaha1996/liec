export const applications = (user) => {
    return {
        shipping: {
            title: 'Shipping Platform',
            name: 'shipping',
            route: '/',
            modules: {
                dashboard: { name: 'dashboard', route: '/dashboard', title: 'Dashboard' },
                customers: { name: 'customers', route: '/customers', title: 'Customers' },
                warehouses: { name: 'warehouses', route: '/warehouses', title: 'Warehouses' },
                goodTypes: { name: 'goodTypes', route: '/good-types', title: 'Good Types' },
                goods: { name: 'goods', route: '/goods', title: 'Goods' },
                pricing: { name: 'pricing', route: '/pricing-configs', title: 'Pricing' },
                shipments: { name: 'shipments', route: '/shipments', title: 'Shipments' },
                packages: { name: 'packages', route: '/packages', title: 'Packages' },
                suppliers: { name: 'suppliers', route: '/suppliers', title: 'Suppliers' },
                supplyOrders: { name: 'supplyOrders', route: '/supply-orders', title: 'Supply Orders' },
                messaging: { name: 'messaging', route: '/messaging-logs', title: 'Messaging' },
            }
        }
    };
};
