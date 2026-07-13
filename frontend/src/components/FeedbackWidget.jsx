import React, { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const CATEGORIES = ["Bug", "Feature", "Praise", "Other"];

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Feature");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (message.trim().length < 5) return toast.error("A bit more detail helps");
    setBusy(true);
    try {
      await api.post("/feedback", { category, message, url: window.location.pathname });
      toast.success("Thanks — feedback received");
      setMessage("");
      setOpen(false);
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not send"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="feedback-widget-btn" className="fixed z-40 bottom-6 left-6 flex items-center gap-2 px-3 py-2 border border-white/[0.1] bg-[#111114]/80 backdrop-blur font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92] hover:border-[#B4FF39] hover:text-[#B4FF39] transition">
        <MessageSquarePlus className="w-4 h-4" strokeWidth={1.5} />
        FEEDBACK
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setOpen(false)}>
          <div className="max-w-md w-full border border-white/[0.08] bg-[#111114] p-6" onClick={(e) => e.stopPropagation()} data-testid="feedback-modal">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39]">[ FEEDBACK ]</div>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <h3 className="font-display italic text-[26px] text-white mb-3">Tell us what's off — or what's working.</h3>
            <div className="flex flex-wrap gap-2 mb-3" data-testid="feedback-categories">
              {CATEGORIES.map((c) => (
                <button key={c} data-testid={`feedback-cat-${c.toLowerCase()}`} onClick={() => setCategory(c)} className="px-3 py-1 font-mono uppercase tracking-[0.22em] text-[10px]" style={{
                  color: category === c ? "#0A0A0C" : "#8B8B92",
                  background: category === c ? "#B4FF39" : "transparent",
                  border: `1px solid ${category === c ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
                }}>{c}</button>
              ))}
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="what happened, what you'd want instead…" data-testid="feedback-message" className="w-full bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[14px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
            <button disabled={busy} onClick={submit} data-testid="feedback-submit" className="mt-4 w-full py-2 font-mono uppercase tracking-[0.22em] text-[10.5px] border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition disabled:opacity-50">
              {busy ? "[ SENDING… ]" : "[ SEND FEEDBACK → ]"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
