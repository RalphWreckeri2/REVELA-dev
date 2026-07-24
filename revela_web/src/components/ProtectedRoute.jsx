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
  if (!user) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        backgroundColor: '#f0f4f0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        overflow: 'hidden',
        zIndex: 9999
      }}>
        <div style={{
           position: 'absolute',
           top: '35%',
           left: '50%',
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           gap: '20px',
           transform: 'translate(-50%, -50%)'
        }}>
          <div style={{
            width: '48px', height: '48px',
            border: '5px solid rgba(86, 171, 47, 0.2)',
            borderTopColor: '#56ab2f',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <h2 style={{ color: '#1a3a1a', fontWeight: '700', letterSpacing: '-0.5px', fontSize: '24px', margin: 0 }}>
            Verifying Access...
          </h2>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        <img 
          src="/searching.png" 
          alt="Revela Mascot Peaking" 
          style={{
            height: '50vh',
            width: 'auto',
            objectFit: 'contain',
            objectPosition: 'bottom',
            transform: 'translateY(15%)',
            filter: 'drop-shadow(0 -10px 20px rgba(26,58,26,0.15))'
          }} 
        />
      </div>
    );
  }

  // Logged in but role is not permitted to use the web dashboard
  if (isForbidden) {
    return <Navigate to="/" replace />;
  }

  return children;
}