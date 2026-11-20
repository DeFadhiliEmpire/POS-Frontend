import { useState, useCallback, useEffect, useRef } from "react";

import { AuthContext } from "./AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const REFRESH_BEFORE_EXPIRY = 60 * 1000; // 1 minute
const RETRY_INTERVAL = 30 * 1000; // 30 seconds

// Prevent multiple simultaneous refresh requests.
let refreshPromise = null;

// Extract JWT expiry time.
function getTokenExpiry(token) {
  try {
    const payload = token.split(".")[1];

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");

    const decoded = JSON.parse(atob(base64));

    return decoded.exp * 1000;
  } catch (error) {
    console.error("Unable to decode access token:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, updateAccessToken] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");

  const accessTokenRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const retryTimerRef = useRef(null);

  // Keep React state and the token reference synchronized.
  const setAccessToken = useCallback((token) => {
    accessTokenRef.current = token;
    updateAccessToken(token);

    if (token) {
      setAuthStatus("authenticated");
    } else {
      setAuthStatus("unauthenticated");
    }
  }, []);

  // Remove the current authentication session.
  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    updateAccessToken(null);
    setUser(null);
    setAuthStatus("unauthenticated");
  }, []);

  // Refresh access token using the HTTP-only cookie.
  const refreshAccessToken = useCallback(async () => {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const response = await fetch(`${API_URL}/auth/refresh-token`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        // The refresh session is no longer valid.
        if (response.status === 401 || response.status === 403) {
          clearSession();
          throw new Error("SESSION_INVALID");
        }

        if (!response.ok) {
          throw new Error("SERVER_UNAVAILABLE");
        }

        const data = await response.json();

        if (!data.success || !data.accessToken) {
          throw new Error("INVALID_REFRESH_RESPONSE");
        }

        // Replace the old access token.
        accessTokenRef.current = data.accessToken;
        updateAccessToken(data.accessToken);

        return data.accessToken;
      })().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  }, [clearSession]);

  // Restore the session after a browser reload.
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const token = await refreshAccessToken();

        if (!active) return;

        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error("SESSION_INVALID");
        }

        if (!response.ok) {
          throw new Error("SERVER_UNAVAILABLE");
        }

        const data = await response.json();

        if (!data.success || !data.user) {
          throw new Error("INVALID_USER_RESPONSE");
        }

        if (!active) return;

        setUser(data.user);
        setAuthStatus("authenticated");
      } catch (error) {
        if (!active) return;

        console.error("Session initialization failed:", error);

        if (error.message === "SESSION_INVALID") {
          clearSession();
        } else {
          // Preserve locally available data during network failure.
          setAuthStatus("offline");
        }
      }
    };

    initializeAuth();

    return () => {
      active = false;
    };
  }, [refreshAccessToken, clearSession]);

  // Automatically refresh before access-token expiry.
  useEffect(() => {
    if (authStatus !== "authenticated" || !accessToken) {
      return;
    }

    const expiryTime = getTokenExpiry(accessToken);

    if (!expiryTime) {
      console.error("Access token has no readable expiry.");
      return;
    }

    const refreshIn = Math.max(
      expiryTime - Date.now() - REFRESH_BEFORE_EXPIRY,
      0,
    );

    const attemptRefresh = async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        if (error.message === "SESSION_INVALID") {
          return;
        }

        console.warn("Automatic token refresh failed. Retrying shortly.");

        // Retry temporary network/server failures.
        retryTimerRef.current = setTimeout(attemptRefresh, RETRY_INTERVAL);
      }
    };

    refreshTimerRef.current = setTimeout(attemptRefresh, refreshIn);

    return () => {
      clearTimeout(refreshTimerRef.current);
      clearTimeout(retryTimerRef.current);
    };
  }, [accessToken, authStatus, refreshAccessToken]);

  // Return a usable token to API services.
  const getToken = useCallback(async () => {
    const currentToken = accessTokenRef.current;

    if (!currentToken) return null;

    const expiryTime = getTokenExpiry(currentToken);

    if (!expiryTime) return currentToken;

    // Refresh immediately if the token is close to expiry.
    if (expiryTime - Date.now() <= REFRESH_BEFORE_EXPIRY) {
      return refreshAccessToken();
    }

    return currentToken;
  }, [refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        getToken,
        refreshAccessToken,
        clearSession,
        authStatus,
        isAuthenticated: authStatus === "authenticated",
        isInitializing: authStatus === "loading",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
