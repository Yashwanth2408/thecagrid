import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell, { GoogleLink, TextField, SubmitLink } from "@/components/AuthShell";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

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
      eyebrow="[ 001 / ENTER ]"
      title="Start your grid."
      testId="signup-page"
      footer={
        <>
          already here? <Link to="/login" className="text-[#8B5CF6] hover:text-[#F2F2F2] transition" data-testid="link-to-login">log in →</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-8" data-testid="signup-form">
        <TextField
          label="NAME"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          testId="signup-name"
        />
        <TextField
          label="EMAIL"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          testId="signup-email"
        />
        <TextField
          label="PASSWORD · MIN 6"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          testId="signup-password"
        />
        {err && (
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#FF6B6B]" data-testid="signup-error">
            [ error · {err} ]
          </div>
        )}
        <div className="pt-2">
          <SubmitLink busy={busy} testId="signup-submit">
            {busy ? "creating" : "create account"}
          </SubmitLink>
        </div>
      </form>
      <div className="mt-12 pt-8 border-t border-white/[0.06]">
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mb-4">or</div>
        <GoogleLink />
      </div>
    </AuthShell>
  );
}
