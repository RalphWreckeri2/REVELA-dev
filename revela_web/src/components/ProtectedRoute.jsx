import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const ALLOWED_ROLES = ["Admin", "SUPER_ADMIN", "System Administrator"];

export default function ProtectedRoute({ children }) {
  const { token, user, logout } = useAuth();

  // If user is loaded and their role is forbidden, clear the session
  const isForbidden = user && !ALLOWED_ROLES.includes(user.role);

  useEffect(() => {
    if (isForbidden) logout();
  }, [isForbidden]);

  // Not logged in at all → back to login
  if (!token) return <Navigate to="/" replace />;

  // Token exists but user profile hasn't loaded yet → wait
  if (!user) return null;

  // Logged in but role is not permitted to use the web dashboard
  if (isForbidden) {
    return <Navigate to="/" replace />;
  }

  return children;
}