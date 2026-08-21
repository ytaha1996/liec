import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useUserRole, canSee } from '@/helpers/rbac';

// Route-level RBAC guard — mirrors frontend/src/Protected.tsx behaviour.
// Nav hiding alone is not enforcement: without this, any authenticated user
// could deep-link to /admin/users etc. and read the rendered data.
export function RequireModule({ module, children }: { module: string; children: ReactNode }) {
  const role = useUserRole();
  if (!canSee(role, module)) {
    return <Navigate to="/ops/dashboard" replace />;
  }
  return <>{children}</>;
}
