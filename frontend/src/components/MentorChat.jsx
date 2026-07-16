import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mic, Volume2, VolumeX, Sparkles } from "lucide-react";
import { api } from "@/lib/apiClient";
import { streamSSE } from "@/lib/streamSSE";

const QUICK_PROMPTS = [
  { n: "01", t: "Explain Ind AS 115 in 4 bullets" },
  { n: "02", t: "Difference between 44AD and 44ADA" },
  { n: "03", t: "Plan my next 7 days of revision" },
  { n: "04", t: "Mock test strategy — 3 weeks out" },
];

function Bubble({ role, children, citations, streaming }) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[80%] rounded-xl px-4 py-3 bg-[#17171B] text-[15px] text-[#F2F2F2]">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-8 pl-4 border-l-2 border-[#8B5CF6]/60">
      <div className="text-[15px] leading-[1.65] text-[#F2F2F2] prose-mentor">
        {children}
        {streaming && (
          <span
            className="inline-block w-[8px] h-[16px] bg-[#8B5CF6] align-middle ml-1"
            style={{ animation: "blink 1s steps(2) infinite" }}
          />
        )}
      </div>
      {citations?.length > 0 && (
        <div className="mt-4 border-l-2 border-[#8B5CF6] bg-[#0F0F12] pl-4 pr-4 py-3">
          <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6] mb-2">SOURCES</div>
          {citations.map((c, i) => (
            <div key={i} className="font-mono text-[11px] text-[#F2F2F2] leading-[1.55]">
              <span className="text-[#8B8B92]">·</span> {c.act}
              {c.section && <span className="text-[#8B5CF6]"> — {c.section}</span>}
              {c.note && <span className="text-[#5A5A62]"> [{c.note}]</span>}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes blink { 50% { opacity: 0; } }
        .prose-mentor h1,.prose-mentor h2,.prose-mentor h3 { font-family:"Instrument Serif",serif; font-style: italic; letter-spacing: -0.02em; color: #F2F2F2; margin-top: 1em; margin-bottom: 0.3em; }
        .prose-mentor h1 { font-size: 30px; } .prose-mentor h2 { font-size: 24px; } .prose-mentor h3 { font-size: 20px; }
        .prose-mentor p { margin: 0.5em 0; }
        .prose-mentor strong { color: #F2F2F2; font-weight: 600; }
        .prose-mentor ul,.prose-mentor ol { margin: 0.5em 0; padding-left: 1.4em; }
        .prose-mentor li { margin: 0.2em 0; }
        .prose-mentor code { font-family: "JetBrains Mono", monospace; font-size: 12.5px; padding: 1px 4px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2); }
        .prose-mentor pre { font-family: "JetBrains Mono", monospace; background: #0A0A0C; border: 1px solid rgba(255,255,255,0.06); padding: 12px; overflow-x: auto; margin: 0.6em 0; }
        .prose-mentor table { width: 100%; border-collapse: collapse; margin: 0.7em 0; font-size: 13px; }
        .prose-mentor th,.prose-mentor td { border: 1px solid rgba(255,255,255,0.08); padding: 6px 10px; text-align: left; }
        .prose-mentor th { background: rgba(139,92,246,0.08); font-family: "JetBrains Mono", monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; color: #8B8B92; }
        .prose-mentor blockquote { border-left: 2px solid #8B5CF6; padding-left: 12px; color: #8B8B92; margin: 0.5em 0; }
      `}</style>
    </div>
  );
}

export default function MentorChat({
  sessionId,       // string | null (null = quick mode)
  mode = "exam",
  onModeChange,
  onSessionChanged, // (session_id) => void  (called on quick → real transition)
  compact = false,
  showEmpty = true,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load session messages
  useEffect(() => {
    setMessages([]);
    if (!sessionId) return;
    let cancel = false;
    api.get(`/mentor/sessions/${sessionId}`).then((r) => {
      if (cancel) return;
      setMessages(r.data.messages || []);
    }).catch(() => {});
    return () => { cancel = true; };
  }, [sessionId]);

  // Autoscroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Voice input (SpeechRecognition)
  const supportsVoice = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const toggleMic = () => {
    if (!supportsVoice) return;
    if (micActive) {
      try { recognitionRef.current?.stop?.(); } catch {}
      setMicActive(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) setInput((cur) => (cur ? `${cur} ${final}` : final));
    };
    rec.onend = () => setMicActive(false);
    try {
      rec.start();
      recognitionRef.current = rec;
      setMicActive(true);
    } catch {}
  };

  // Voice output on new assistant messages
  useEffect(() => {
    if (!voiceOn || streaming) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last.content) {
      try {
        const u = new SpeechSynthesisUtterance(last.content.replace(/SOURCES:[\s\S]*$/i, ""));
        u.lang = "en-IN";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch {}
    }
    // eslint-disable-next-line
  }, [messages.length, streaming, voiceOn]);

  const send = async (rawText) => {
    const text = (rawText ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    const userMsg = { role: "user", content: text, created_at: new Date().toISOString() };
    setMessages((cur) => [...cur, userMsg, { role: "assistant", content: "", citations: null, _streaming: true }]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let effectiveSid = sessionId;
    // If no session yet, create one on the fly with this message as title
    if (!effectiveSid) {
      try {
        const r = await api.post("/mentor/sessions", { mode, initial_message: text });
        effectiveSid = r.data.session_id;
        onSessionChanged?.(effectiveSid);
      } catch (e) {
        setStreaming(false);
        setMessages((cur) => cur.slice(0, -1).concat([{ role: "assistant", content: "Failed to open a session.", _error: true }]));
        return;
      }
    }

    try {
      for await (const ev of streamSSE("/mentor/chat", { session_id: effectiveSid, message: text }, { signal: ctrl.signal })) {
        if (ev.type === "delta") {
          setMessages((cur) => {
            const next = [...cur];
            const last = { ...next[next.length - 1] };
            last.content = (last.content || "") + ev.content;
            last._streaming = true;
            next[next.length - 1] = last;
            return next;
          });
        } else if (ev.type === "citations") {
          setMessages((cur) => {
            const next = [...cur];
            const last = { ...next[next.length - 1] };
            last.citations = ev.citations;
            next[next.length - 1] = last;
            return next;
          });
        } else if (ev.type === "done") {
          setMessages((cur) => {
            const next = [...cur];
            const last = { ...next[next.length - 1] };
            last._streaming = false;
            next[next.length - 1] = last;
            return next;
          });
        } else if (ev.type === "error") {
          setMessages((cur) => cur.slice(0, -1).concat([{ role: "assistant", content: `Error: ${ev.error}`, _error: true }]));
        }
      }
    } catch (e) {
      // aborted or network
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const hasMessages = messages.length > 0;
  const modeLocked = hasMessages;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {onModeChange && (
        <div className={`flex items-center justify-between px-6 py-4 border-b border-white/[0.06] ${compact ? "px-4 py-3" : ""}`}>
          <div className="flex items-center gap-1">
            {["exam", "practice"].map((m) => (
              <button
                key={m}
                disabled={modeLocked && m !== mode}
                onClick={() => !modeLocked && onModeChange(m)}
                title={modeLocked ? "Mode is locked after first message" : ""}
                className={`font-mono uppercase tracking-[0.22em] text-[11px] px-3 py-1.5 border-b-2 transition-colors ${
                  m === mode ? "border-[#8B5CF6] text-[#8B5CF6]" : "border-transparent text-[#8B8B92] hover:text-[#F2F2F2]"
                } ${modeLocked && m !== mode ? "opacity-40 cursor-not-allowed" : ""}`}
                data-testid={`mentor-mode-${m}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#5A5A62]">
            groq runtime
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto ${compact ? "px-4 py-4" : "px-6 py-8"}`}>
        {!hasMessages && showEmpty && (
          <div className="max-w-2xl mx-auto text-center pt-12">
            <div className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} /> ready
            </div>
            <h2 className="mt-6 font-display italic text-[48px] lg:text-[72px] leading-[0.95] tracking-[-0.02em]">
              What are we solving today?
            </h2>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.n}
                  onClick={() => send(p.t)}
                  className="group border border-white/[0.06] hover:border-[#8B5CF6]/40 p-4 transition-colors"
                  data-testid={`mentor-suggestion-${p.n}`}
                >
                  <div className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">[ {p.n} ]</div>
                  <div className="mt-2 text-[14px] text-[#F2F2F2] group-hover:text-[#8B5CF6] transition-colors">{p.t}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} citations={m.citations} streaming={m._streaming}>
            {m.role === "assistant" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {(m.content || "").replace(/SOURCES:[\s\S]*$/i, "").trim()}
              </ReactMarkdown>
            ) : (
              m.content
            )}
          </Bubble>
        ))}
      </div>

      {/* Input row */}
      <div className={`border-t border-white/[0.06] ${compact ? "px-4 py-3" : "px-6 py-5"}`}>
        <div className="flex items-start gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            placeholder="Ask anything — GST, Ind AS, mock strategy…"
            className="flex-1 bg-transparent border-0 border-b border-white/[0.15] focus:border-[#8B5CF6] focus:outline-none focus:ring-0 resize-none px-0 py-2 text-[15px] text-[#F2F2F2] placeholder:text-[#5A5A62] max-h-[144px]"
            data-testid="mentor-input"
          />
          {supportsVoice && (
            <button
              onClick={toggleMic}
              title="Voice input (Chrome/Edge)"
              className={`font-mono uppercase tracking-[0.22em] text-[10px] px-2.5 py-2 border transition ${
                micActive ? "border-[#B4FF39] text-[#B4FF39]" : "border-white/[0.1] text-[#8B8B92] hover:text-[#F2F2F2]"
              }`}
              data-testid="mentor-mic-toggle"
            >
              <Mic className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          )}
          <button
            onClick={() => setVoiceOn((v) => !v)}
            title="Read responses aloud"
            className={`font-mono uppercase tracking-[0.22em] text-[10px] px-2.5 py-2 border transition ${
              voiceOn ? "border-[#8B5CF6] text-[#8B5CF6]" : "border-white/[0.1] text-[#8B8B92] hover:text-[#F2F2F2]"
            }`}
            data-testid="mentor-speak-toggle"
          >
            {voiceOn ? <Volume2 className="w-3.5 h-3.5" strokeWidth={1.8} /> : <VolumeX className="w-3.5 h-3.5" strokeWidth={1.8} />}
          </button>
          <button
            onClick={() => send()}
            disabled={!input.trim() || streaming}
            className="font-mono uppercase tracking-[0.22em] text-[12px] text-[#8B5CF6] disabled:opacity-40"
            data-testid="mentor-send"
            data-magnetic
          >
            [ SEND → ]
          </button>
        </div>
      </div>
    </div>
  );
}
