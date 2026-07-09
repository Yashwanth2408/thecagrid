import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Construction, ArrowLeft } from "lucide-react";

export default function ComingSoon() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const feature = (params.get("f") || "feature").replace(/-/g, " ");
  return (
    <AppShell>
      <div className="max-w-[820px] mx-auto px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] border border-white/[0.06] bg-[#111114] p-10 text-center"
          data-testid="coming-soon-card"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#7C3AED]/15 border border-[#7C3AED]/30 flex items-center justify-center">
            <Construction className="w-6 h-6 text-[#7C3AED]" strokeWidth={1.5} />
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.25em] text-[#7C3AED]">Phase 2</div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] capitalize">{feature} coming soon</h1>
          <p className="mt-3 text-[#A1A1AA] max-w-md mx-auto">
            This surface unlocks in Phase 2 — we're focused on getting your onboarding and shell right first.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/[0.08] hover:border-white/[0.2] transition text-sm"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>
        </motion.div>
      </div>
    </AppShell>
  );
}
