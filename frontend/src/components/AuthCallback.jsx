import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const sessionId = new URLSearchParams(hash.replace(/^#/, "")).get("session_id");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const r = await api.post("/auth/google/session", null, {
          headers: { "X-Session-ID": sessionId },
        });
        setUser(r.data.user);
        // clean the URL fragment
        window.history.replaceState(null, "", window.location.pathname);
        const dest = r.data.user?.onboarded ? "/dashboard" : "/onboarding";
        navigate(dest, { replace: true, state: { user: r.data.user } });
      } catch (e) {
        navigate("/login?error=oauth", { replace: true });
      }
    })();
  }, [location.hash, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] text-[#F5F5F7]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6"
        data-testid="auth-callback-loading"
      >
        <Logo size={40} />
        <div className="text-sm text-[#A1A1AA] tracking-tight">Signing you in…</div>
        <div className="h-1 w-40 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-[#7C3AED]"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
