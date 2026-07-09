import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { GoogleButton } from "@/components/AuthShell";
import { AlertCircle } from "lucide-react";

export default function Signup() {
  const [name, setName] = useState("");
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
      const r = await api.post("/auth/signup", { name, email, password });
      setUser(r.data.user);
      navigate("/onboarding", { replace: true });
    } catch (ex) {
      setErr(ex?.response?.data?.detail || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Start your Grid"
      subtitle="Free, forever while we build."
      footer={<>Already have an account? <Link className="text-[#7C3AED] hover:text-[#8B5CF6] font-medium" to="/login" data-testid="link-to-login">Log in</Link></>}
    >
      <GoogleButton />
      <div className="my-6 flex items-center gap-3 text-xs text-[#71717A]">
        <div className="flex-1 h-px bg-white/[0.06]" />
        or with email
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4" data-testid="signup-form">
        <Field label="Full name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0A0A0B] border border-white/[0.08] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[15px] text-[#F5F5F7]"
            data-testid="signup-name"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0A0A0B] border border-white/[0.08] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[15px] text-[#F5F5F7]"
            data-testid="signup-email"
          />
        </Field>
        <Field label="Password (min 6)">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0A0A0B] border border-white/[0.08] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[15px] text-[#F5F5F7]"
            data-testid="signup-password"
          />
        </Field>
        {err && (
          <div className="flex items-center gap-2 text-sm text-red-400" data-testid="signup-error">
            <AlertCircle className="w-4 h-4" /> {err}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] disabled:opacity-60 font-semibold text-[15px] transition-all shadow-[0_20px_50px_-15px_rgba(124,58,237,0.75)]"
          data-testid="signup-submit"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
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
