import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";

const ROWS = [
  { key: "cost_inr", label: "COST (INR)", fmt: (v) => `₹${(v / 100000).toFixed(1)}L` },
  { key: "duration_months", label: "DURATION", fmt: (v) => `${v} months` },
  { key: "pass_rate", label: "PASS RATE", fmt: (v) => v },
  { key: "difficulty_score", label: "DIFFICULTY", fmt: (v) => `${v}/10` },
  { key: "roi_5y_multiple", label: "5Y ROI (X)", fmt: (v) => `${v}x` },
  { key: "format", label: "FORMAT", fmt: (v) => v },
  { key: "recognition", label: "RECOGNITION", fmt: (v) => v },
  { key: "best_for", label: "BEST FOR", fmt: (v) => v },
];

export default function CertsCompare() {
  const [certs, setCerts] = useState([]);
  useEffect(() => { api.get("/careers/compare-certs").then((r) => setCerts(r.data.items)); }, []);
  return (
    <AppShell breadcrumb="APP / CAREERS / CERTS">
      <GridBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-16" data-testid="certs-page">
        <Link to="/careers" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition" data-testid="certs-back">← BACK TO CAREERS</Link>
        <header className="mt-6 mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ CERT COMPARISON ]</div>
          <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(48px, 8vw, 108px)" }}>
            Side by<br /><span style={{ color: "#8B5CF6" }}>side.</span>
          </h1>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]" data-testid="certs-table">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-4 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">METRIC</th>
                {certs.map((c) => (
                  <th key={c.key} className="text-left py-4 pr-4 font-display italic text-[22px] text-white font-normal" data-testid={`cert-col-${c.key}`}>{c.name.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.key} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="py-4 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">{r.label}</td>
                  {certs.map((c) => (
                    <td key={c.key} className="py-4 pr-6 font-body text-[13px] text-white/90">{r.fmt(c[r.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
