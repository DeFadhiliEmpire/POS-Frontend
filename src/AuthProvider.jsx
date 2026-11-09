import { useState } from "react";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const getToken = async () => {
    if (accessToken && accessToken !== "") {
      return accessToken;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, accessToken, setAccessToken, getToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}
