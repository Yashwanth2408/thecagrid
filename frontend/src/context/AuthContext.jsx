import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    try {
      const r = await api.get("/stats/me");
      setStats(r.data);
      return r.data;
    } catch {
      setStats(null);
      return null;
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
      // pull stats too (best-effort)
      api.get("/stats/me").then((s) => setStats(s.data)).catch(() => {});
    } catch {
      setUser(null);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
    setStats(null);
  }, []);

  const value = { user, setUser, stats, setStats, refreshStats, loading, refresh: checkAuth, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
