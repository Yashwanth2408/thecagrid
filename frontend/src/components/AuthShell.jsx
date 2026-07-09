import React from "react";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F5F5F7] relative overflow-hidden">
      {/* violet ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(40% 40% at 50% 20%, rgba(124,58,237,0.22) 0%, rgba(124,58,237,0) 60%), radial-gradient(30% 30% at 20% 80%, rgba(124,58,237,0.10) 0%, rgba(124,58,237,0) 60%)",
        }}
      />
      <div className="relative">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <Link to="/"><Logo /></Link>
        </div>
        <div className="max-w-[440px] mx-auto px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-[24px] border border-white/[0.06] bg-[#111114]/80 backdrop-blur-xl p-8 shadow-[0_40px_100px_-30px_rgba(124,58,237,0.35)]"
          >
            <h1 className="text-3xl font-extrabold tracking-[-0.03em]" data-testid="auth-title">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-[#A1A1AA]">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </motion.div>
          {footer && <div className="mt-6 text-center text-sm text-[#A1A1AA]">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function GoogleButton({ label = "Continue with Google" }) {
  const onGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  return (
    <button
      type="button"
      onClick={onGoogle}
      className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.2] transition text-[15px] font-medium"
      data-testid="google-oauth-btn"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}
