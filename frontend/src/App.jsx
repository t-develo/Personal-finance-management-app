import React, { useState, useEffect, useCallback } from "react";
import { fetchAuthStatus, logout as apiLogout, refreshToken } from "./api/client";
import LoginPage from "./components/LoginPage";
import AuthenticatedApp from "./components/AuthenticatedApp";

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authState, setAuthState] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const status = await fetchAuthStatus();
      setAuthState(status);
    } catch {
      setAuthState({ registered: true, authenticated: false });
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Token refresh every 6 hours
  useEffect(() => {
    if (!authState?.authenticated) return;
    const interval = setInterval(() => {
      refreshToken().catch(() => {
        setAuthState({ registered: true, authenticated: false });
      });
    }, 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authState?.authenticated]);

  // Listen for unauthorized events from api/client.js
  useEffect(() => {
    const handler = () => {
      setAuthState({ registered: true, authenticated: false });
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, []);

  const handleAuthSuccess = useCallback((userData) => {
    setAuthState({ registered: true, authenticated: true, user: userData });
  }, []);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setAuthState({ registered: true, authenticated: false });
  }, []);

  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0f1218",
          color: "#6b7585",
        }}
      >
        読み込み中...
      </div>
    );
  }

  if (!authState?.registered) {
    return <LoginPage isRegistration={true} onSuccess={handleAuthSuccess} />;
  }

  if (!authState?.authenticated) {
    return <LoginPage isRegistration={false} onSuccess={handleAuthSuccess} />;
  }

  return <AuthenticatedApp onLogout={handleLogout} />;
}
