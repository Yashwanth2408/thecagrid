import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/apiClient";
import AuthShell from "@/components/AuthShell";
import { toast } from "sonner";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Missing reset token in URL.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm", { token, new_password: password });
      toast.success("Password reset — signed in.");
      nav("/dashboard", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Reset failed. The link may be expired.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="[ RESET · new passcode ]"
      title={<>Set a new <em style={{ color: "#8B5CF6" }}>passcode</em>.</>}
      testId="reset-password-page"
      footer={
        <>
          <Link to="/login" className="text-[#8B5CF6] hover:text-[#F2F2F2] transition">
            back to sign in →
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
        <label className="block">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50 mb-2 block">
            New password
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="reset-password-input"
            aria-label="New password"
            autoComplete="new-password"
            className="w-full rounded-2xl bg-white/[0.03] border border-white/10 focus:border-[#8B5CF6] focus:outline-none px-4 py-3 text-[15px]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50 mb-2 block">
            Confirm password
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            data-testid="reset-password-confirm-input"
            aria-label="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-2xl bg-white/[0.03] border border-white/10 focus:border-[#8B5CF6] focus:outline-none px-4 py-3 text-[15px]"
          />
        </label>
        {error && (
          <div
            data-testid="reset-password-error"
            role="alert"
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
          >
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          data-testid="reset-password-submit"
          className="w-full py-3 rounded-full text-sm font-medium text-black hover:opacity-90 transition disabled:opacity-50"
          style={{ background: "#B4FF39" }}
        >
          {loading ? "Resetting…" : "Reset password"}
        </button>
        <div className="text-center pt-2">
          <Link to="/login" className="text-sm text-white/50 hover:text-white transition">
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
