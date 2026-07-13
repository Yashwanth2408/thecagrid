import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const KIND_LABEL = { level: "LEVEL", cross: "CROSS-CUTTING" };

export default function Community() {
  const { user } = useAuth();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVerify, setShowVerify] = useState(false);
  const [memNum, setMemNum] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    api.get("/community/categories").then((r) => setCats(r.data.items || [])).catch(() => toast.error("Could not load")).finally(() => setLoading(false));
  }, []);

  const verify = async () => {
    if (!/^\d{6}$/.test(memNum)) return toast.error("Enter a 6-digit membership number");
    setVerifying(true);
    try {
      await api.post("/verify/ca", { membership_number: memNum });
      toast.success("Verified as CA");
      setShowVerify(false);
      window.location.reload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not verify");
    } finally {
      setVerifying(false);
    }
  };

  const grouped = { level: cats.filter((c) => c.kind === "level"), cross: cats.filter((c) => c.kind === "cross") };

  return (
    <AppShell breadcrumb="APP / COMMUNITY">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="community-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ COMMUNITY ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Ask. Answer.<br /><span style={{ color: "#8B5CF6" }}>Repeat.</span>
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
              {cats.length} CATEGORIES · YOU: {(user?.journey_level || "").toUpperCase()}
              {user?.is_verified_ca && <span className="ml-2 text-[#B4FF39]">✓ VERIFIED CA</span>}
            </div>
            <Link to="/study-groups" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-white/[0.08] text-white/70 hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition" data-testid="community-groups-link">
              [ STUDY GROUPS → ]
            </Link>
            {!user?.is_verified_ca && (
              <button onClick={() => setShowVerify(true)} data-testid="community-verify-btn" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">
                [ VERIFY AS CA ]
              </button>
            )}
          </div>
        </header>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}

        {["level", "cross"].map((kind) => (
          <div key={kind} className="mb-14">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ {KIND_LABEL[kind]} · {grouped[kind].length} ]</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {grouped[kind].map((c, i) => (
                <motion.div key={c.category_slug} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link to={`/community/${c.category_slug}`} data-testid={`community-cat-${c.category_slug}`} className="block border border-white/[0.06] hover:border-[#8B5CF6] transition p-5 group">
                    <div className="flex items-center justify-between">
                      <div className="font-display italic text-[26px] text-white group-hover:text-[#8B5CF6] transition">{c.name}</div>
                      <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{c.thread_count} THREAD{c.thread_count === 1 ? "" : "S"}</div>
                    </div>
                    <div className="mt-2 font-body text-[13px] text-[#B0B0B8]">{c.description}</div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {showVerify && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setShowVerify(false)}>
            <div className="max-w-md w-full border border-white/[0.08] bg-[#111114] p-8" onClick={(e) => e.stopPropagation()} data-testid="verify-modal">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-2">[ CA VERIFICATION · MOCKED ]</div>
              <h3 className="font-display italic text-[28px] text-white mb-3">Are you a qualified CA?</h3>
              <p className="font-body text-[13px] text-[#8B8B92] mb-5">
                Enter your ICAI membership number (6 digits). This is a Phase 6 <em>mocked</em> endpoint — any 6-digit number is accepted for demo purposes.
              </p>
              <input type="text" data-testid="verify-input" maxLength={6} value={memNum} onChange={(e) => setMemNum(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="w-full bg-transparent border border-white/[0.1] px-3 py-2.5 font-mono text-[16px] text-white focus:border-[#8B5CF6] outline-none tracking-widest" />
              <div className="mt-5 flex gap-2 justify-end">
                <button onClick={() => setShowVerify(false)} className="px-4 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/60 hover:text-white transition">CANCEL</button>
                <button disabled={verifying} onClick={verify} data-testid="verify-submit" className="px-4 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
                  {verifying ? "[ VERIFYING… ]" : "[ VERIFY → ]"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
