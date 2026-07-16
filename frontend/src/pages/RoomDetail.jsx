import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const WS_BASE = (process.env.REACT_APP_BACKEND_URL || "http://localhost:8000")
  .replace(/^http/, "ws");

function fmt(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function RoomDetail() {
  const { code } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [planned, setPlanned] = useState(25);
  const [wsConnected, setWsConnected] = useState(false);
  const chatEnd = useRef(null);
  const wsRef = useRef(null);
  const pingInterval = useRef(null);
  const pollInterval = useRef(null);

  // ─── WebSocket connection ───────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const sessionToken = document.cookie
      .split("; ")
      .find((r) => r.startsWith("session_token="))
      ?.split("=")[1];

    // Try Bearer token from localStorage as well
    const token = sessionToken || localStorage.getItem("session_token") || "";
    if (!token) return; // Will fall back to polling

    const ws = new WebSocket(`${WS_BASE}/api/rooms/${code}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      // Send auth token as first message
      ws.send(JSON.stringify({ type: "auth", token }));
      setWsConnected(true);
      // Start WS keep-alive ping every 20s
      pingInterval.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20000);
    };

    ws.onmessage = (ev) => {
      let data;
      try { data = JSON.parse(ev.data); } catch { return; }

      if (data.type === "init") {
        setState(data);
        setMessages(data.messages || []);
      } else if (data.type === "message") {
        setMessages((prev) => [...prev, data.message]);
      } else if (data.type === "presence") {
        // Refetch room state on presence change (simple approach)
        api.get(`/rooms/${code}`).then((r) => setState(r.data)).catch(() => {});
      } else if (data.type === "timer") {
        setState((prev) => prev ? { ...prev, room: { ...prev.room, active_timer_state: data.state } } : prev);
      }
    };

    ws.onerror = () => {
      setWsConnected(false);
      fallbackToPoll();
    };

    ws.onclose = () => {
      setWsConnected(false);
      clearInterval(pingInterval.current);
      // Reconnect after 3s if still on page
      setTimeout(connectWS, 3000);
    };
  }, [code]);

  // ─── Fallback polling (30s) ──────────────────────────────────────────────
  const fallbackToPoll = useCallback(() => {
    if (pollInterval.current) return; // Already polling
    pollInterval.current = setInterval(async () => {
      try {
        const r = await api.post(`/rooms/${code}/ping`);
        setState(r.data);
        setMessages(r.data.messages || []);
      } catch (e) {
        if (e?.response?.status === 404) { toast.error("Room ended"); nav("/rooms"); }
      }
    }, 30000);
  }, [code, nav]);

  useEffect(() => {
    let alive = true;

    // Join room via HTTP first (ensures we're in presence)
    api.post(`/rooms/${code}/join`)
      .then((r) => { if (alive) { setState(r.data); setMessages(r.data.messages || []); } })
      .catch((e) => {
        if (e?.response?.status !== 400) toast.error("Could not join room");
      });

    // Attempt WebSocket
    connectWS();

    // If WS fails within 2s, start polling
    const wsTimeout = setTimeout(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        fallbackToPoll();
      }
    }, 2000);

    return () => {
      alive = false;
      clearTimeout(wsTimeout);
      clearInterval(pingInterval.current);
      clearInterval(pollInterval.current);
      pollInterval.current = null;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      api.post(`/rooms/${code}/leave`).catch(() => {});
    };
  }, [code, nav, connectWS, fallbackToPoll]);

  // Local ticker
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  if (!state) return (
    <AppShell breadcrumb="APP / ROOMS">
      <div className="p-16 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">connecting…</div>
    </AppShell>
  );

  const room = state.room;
  const isHost = user?.user_id === room.host_user_id;
  const ts = room.active_timer_state;
  let remaining = null;
  if (ts?.is_running) {
    const started = new Date(ts.started_at).getTime();
    const elapsed = (now - started) / 1000;
    remaining = Math.max(0, ts.planned_seconds - elapsed);
  }

  const startTimer = async () => {
    try { await api.post(`/rooms/${code}/timer/start`, { planned_seconds: Number(planned) * 60 }); toast.success("Timer started"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Could not start"); }
  };
  const pauseTimer = async () => {
    try { await api.post(`/rooms/${code}/timer/pause`); toast.success("Paused"); }
    catch { toast.error("Could not pause"); }
  };
  const completeTimer = async () => {
    try {
      const r = await api.post(`/rooms/${code}/timer/complete`);
      toast.success(`${r.data.participants} of you finished together. +${r.data.xp_awarded_each} XP.`);
    } catch { toast.error("Could not complete"); }
  };

  // Send via WS if connected, else REST
  const send = async () => {
    const c = message.trim(); if (!c) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", content: c }));
      setMessage("");
    } else {
      try {
        const r = await api.post(`/rooms/${code}/message`, { content: c });
        setMessages((prev) => [...prev, r.data]);
        setMessage("");
      } catch (e) { toast.error(e?.response?.data?.detail || "Could not send"); }
    }
  };

  const leave = async () => { await api.post(`/rooms/${code}/leave`); nav("/rooms"); };

  return (
    <AppShell breadcrumb={`APP / ROOMS / ${code}`}>
      <GridBackground />
      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-10" data-testid="room-detail-page">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39]" data-testid="room-code">ROOM · {code}</div>
              {wsConnected ? (
                <span className="flex items-center gap-1 font-mono uppercase tracking-[0.18em] text-[9px] text-[#B4FF39]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B4FF39] animate-pulse inline-block" />
                  LIVE WS
                </span>
              ) : (
                <span className="font-mono uppercase tracking-[0.18em] text-[9px] text-[#5A5A62]">POLLING 30s</span>
              )}
            </div>
            <div className="font-display italic text-[26px] text-white leading-tight">{room.name}</div>
            <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">{room.subject_tag} · {(room.presence || []).length} IN THE ROOM</div>
          </div>
          <button onClick={leave} data-testid="room-leave" className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/60 hover:text-[#FF6B6B] transition">[ LEAVE ]</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* center — timer */}
          <div className="flex flex-col items-center justify-center border border-white/[0.06] py-16 min-h-[380px]">
            {remaining !== null ? (
              <div data-testid="room-timer" className="font-display italic tabular-nums" style={{ fontSize: "clamp(96px, 18vw, 220px)", color: "#F5F5F7", letterSpacing: "-0.02em" }}>{fmt(remaining)}</div>
            ) : ts && !ts.is_running ? (
              <div className="text-center">
                <div data-testid="room-timer" className="font-display italic tabular-nums text-[64px] text-[#F59E0B]">PAUSED</div>
                <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62] mt-2">{fmt(ts.planned_seconds)} PLANNED</div>
              </div>
            ) : (
              <div data-testid="room-timer" className="font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92] text-center">HOST WILL START THE TIMER</div>
            )}
            {isHost && (
              <div className="mt-8 flex flex-wrap items-center gap-3" data-testid="room-host-controls">
                <input type="number" min="1" max="120" value={planned} onChange={(e) => setPlanned(e.target.value)} data-testid="room-timer-planned" className="w-24 bg-transparent border border-white/[0.08] px-3 py-2 font-mono text-[13px] text-white focus:border-[#8B5CF6] outline-none" />
                <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">MIN</span>
                <button onClick={startTimer} data-testid="room-timer-start" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">[ START ]</button>
                <button onClick={pauseTimer} data-testid="room-timer-pause" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-white/[0.1] text-white/70 hover:border-[#F59E0B] hover:text-[#F59E0B] transition">[ PAUSE ]</button>
                <button onClick={completeTimer} data-testid="room-timer-complete" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-1.5 border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-black transition">[ COMPLETE ]</button>
              </div>
            )}
          </div>
          {/* right — presence */}
          <div className="border border-white/[0.06] p-5" data-testid="room-presence">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-3">[ IN THE ROOM · {(room.presence || []).length} ]</div>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {(room.presence || []).map((p) => (
                <div key={p.user_id} className="flex items-center gap-3 border border-white/[0.04] p-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-[10px] font-bold">{p.initials}</div>
                  <div className="flex-1">
                    <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-white/85">{p.journey_level || "—"}</div>
                    <div className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#5A5A62]">{p.focus_contribution_minutes || 0} MIN</div>
                  </div>
                  {p.is_verified_ca && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#B4FF39]">✓</span>}
                  {p.user_id === room.host_user_id && <span className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#F59E0B]">HOST</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* chat */}
        <div className="mt-8 border border-white/[0.06]" data-testid="room-chat">
          <div className="max-h-[260px] overflow-auto p-5">
            {messages.length === 0 && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">no messages yet.</div>}
            {messages.map((m) => (
              <div key={m.message_id} className="mb-2 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-[9px] font-bold shrink-0">{m.initials}</div>
                <div className="flex-1">
                  <div className="font-mono uppercase tracking-[0.22em] text-[9px] text-[#5A5A62]">{m.initials}{m.is_verified_ca ? " · ✓ CA" : ""} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  <div className="font-body text-[13px] text-white/90">{m.content}</div>
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>
          <div className="flex items-center gap-2 p-3 border-t border-white/[0.06]">
            <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} maxLength={300} placeholder="encourage, coordinate, don't distract..." data-testid="room-message-input" className="flex-1 bg-transparent border border-white/[0.08] px-3 py-2 font-body text-[13px] text-white placeholder:text-[#5A5A62] focus:border-[#8B5CF6] outline-none" />
            <button onClick={send} data-testid="room-message-send" className="font-mono uppercase tracking-[0.22em] text-[10.5px] px-3 py-2 border border-[#B4FF39] text-[#B4FF39] hover:bg-[#B4FF39] hover:text-black transition">[ SEND ]</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
