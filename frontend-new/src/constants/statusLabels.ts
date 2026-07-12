export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Scheduled: 'Scheduled',
  ReadyToDepart: 'Ready to Depart',
  Departed: 'Departed',
  Arrived: 'Arrived',
  Closed: 'Closed',
  Cancelled: 'Cancelled',
};

export const PKG_STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Received: 'Received',
  Packed: 'Packed',
  ReadyToShip: 'Ready to Ship',
  Shipped: 'Shipped',
  ArrivedAtDestination: 'Arrived at Destination',
  ReadyForHandout: 'Ready for Handout',
  HandedOut: 'Handed Out',
  Cancelled: 'Cancelled',
};

export const SUPPLY_ORDER_STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Approved: 'Approved',
  Ordered: 'Ordered',
  DeliveredToWarehouse: 'Delivered to Warehouse',
  PackedIntoPackage: 'Packed into Package',
  Closed: 'Closed',
  Cancelled: 'Cancelled',
};

export const PRICING_CONFIG_STATUS_LABELS: Record<string, string> = {
  Draft: 'Draft',
  Scheduled: 'Scheduled',
  Active: 'Active',
  Retired: 'Retired',
};
