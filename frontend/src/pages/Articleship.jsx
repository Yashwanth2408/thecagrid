import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const LEAVE_KINDS = [
  { key: "casual", label: "CASUAL" },
  { key: "sick", label: "SICK" },
  { key: "exam", label: "EXAM" },
  { key: "other", label: "OTHER" },
];

function Ring({ percent = 0, label, subtitle, size = 200, stroke = 10, color = "#8B5CF6" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(100, Math.max(0, percent)) / 100);
  return (
    <svg width={size} height={size} className="block" data-testid="articleship-ring">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1s ease" }}
      />
      <text x="50%" y="46%" textAnchor="middle" fill="#F2F2F2" style={{ font: "italic 700 42px 'Instrument Serif', serif" }}>{Math.round(percent)}<tspan style={{ font: "500 14px 'JetBrains Mono', monospace", fill: "#8B8B92" }}>%</tspan></text>
      <text x="50%" y="60%" textAnchor="middle" fill="#5A5A62" style={{ font: "500 10px 'JetBrains Mono', monospace", letterSpacing: "0.22em" }}>{(label || "").toUpperCase()}</text>
      {subtitle && <text x="50%" y="70%" textAnchor="middle" fill="#8B8B92" style={{ font: "500 10.5px 'JetBrains Mono', monospace" }}>{subtitle}</text>}
    </svg>
  );
}

function LeaveForm({ onAdded }) {
  const [kind, setKind] = useState("casual");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/articleship/leave", { kind, start_date: start, end_date: end, reason });
      toast.success("Leave logged");
      setReason("");
      onAdded?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not log leave");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border border-white/[0.06] p-6" data-testid="articleship-leave-form">
      <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ ADD LEAVE ]</div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <select data-testid="leave-kind" value={kind} onChange={(e) => setKind(e.target.value)} className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none">
          {LEAVE_KINDS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
        <input type="date" data-testid="leave-start" value={start} onChange={(e) => setStart(e.target.value)} className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[12px] text-white focus:border-[#8B5CF6] outline-none" />
        <input type="date" data-testid="leave-end" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[12px] text-white focus:border-[#8B5CF6] outline-none" />
        <input type="text" data-testid="leave-reason" placeholder="REASON (OPTIONAL)" value={reason} onChange={(e) => setReason(e.target.value)} className="bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
      </div>
      <button disabled={busy} onClick={submit} data-testid="leave-submit" className="mt-4 px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
        {busy ? "[ ADDING… ]" : "[ ADD LEAVE → ]"}
      </button>
    </div>
  );
}

function ProfileForm({ profile, firms, onSaved }) {
  const [firm_slug, setFirmSlug] = useState(profile?.firm_slug || "");
  const [firm_custom_name, setCustomName] = useState(profile?.firm_custom_name || "");
  const [start_date, setStart] = useState(profile?.start_date || "");
  const [end_date, setEnd] = useState(profile?.end_date || "");
  const [city, setCity] = useState(profile?.city || "");
  const [practice_area, setPractice] = useState(profile?.practice_area || "audit");
  const [monthly_stipend, setStipend] = useState(profile?.monthly_stipend || 15000);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.put("/articleship/me", {
        firm_slug: firm_slug || null,
        firm_custom_name: firm_custom_name || null,
        start_date: start_date || null,
        end_date: end_date || null,
        city: city || null,
        practice_area: practice_area || null,
        monthly_stipend: Number(monthly_stipend) || null,
      });
      toast.success("Profile saved");
      onSaved?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border border-white/[0.06] p-6" data-testid="articleship-profile-form">
      <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ MY ARTICLESHIP ]</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">FIRM</label>
          <select data-testid="profile-firm" value={firm_slug} onChange={(e) => setFirmSlug(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase tracking-[0.18em] text-[11px] text-white focus:border-[#8B5CF6] outline-none">
            <option value="">— NOT LISTED / CUSTOM —</option>
            {firms.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">OR CUSTOM FIRM NAME</label>
          <input type="text" data-testid="profile-custom-firm" value={firm_custom_name} onChange={(e) => setCustomName(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
        </div>
        <div>
          <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">START DATE</label>
          <input type="date" data-testid="profile-start" value={start_date} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
        </div>
        <div>
          <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">END DATE (OR 3Y DEFAULT)</label>
          <input type="date" data-testid="profile-end" value={end_date} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
        </div>
        <div>
          <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">CITY</label>
          <input type="text" data-testid="profile-city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
        </div>
        <div>
          <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">PRACTICE AREA</label>
          <input type="text" data-testid="profile-area" value={practice_area} onChange={(e) => setPractice(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono uppercase text-[11px] tracking-[0.18em] text-white focus:border-[#8B5CF6] outline-none" />
        </div>
        <div>
          <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">MONTHLY STIPEND (₹)</label>
          <input type="number" min={0} data-testid="profile-stipend" value={monthly_stipend} onChange={(e) => setStipend(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
        </div>
      </div>
      <button disabled={busy} onClick={submit} data-testid="profile-save" className="mt-4 px-5 py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
        {busy ? "[ SAVING… ]" : "[ SAVE PROFILE → ]"}
      </button>
    </div>
  );
}

export default function Articleship() {
  const [data, setData] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/articleship/me"),
      api.get("/articleship/leave"),
      api.get("/firms?limit=200"),
    ]).then(([a, b, c]) => {
      setData(a.data); setLeaves(b.data.items || []); setFirms(c.data.items || []);
    }).catch(() => toast.error("Could not load articleship")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const firmName = useMemo(() => {
    const f = firms.find((x) => x.slug === data?.profile?.firm_slug);
    return f?.name || data?.profile?.firm_custom_name || "Not set";
  }, [data, firms]);

  return (
    <AppShell breadcrumb="APP / ARTICLESHIP">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="articleship-page">
        <header className="mb-12">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ ARTICLESHIP ]</div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 128px)" }}>
            Three years.<br /><span style={{ color: "#8B5CF6" }}>Track every day.</span>
          </h1>
          <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            AT · {firmName.toUpperCase()}
          </div>
        </header>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        {!loading && (
          <>
            {data?.progress && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12" data-testid="articleship-progress">
                <div className="border border-white/[0.06] p-6 flex items-center justify-center">
                  <Ring percent={data.progress.percent_complete} label="COMPLETE" subtitle={`${data.progress.elapsed_days}/${data.progress.total_days} DAYS`} />
                </div>
                <div className="border border-white/[0.06] p-6">
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">LEAVE (USED / ALLOWED)</div>
                  <div className="font-display italic text-[48px] text-white leading-tight">{data.progress.leave_days_used}<span className="text-[16px] text-white/50"> / {data.progress.leave_days_allowed}</span></div>
                  <div className="mt-3 h-[3px] bg-white/[0.06]">
                    <div className="h-full bg-[#F59E0B]" style={{ width: `${Math.min(100, (data.progress.leave_days_used / Math.max(1, data.progress.leave_days_allowed)) * 100)}%` }} />
                  </div>
                  <div className="mt-2 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{data.progress.leave_days_remaining} DAYS REMAINING</div>
                </div>
                <div className="border border-white/[0.06] p-6">
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62] mb-2">START · END</div>
                  <div className="font-display italic text-[22px] text-white leading-tight">{data.progress.start_date}</div>
                  <div className="font-display italic text-[22px] text-white/60 leading-tight">→ {data.progress.end_date}</div>
                  <div className="mt-4 font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">STIPEND · ₹{(data.profile?.monthly_stipend || 0).toLocaleString()}/mo</div>
                  {data.profile?.monthly_stipend && data.profile?.monthly_stipend < 6000 && (
                    <div className="mt-2 font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#F59E0B]">⚠ BELOW ICAI TIER-1 MIN (₹6,000)</div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              <ProfileForm profile={data?.profile || {}} firms={firms} onSaved={load} />
              <LeaveForm onAdded={load} />
            </div>

            <div className="mb-12">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ LEAVE HISTORY · {leaves.length} ]</div>
              <div className="divide-y divide-white/[0.06]" data-testid="leave-history-list">
                {leaves.length === 0 && <div className="py-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no leaves logged yet.</div>}
                {leaves.map((l) => (
                  <motion.div key={l.leave_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 grid grid-cols-[100px_1fr_auto] gap-4 items-center" data-testid={`leave-${l.leave_id}`}>
                    <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">[ {l.kind.toUpperCase()} ]</div>
                    <div>
                      <div className="font-mono tabular-nums text-[13px] text-white/90">{l.start_date} → {l.end_date}</div>
                      {l.reason && <div className="font-body italic text-[13px] text-white/60 mt-1">{l.reason}</div>}
                    </div>
                    <div className="font-display italic text-[24px] text-white">{l.days}<span className="text-[11px] text-white/50">d</span></div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <Link to="/articleship/log" data-testid="link-practical-log" className="inline-block font-mono uppercase tracking-[0.22em] text-[11px] px-4 py-2 border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-black transition">
                [ OPEN PRACTICAL LOG → ]
              </Link>
              <Link to="/firm-match" data-testid="link-firm-match" className="ml-3 inline-block font-mono uppercase tracking-[0.22em] text-[11px] px-4 py-2 border border-white/[0.08] text-white/70 hover:border-[#8B5CF6] hover:text-[#8B5CF6] transition">
                [ FIRM MATCH → ]
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
