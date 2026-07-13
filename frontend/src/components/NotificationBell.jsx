import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "@/lib/apiClient";

function rel(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const nav = useNavigate();

  const load = () => {
    api.get("/notifications?limit=8").then((r) => {
      setItems(r.data.items || []);
      setUnread(r.data.total_unread || 0);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const openOne = async (n) => {
    if (!n.is_read) {
      try { await api.post(`/notifications/${n.notification_id}/read`); } catch {}
    }
    setOpen(false);
    if (n.action_url) nav(n.action_url);
    load();
  };
  const readAll = async () => { try { await api.post("/notifications/read-all"); load(); } catch {} };

  return (
    <div ref={ref} className="relative">
      <button data-testid="notification-bell" onClick={() => setOpen((s) => !s)} className="relative w-9 h-9 flex items-center justify-center border border-white/[0.06] hover:border-[#8B5CF6] transition">
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        {unread > 0 && (
          <span data-testid="notification-bell-count" className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[#8B5CF6] text-[9px] font-mono font-bold text-white flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[380px] max-h-[520px] overflow-auto bg-[#111114] border border-white/[0.08] backdrop-blur-xl z-50" data-testid="notification-drawer">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">NOTIFICATIONS · {unread} UNREAD</div>
            <button onClick={readAll} data-testid="bell-read-all" className="font-mono uppercase tracking-[0.22em] text-[9.5px] text-[#B4FF39] hover:text-white transition">[ MARK ALL READ ]</button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {items.length === 0 && <div className="p-6 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no notifications yet.</div>}
            {items.map((n) => (
              <button key={n.notification_id} onClick={() => openOne(n)} data-testid={`bell-notif-${n.notification_id}`} className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition" style={{ borderLeft: n.is_read ? "2px solid transparent" : "2px solid #8B5CF6" }}>
                <div className="font-display italic text-[15px] text-white leading-tight">{n.title}</div>
                <div className="font-body text-[12px] text-[#8B8B92] mt-0.5 line-clamp-2">{n.body_markdown}</div>
                <div className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#5A5A62] mt-1">{rel(n.created_at)}</div>
              </button>
            ))}
          </div>
          <div className="border-t border-white/[0.06] px-4 py-3 text-right">
            <Link to="/notifications" onClick={() => setOpen(false)} data-testid="bell-view-all" className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#B4FF39] hover:text-white transition">[ VIEW ALL → ]</Link>
          </div>
        </div>
      )}
    </div>
  );
}
