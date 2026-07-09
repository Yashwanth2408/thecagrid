import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";

export default function ComingSoon() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const feature = (params.get("f") || "feature").replace(/-/g, " ");
  return (
    <AppShell breadcrumb={`DASHBOARD / ${feature.toUpperCase()}`}>
      <div className="relative min-h-[calc(100vh-4rem)]">
        <GridBackground />
        <div className="relative max-w-[1440px] mx-auto px-8 lg:px-16 py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            data-testid="coming-soon-card"
          >
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ phase 02 / queued ]</div>
            <h1 className="mt-6 font-display italic text-[72px] lg:text-[120px] leading-[0.95] tracking-[-0.02em] capitalize">
              {feature} — soon.
            </h1>
            <p className="mt-6 max-w-md mx-auto text-[15px] text-[#8B8B92]">
              Not yet. We're focused on getting your onboarding and shell right first — the rest opens next.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-14 group inline-flex items-center gap-3 font-mono uppercase tracking-[0.24em] text-[12px] text-[#8B5CF6]"
              data-testid="back-to-dashboard"
              data-magnetic
            >
              <span className="relative">
                [ ← back to dashboard
                <span className="absolute left-0 -bottom-1 h-px w-full bg-[#8B5CF6] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
              </span>
              <span>]</span>
            </button>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
