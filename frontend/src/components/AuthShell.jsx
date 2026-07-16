import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const QUOTES = [
  { q: "Study like it's a system, not a mood.", a: "The Grid" },
  { q: "The exam doesn't move. You do.", a: "The Grid" },
  { q: "Consistency is the only cheat code.", a: "The Grid" },
  { q: "Discipline is a private religion.", a: "The Grid" },
];

export default function AuthShell({ title, eyebrow, children, footer, testId = "auth-shell" }) {
  const quote = React.useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F2F2] grid lg:grid-cols-[2fr_3fr]" data-testid={testId}>
      {/* LEFT: quote panel */}
      <aside className="relative overflow-hidden hidden lg:flex flex-col justify-between p-12 border-r border-white/[0.06]" style={{
        background: "radial-gradient(circle at 20% 30%, rgba(139,92,246,0.20), transparent 55%), #0F0F12",
      }}>
        <Link to="/" className="inline-flex"><Logo /></Link>
        <motion.div
          initial={{ opacity: 0, y: 20, clipPath: "inset(0 0 100% 0)" }}
          animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-6">
            [ from the manifesto ]
          </div>
          <blockquote className="font-display italic text-[52px] leading-[1] tracking-[-0.02em] text-[#F2F2F2]">
            "{quote.q}"
          </blockquote>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">— {quote.a}</div>
        </motion.div>
        <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
          [ built for the 2026 cohort ]
        </div>
      </aside>

      {/* RIGHT: form */}
      <div className="relative flex flex-col">
        <div className="flex items-center justify-between px-8 lg:px-16 py-6">
          <Link to="/" className="lg:hidden"><Logo /></Link>
          <span className="hidden lg:block font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] ml-auto">
            [ v0.1 · beta ]
          </span>
        </div>
        <div className="flex-1 flex items-center px-8 lg:px-16 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[440px]"
          >
            {eyebrow && (
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-6">
                {eyebrow}
              </div>
            )}
            <h1 className="font-display italic text-[56px] lg:text-[72px] leading-[0.95] tracking-[-0.02em]" data-testid="auth-title">
              {title}
            </h1>
            <div className="mt-10">{children}</div>
            {footer && (
              <div className="mt-10 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function GoogleLink({ label = "continue with google →" }) {
  if (!process.env.REACT_APP_GOOGLE_AUTH_URL) return null;

  const onGoogle = () => {
    const authUrl = process.env.REACT_APP_GOOGLE_AUTH_URL || "";
    if (!authUrl) return;
    const redirectUrl = window.location.origin + "/dashboard";
    const separator = authUrl.includes("?") ? "&" : "?";
    window.location.href = `${authUrl}${separator}redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button
      type="button"
      onClick={onGoogle}
      className="group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[11px] text-[#F2F2F2] hover:text-[#8B5CF6] transition"
      data-testid="google-oauth-btn"
      data-magnetic
    >
      <GoogleGlyph />
      <span className="relative">
        {label}
        <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
      </span>
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export function TextField({ label, testId, ...props }) {
  return (
    <label className="block">
      <span className="font-mono uppercase tracking-[0.24em] text-[10.5px] text-[#5A5A62]">{label}</span>
      <input
        {...props}
        data-testid={testId}
        className="mt-2 w-full bg-transparent border-0 border-b border-white/[0.15] focus:border-[#8B5CF6] focus:outline-none focus:ring-0 px-0 py-3 text-[17px] text-[#F2F2F2] placeholder:text-[#5A5A62] transition-colors"
      />
    </label>
  );
}

export function SubmitLink({ children, busy, testId }) {
  return (
    <button
      type="submit"
      disabled={busy}
      data-magnetic
      className="group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[13px] text-[#8B5CF6] disabled:opacity-50"
      data-testid={testId}
    >
      <span className="relative">
        [ {busy ? "…" : children} →
        <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
      </span>
      <span>]</span>
    </button>
  );
}
