import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = ({ redirectTo = "/login" }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export const RoleRoute = ({ role, redirectTo = "/" }) => {
  const { user } = useAuth();
  if (!user || user.role !== role) {
    return <Navigate to={redirectTo} replace />;
  }
  return <Outlet />;
};
