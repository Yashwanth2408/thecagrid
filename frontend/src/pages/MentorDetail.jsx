import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export default function MentorDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [m, setM] = useState(null);
  const [topic, setTopic] = useState("Career strategy check-in — 60 min");
  const [slot, setSlot] = useState({ start: "", end: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/mentors/${id}`).then((r) => setM(r.data)).catch(() => toast.error("Mentor not found"));
    // default slot: tomorrow 19:00-20:00 IST-ish
    const d = new Date(); d.setDate(d.getDate() + 3);
    const iso = (h) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).toISOString().slice(0, 16);
    setSlot({ start: iso(19), end: iso(20) });
  }, [id]);

  const book = async () => {
    if (topic.trim().length < 6) return toast.error("Topic too short");
    setBusy(true);
    try {
      const r = await api.post(`/mentors/${id}/book`, { slot_start: slot.start, slot_end: slot.end, topic });
      toast.success("Booking created — proceeding to payment");
      nav(`/mentors/booking/${r.data.booking_id}/pay`);
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not book"); }
    finally { setBusy(false); }
  };

  if (!m) return <AppShell breadcrumb="APP / MENTORS"><div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div></AppShell>;

  return (
    <AppShell breadcrumb={`APP / MENTORS / ${(m.mentor_name || "").toUpperCase()}`}>
      <GridBackground />
      <div className="relative max-w-[1000px] mx-auto px-6 lg:px-10 py-16" data-testid="mentor-detail-page">
        <Link to="/mentors" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] hover:text-white transition">← ALL MENTORS</Link>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 mb-10">
          <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center font-bold text-[32px]">{m.mentor_initials}</div>
          <div>
            <h1 className="font-display italic leading-[1.02] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(40px, 6vw, 68px)" }}>{m.mentor_name}</h1>
            <div className="mt-2 flex items-center gap-2">
              {m.is_verified_ca && <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39]">✓ VERIFIED CA</span>}
              <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{m.mentor_city}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(m.specializations || []).map((s) => <span key={s} className="font-mono uppercase tracking-[0.18em] text-[10px] text-[#8B5CF6] border border-[#8B5CF6]/30 px-2 py-1">{s}</span>)}
            </div>
            <p className="mt-5 font-body text-[15px] text-[#B0B0B8] leading-relaxed">{m.bio_markdown}</p>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ AVAILABILITY (RECURRING) ]</div>
            <div className="space-y-2">
              {(m.availability_slots || []).map((s, i) => (
                <div key={i} className="font-mono uppercase tracking-[0.22em] text-[11px] text-white/80"><span className="text-[#5A5A62]">{s.day}</span> · {s.start} – {s.end} IST</div>
              ))}
            </div>
            <div className="mt-6">
              <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">RATE</div>
              <div className="font-display italic text-[48px] text-white leading-tight">₹{m.hourly_rate_inr}<span className="text-[16px] text-white/50">/hour</span></div>
            </div>
          </div>
          <div className="border border-white/[0.06] p-5" data-testid="mentor-book-form">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] mb-3">[ BOOK A SESSION ]</div>
            <label className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">SLOT START</label>
            <input type="datetime-local" data-testid="book-slot-start" value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            <label className="mt-3 block font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">SLOT END</label>
            <input type="datetime-local" data-testid="book-slot-end" value={slot.end} onChange={(e) => setSlot({ ...slot, end: e.target.value })} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            <label className="mt-3 block font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">TOPIC / QUESTION</label>
            <textarea rows={3} data-testid="book-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
            <button disabled={busy} onClick={book} data-testid={`mentor-book-${id}`} className="mt-4 w-full px-5 py-2.5 font-mono uppercase tracking-[0.22em] text-[11px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
              {busy ? "[ BOOKING… ]" : `[ BOOK · ₹${m.hourly_rate_inr} → ]`}
            </button>
            <div className="mt-2 font-mono uppercase tracking-[0.22em] text-[9px] text-[#5A5A62]">DEMO PAYMENT · NO CARD CHARGED</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
