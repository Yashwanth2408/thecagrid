import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";

const TABS = [
  { key: "", label: "ALL" },
  { key: "unread", label: "UNREAD" },
  { key: "streak_at_risk", label: "STREAK" },
  { key: "exam_1_week", label: "EXAM" },
  { key: "badge_unlocked", label: "BADGES" },
  { key: "community_reply", label: "COMMUNITY" },
];

const ICON = {
  streak_at_risk: "🔥", exam_1_week: "⏰", weekly_recap: "📊",
  mock_result: "📝", badge_unlocked: "★", referral_signup: "🎁",
  mentor_booking_confirmed: "🎓", community_reply: "💬", system: "•",
};

function rel(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("");
  useEffect(() => {
    const p = new URLSearchParams();
    if (tab === "unread") p.set("unread", "true");
    api.get(`/notifications?${p}`).then((r) => {
      const all = r.data.items || [];
      setItems(tab && tab !== "unread" ? all.filter((n) => n.type === tab) : all);
    });
  }, [tab]);

  const readOne = async (nid) => { await api.post(`/notifications/${nid}/read`); setItems((s) => s.map((n) => n.notification_id === nid ? { ...n, is_read: true } : n)); };
  const readAll = async () => { await api.post("/notifications/read-all"); setItems((s) => s.map((n) => ({ ...n, is_read: true }))); toast.success("All marked read"); };

  return (
    <AppShell breadcrumb="APP / NOTIFICATIONS">
      <GridBackground />
      <div className="relative max-w-[900px] mx-auto px-6 lg:px-10 py-16" data-testid="notifications-page">
        <header className="mb-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">[ NOTIFICATIONS ]</div>
          <div className="flex items-center justify-between">
            <h1 className="font-display italic leading-[0.94] tracking-[-0.03em]" style={{ fontSize: "clamp(56px, 10vw, 96px)" }}>Signal, not noise.</h1>
            <div className="flex flex-col gap-1">
              <button onClick={readAll} data-testid="notif-read-all" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/70 hover:text-[#B4FF39] transition">[ MARK ALL READ ]</button>
              <Link to="/settings/notifications" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/70 hover:text-[#8B5CF6] transition" data-testid="notif-settings-link">[ PREFERENCES → ]</Link>
            </div>
          </div>
        </header>
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => (
            <button key={t.key} data-testid={`notif-tab-${t.key || "all"}`} onClick={() => setTab(t.key)} className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px]" style={{
              color: tab === t.key ? "#0A0A0C" : "#8B8B92",
              background: tab === t.key ? "#B4FF39" : "transparent",
              border: `1px solid ${tab === t.key ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
            }}>{t.label}</button>
          ))}
        </div>
        <div className="divide-y divide-white/[0.06]">
          {items.length === 0 && <div className="py-8 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no notifications.</div>}
          {items.map((n) => (
            <div key={n.notification_id} data-testid={`notification-item-${n.notification_id}`} className="py-5 grid grid-cols-[40px_1fr_50px] gap-4 items-start hover:bg-white/[0.02] transition" style={{ borderLeft: n.is_read ? "2px solid transparent" : "2px solid #8B5CF6", paddingLeft: "12px" }}>
              <div className="text-[24px]">{ICON[n.type] || "•"}</div>
              <div>
                <div className="font-display italic text-[19px] text-white leading-tight">{n.title}</div>
                <div className="font-body text-[13px] text-[#B0B0B8] mt-1">{n.body_markdown}</div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62]">{n.type.replace(/_/g, " ").toUpperCase()} · {rel(n.created_at)}</span>
                  {n.action_url && <Link to={n.action_url} onClick={() => readOne(n.notification_id)} className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#B4FF39]">OPEN →</Link>}
                  {!n.is_read && <button onClick={() => readOne(n.notification_id)} className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#5A5A62] hover:text-white transition">MARK READ</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
