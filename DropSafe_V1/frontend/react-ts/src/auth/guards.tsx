import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FullPageLoading } from '../components/ui/primitives';

/** Requires an authenticated session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoading label="Restoring session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

/** Requires at least one of the given permissions (PRD §7: permission checks enforce authorization). */
export function RequirePermission({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { canAny } = useAuth();
  if (!canAny(...anyOf)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

/** Conditionally render children based on permissions — menus, buttons, sensitive panels. */
export function Can({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { canAny } = useAuth();
  if (!canAny(...anyOf)) return null;
  return <>{children}</>;
}
