import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { GoogleLink, TextField, SubmitLink } from "@/components/AuthShell";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const googleEnabled = Boolean(process.env.REACT_APP_GOOGLE_AUTH_URL);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await api.post("/auth/login", { email, password });
      setUser(r.data.user);
      navigate(r.data.user?.onboarded ? "/dashboard" : "/onboarding", { replace: true });
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="[ 001 / RETURN ]"
      title="Welcome back."
      testId="login-page"
      footer={
        <>
          new to the grid? <Link to="/signup" className="text-[#8B5CF6] hover:text-[#F2F2F2] transition" data-testid="link-to-signup">create an account →</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-8" data-testid="login-form">
        <TextField
          label="EMAIL"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          testId="login-email"
        />
        <TextField
          label="PASSWORD"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          testId="login-password"
        />
        {err && (
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#FF6B6B]" data-testid="login-error">
            [ error · {err} ]
          </div>
        )}
        <div className="pt-2 flex items-center justify-between gap-6">
          <SubmitLink busy={busy} testId="login-submit">
            {busy ? "signing in" : "log in"}
          </SubmitLink>
          <Link
            to="/forgot-password"
            data-testid="link-to-forgot-password"
            className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] hover:text-[#8B5CF6] transition"
          >
            forgot?
          </Link>
        </div>
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
          demo · demo@cagrid.in / demo123
        </div>
      </form>
      {googleEnabled && (
      <div className="mt-12 pt-8 border-t border-white/[0.06]">
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mb-4">or</div>
        <GoogleLink label="log in with google →" />
      </div>
      )}
    </AuthShell>
  );
}
