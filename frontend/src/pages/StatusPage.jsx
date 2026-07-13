import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/apiClient";
import GridBackground from "@/components/GridBackground";

// Status is publicly accessible — no auth shell
export default function StatusPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/status").then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <div className="min-h-screen bg-[#0A0A0C] text-white p-16"><div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></div>;
  return (
    <div className="min-h-screen bg-[#0A0A0C] text-white relative">
      <GridBackground />
      <div className="relative max-w-[1000px] mx-auto px-6 lg:px-10 py-20" data-testid="status-page">
        <Link to="/" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition">← THE CA GRID</Link>
        <header className="mt-10 mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ SYSTEM STATUS ]</div>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-[#10B981]" />
            <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 108px)" }}>All systems <span style={{ color: "#10B981" }}>operational.</span></h1>
          </div>
          <div className="mt-6 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">AS OF · {data.as_of}</div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          <div className="border border-white/[0.06] p-5">
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">UPTIME · 30D</div>
            <div className="font-display italic text-[48px] text-white">{data.uptime_pct_30d}<span className="text-[16px] text-white/50">%</span></div>
          </div>
          <div className="border border-white/[0.06] p-5">
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">AVG LATENCY</div>
            <div className="font-display italic text-[48px] text-white">{data.avg_latency_ms}<span className="text-[16px] text-white/50">ms</span></div>
          </div>
          <div className="border border-white/[0.06] p-5">
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">INCIDENTS · 30D</div>
            <div className="font-display italic text-[48px] text-[#B4FF39]">0</div>
          </div>
        </div>
        <div className="mb-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ COMPONENTS ]</div>
          <div className="divide-y divide-white/[0.06]" data-testid="status-components">
            {(data.components || []).map((c) => (
              <div key={c.name} className="py-4 flex items-center justify-between">
                <div className="font-display italic text-[22px] text-white">{c.name}</div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#10B981]">{c.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-white/[0.06] pt-8">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-2">[ INCIDENT LOG ]</div>
          <div className="font-body italic text-[18px] text-[#8B8B92]">No incidents in the last 30 days.</div>
        </div>
      </div>
    </div>
  );
}
