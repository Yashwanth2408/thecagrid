import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

export default function MentorPay() {
  const { id } = useParams();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      await new Promise((res) => setTimeout(res, 900));  // fake processing
      await api.post(`/mentors/booking/${id}/mock-pay`);
      setDone(true);
      toast.success("Payment successful (mocked)");
      setTimeout(() => nav("/mentors"), 1400);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not process");
    } finally { setBusy(false); }
  };

  return (
    <AppShell breadcrumb="APP / MENTORS / PAY">
      <GridBackground />
      <div className="relative max-w-[520px] mx-auto px-6 lg:px-10 py-24" data-testid="mentor-pay-page">
        <div className="border border-[#B4FF39]/40 p-8 bg-black/40 backdrop-blur">
          <div className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#B4FF39] mb-2">[ DEMO PAYMENT · NO CARD CHARGED ]</div>
          <h1 className="font-display italic text-[42px] text-white leading-tight">Confirm booking.</h1>
          <div className="mt-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">BOOKING · {id}</div>
          <div className="mt-6 border-t border-white/[0.06] pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="font-body text-[13px] text-white/70">Mentor session</div>
              <div className="font-mono tabular-nums text-[13px] text-white">See booking</div>
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-body text-[13px] text-white/70">Platform fee</div>
              <div className="font-mono tabular-nums text-[13px] text-white">₹0</div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">TOTAL</div>
              <div className="font-display italic text-[26px] text-white">Pay now</div>
            </div>
          </div>
          <button disabled={busy || done} onClick={pay} data-testid="pay-confirm-btn" className="mt-6 w-full py-3 font-mono uppercase tracking-[0.22em] text-[11px] transition disabled:opacity-50" style={{
            background: done ? "#10B981" : "#B4FF39", color: "#0A0A0C",
          }}>
            {done ? "[ ✓ PAID · REDIRECTING ]" : busy ? "[ PROCESSING… ]" : "[ PAY DEMO ₹ · CONFIRM BOOKING → ]"}
          </button>
          <div className="mt-4 font-mono uppercase tracking-[0.22em] text-[9px] text-[#5A5A62]">
            THIS IS A MOCKED PAYMENT FLOW. IN PRODUCTION THIS WOULD REDIRECT TO RAZORPAY OR STRIPE.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
