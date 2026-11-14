import { useState, useCallback } from "react";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const getToken = useCallback(async () => {
    return accessToken || null;
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, accessToken, setAccessToken, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
