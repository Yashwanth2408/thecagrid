import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { GoogleButton } from "@/components/AuthShell";
import { AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

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
      title="Welcome back"
      subtitle="Log in to your CA Grid."
      footer={<>New here? <Link className="text-[#7C3AED] hover:text-[#8B5CF6] font-medium" to="/signup" data-testid="link-to-signup">Create an account</Link></>}
    >
      <GoogleButton label="Log in with Google" />
      <div className="my-6 flex items-center gap-3 text-xs text-[#71717A]">
        <div className="flex-1 h-px bg-white/[0.06]" />
        or continue with email
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0A0A0B] border border-white/[0.08] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[15px] text-[#F5F5F7]"
            data-testid="login-email"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0A0A0B] border border-white/[0.08] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[15px] text-[#F5F5F7]"
            data-testid="login-password"
          />
        </Field>
        {err && (
          <div className="flex items-center gap-2 text-sm text-red-400" data-testid="login-error">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 font-semibold text-[15px] transition-all shadow-[0_20px_50px_-15px_rgba(124,58,237,0.75)]"
          data-testid="login-submit"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-xs text-[#71717A]">
        Demo: <span className="text-[#A1A1AA]">demo@cagrid.in / demo123</span>
      </p>
    </AuthShell>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[#71717A]">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
