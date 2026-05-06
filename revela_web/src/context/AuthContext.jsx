import { createContext, useContext, useState } from "react";
import { loginRequest, getMeRequest } from "../services/api";

const AuthContext = createContext(null);

export { AuthContext };

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);   // JWT lives in memory only
  const [user, setUser] = useState(null);

  async function login(email, password) {
    const data = await loginRequest(email, password);  // throws on error
    setToken(data.access_token);

    const me = await getMeRequest(data.access_token);
    setUser(me);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}