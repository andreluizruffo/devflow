import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageSpinner } from '../../components/FullPageSpinner';
import { useAuth } from './use-auth';

// Pages that need a logged-in user. Visitors go to /login and come back afterwards.
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

// Login and sign-up pages: a user who is already logged in goes straight to the app.
export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
