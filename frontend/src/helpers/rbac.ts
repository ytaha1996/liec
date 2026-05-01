import { useAppSelector } from '../redux/hooks';

export type UserRole = 'Admin' | 'Manager' | 'Accountant' | 'Field';

export const useUserRole = (): UserRole => {
  const role = useAppSelector((s) => s.user.role);
  return (role as UserRole) || 'Field';
};

export const MODULE_ACCESS: Record<string, UserRole[]> = {
  dashboard:    ['Admin', 'Manager', 'Accountant', 'Field'],
  shipments:    ['Admin', 'Manager', 'Accountant', 'Field'],
  packages:     ['Admin', 'Manager', 'Accountant', 'Field'],
  customers:    ['Admin', 'Manager', 'Accountant'],
  warehouses:   ['Admin', 'Manager', 'Accountant', 'Field'],
  goodTypes:    ['Admin', 'Manager', 'Accountant', 'Field'],
  pricing:      ['Admin', 'Manager', 'Accountant'],
  suppliers:    ['Admin', 'Manager', 'Accountant'],
  supplyOrders: ['Admin', 'Manager', 'Accountant'],
  currencies:   ['Admin', 'Manager', 'Accountant'],
  messaging:    ['Admin', 'Manager', 'Accountant'],
  groupHelper:  ['Admin', 'Manager', 'Accountant'],
  users:        ['Admin', 'Manager'],
};

export const canWriteMasterData = (role: UserRole): boolean =>
  role === 'Admin' || role === 'Manager';

export const canManageShipments = (role: UserRole): boolean =>
  role === 'Admin' || role === 'Manager';

export const canManageUsers = (role: UserRole): boolean =>
  role === 'Admin';

export const FIELD_PKG_TRANSITIONS = new Set(['receive', 'pack', 'ready-to-ship']);

export const canTransitionPackage = (role: UserRole, action: string): boolean => {
  if (role === 'Admin' || role === 'Manager') return true;
  if (role === 'Field') return FIELD_PKG_TRANSITIONS.has(action);
  return false;
};

export const canEditPackageItems = (role: UserRole): boolean =>
  role === 'Admin' || role === 'Manager' || role === 'Field';

export const canUploadPhotos = (role: UserRole): boolean =>
  role === 'Admin' || role === 'Manager' || role === 'Field';

export const canOverridePricing = (role: UserRole): boolean =>
  role === 'Admin' || role === 'Manager' || role === 'Accountant';

export const canSendWhatsApp = (role: UserRole): boolean =>
  role === 'Admin' || role === 'Manager';

export const canExport = (role: UserRole): boolean =>
  role === 'Admin' || role === 'Manager' || role === 'Accountant';
