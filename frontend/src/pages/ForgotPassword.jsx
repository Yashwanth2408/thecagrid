import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/apiClient";
import AuthShell from "@/components/AuthShell";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/password-reset/request", { email });
      setSent(true);
    } catch (err) {
      const msg =
        err?.response?.data?.detail || "Something went wrong. Please try again.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="[ FORGOT · recover access ]"
      title={<>Reset your <em style={{ color: "#8B5CF6" }}>passcode</em>.</>}
      testId="forgot-password-page"
      footer={
        <>
          <Link to="/login" className="text-[#8B5CF6] hover:text-[#F2F2F2] transition">
            back to sign in →
          </Link>
        </>
      }
    >
      {sent ? (
        <div
          data-testid="forgot-password-sent"
          className="space-y-6"
          role="status"
          aria-live="polite"
        >
          <div
            className="rounded-2xl border border-white/10 px-5 py-6"
            style={{ background: "rgba(180,255,57,0.06)" }}
          >
            <div
              className="font-mono text-[10.5px] uppercase tracking-[0.22em] mb-2"
              style={{ color: "#B4FF39" }}
            >
              REQUEST SENT
            </div>
            <p className="text-[15px] text-white/80">
              If <span className="font-mono text-white">{email}</span> matches an account,
              a reset link is on its way. Check your inbox (and spam folder).
            </p>
          </div>
          <Link
            to="/login"
            data-testid="forgot-password-back-link"
            className="block text-center text-sm text-white/60 hover:text-white transition"
          >
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid="forgot-password-form"
        >
          <label className="block">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/50 mb-2 block">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="forgot-password-email-input"
              aria-label="Email"
              autoComplete="email"
              className="w-full rounded-2xl bg-white/[0.03] border border-white/10 focus:border-[#8B5CF6] focus:outline-none px-4 py-3 text-[15px]"
            />
          </label>
          {error && (
            <div
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
            data-testid="forgot-password-submit"
            className="w-full py-3 rounded-full text-sm font-medium text-black hover:opacity-90 transition disabled:opacity-50"
            style={{ background: "#B4FF39" }}
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
          <div className="text-center pt-2">
            <Link to="/login" className="text-sm text-white/50 hover:text-white transition">
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
