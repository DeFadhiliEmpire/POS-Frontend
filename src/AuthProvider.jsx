import { useState, useCallback, useEffect } from "react";
import { AuthContext } from "./AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Prevent duplicate refresh requests, especially in React StrictMode.
let refreshPromise = null;

async function restoreSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      // Step 1: Exchange the HTTP-only cookie for a new access token.
      const refreshResponse = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!refreshResponse.ok) {
        throw new Error("SESSION_INVALID");
      }

      const refreshData = await refreshResponse.json();

      if (!refreshData.success || !refreshData.accessToken) {
        throw new Error("SESSION_INVALID");
      }

      const newAccessToken = refreshData.accessToken;

      // Step 2: Retrieve the currently authenticated user.
      const userResponse = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${newAccessToken}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("SESSION_INVALID");
      }

      const userData = await userResponse.json();

      if (!userData.success || !userData.user) {
        throw new Error("SESSION_INVALID");
      }

      return {
        accessToken: newAccessToken,
        user: userData.user,
      };
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, updateAccessToken] = useState(null);

  const [authStatus, setAuthStatus] = useState("loading");

  // Centralized access-token setter.
  const setAccessToken = useCallback((token) => {
    updateAccessToken(token);

    if (token) {
      setAuthStatus("authenticated");
    } else {
      setAuthStatus("unauthenticated");
    }
  }, []);

  // Restore authentication when the application initializes.
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const session = await restoreSession();

        if (!active) return;

        updateAccessToken(session.accessToken);
        setUser(session.user);
        setAuthStatus("authenticated");
      } catch (error) {
        if (!active) return;

        console.error("Session restoration failed:", error);

        updateAccessToken(null);
        setUser(null);

        // Network failure is not necessarily an expired session.
        setAuthStatus(
          error.message === "SESSION_INVALID" ? "unauthenticated" : "offline",
        );
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, []);

  const getToken = useCallback(async () => {
    return accessToken || null;
  }, [accessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        getToken,
        authStatus,
        isAuthenticated: authStatus === "authenticated",
        isInitializing: authStatus === "loading",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
