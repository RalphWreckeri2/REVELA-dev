import { createContext, useContext, useState } from "react";
import { loginRequest, getMeRequest } from "../services/api";

const AuthContext = createContext(null);

export { AuthContext };

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  async function login(email, password) {
    const data = await loginRequest(email, password);

    // If 2FA is required, return early without setting token
    if (data.status === "2fa_required") {
      return data;  // ← LoginPage checks this
    }

    // ── Role gate: block non-admin roles BEFORE the token is ever stored ──
    const role = data.user?.userRole;
    if (!["Admin", "SUPER_ADMIN", "System Administrator"].includes(role)) {
      throw new Error("Access denied. This portal is for Admin and Super Admin only.");
    }

    setToken(data.access_token);
    const me = await getMeRequest(data.access_token);
    setUser(me);
    return { ...data, user: me };
  }

  // Called after 2FA verification succeeds
  async function completeLogin(accessToken) {
    const me = await getMeRequest(accessToken);
    // Role gate: block non-admin roles from storing a session
    if (!["Admin", "SUPER_ADMIN", "System Administrator"].includes(me?.role)) {
      throw new Error("Access denied. This portal is for Admin and Super Admin only.");
    }
    setToken(accessToken);
    setUser(me);
    return me;
  }

  async function refreshUser() {
    if (token) {
      const me = await getMeRequest(token);
      setUser(me);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, completeLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}