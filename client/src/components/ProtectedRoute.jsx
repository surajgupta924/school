import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectIsAuthenticated, selectRole } from '../features/auth/authSlice';
import { EmptyState } from './ui';
import { IconShield } from './Icons';

export default function ProtectedRoute({ roles }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectRole);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(role)) {
    return (
      <div className="card">
        <EmptyState
          icon={<IconShield size={22} />}
          title="Restricted area"
          text={`This section is available to ${roles.join(', ')} accounts. You are signed in as ${role}.`}
        />
      </div>
    );
  }

  return <Outlet />;
}
