import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import BadgeIcon from "@/components/BadgeIcon";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const TABS = ["ALL", "UNLOCKED", "LOCKED", "LEGENDARY"];

export default function Profile() {
  const { user, stats } = useAuth();
  const [badges, setBadges] = useState([]);
  const [tab, setTab] = useState("ALL");

  useEffect(() => {
    api.get("/achievements").then((r) => setBadges(r.data)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (tab === "ALL") return badges;
    if (tab === "UNLOCKED") return badges.filter((b) => b.unlocked);
    if (tab === "LOCKED") return badges.filter((b) => !b.unlocked);
    if (tab === "LEGENDARY") return badges.filter((b) => b.rarity === "legendary");
    return badges;
  }, [badges, tab]);

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const initials = (user?.name || user?.email || "U").split(/\s+|@/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");
  const joined = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—";

  return (
    <AppShell breadcrumb="DASHBOARD / PROFILE">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12">
        {/* Header */}
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 lg:col-span-8 flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-2xl font-bold text-[#F2F2F2]" data-testid="profile-avatar">
              {initials}
            </div>
            <div>
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">
                [ level {stats?.level ?? 1} · {stats?.total_xp ?? 0} XP ]
              </div>
              <h1 className="mt-2 font-display italic text-[52px] lg:text-[80px] leading-[0.95]" data-testid="profile-name">
                {user?.name}.
              </h1>
              <div className="mt-3 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92]">
                {user?.journey_level || "—"}
                <span className="mx-3 text-[#5A5A62]">/</span>
                {user?.city || "unknown"}
                <span className="mx-3 text-[#5A5A62]">/</span>
                since {joined}
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:text-right">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">CURRENT STREAK</div>
            <div className="font-display italic text-[64px] leading-[0.95] text-[#B4FF39] tabular-nums">
              🔥 {stats?.current_streak ?? 0}
            </div>
          </div>
        </div>

        {/* Editorial header */}
        <div className="mt-14 border-t border-white/[0.06] pt-10">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ badges ]</div>
          <h2 className="mt-3 font-display italic text-[56px] lg:text-[80px] leading-[0.95] tracking-[-0.02em]">
            {badges.length || 20} unlocks. <span className="text-[#8B5CF6] tabular-nums">{unlockedCount}</span> claimed.
          </h2>

          {/* Tabs */}
          <div className="mt-8 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                data-testid={`profile-tab-${t.toLowerCase()}`}
                className={`font-mono uppercase tracking-[0.22em] text-[11px] px-3.5 py-2 border transition ${
                  tab === t
                    ? "border-[#8B5CF6] text-[#8B5CF6] bg-[#8B5CF6]/10"
                    : "border-white/[0.08] text-[#8B8B92] hover:text-[#F2F2F2]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((b, i) => (
              <motion.div
                key={b.badge_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                whileHover={{ y: -3 }}
                data-testid="badge-card"
                data-cursor-label={b.unlocked ? "UNLOCKED" : "LOCKED"}
                className={`p-6 border ${
                  b.unlocked
                    ? "border-[#8B5CF6]/40 bg-gradient-to-br from-[#0F0F12] to-[#141419]"
                    : "border-white/[0.06] bg-[#0F0F12]"
                }`}
                style={b.unlocked && b.rarity === "legendary" ? { boxShadow: "0 20px 60px -30px rgba(139,92,246,0.7)" } : undefined}
              >
                <div
                  className={`w-12 h-12 border flex items-center justify-center ${
                    b.unlocked ? "border-[#8B5CF6]/50 bg-[#8B5CF6]/10" : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                  style={b.unlocked && b.rarity === "legendary" ? { boxShadow: "0 0 24px rgba(139,92,246,0.5)" } : undefined}
                >
                  <BadgeIcon
                    name={b.icon}
                    className={b.unlocked ? "text-[#8B5CF6]" : "text-[#5A5A62]"}
                    size={22}
                  />
                </div>
                <div className={`mt-5 text-[16px] font-semibold ${b.unlocked ? "text-[#F2F2F2]" : "text-[#8B8B92]"}`}>
                  {b.name}
                </div>
                <div className={`mt-1 font-mono uppercase tracking-[0.22em] text-[9.5px] ${
                  b.rarity === "legendary" ? "text-[#B4FF39]" : b.rarity === "rare" ? "text-[#8B5CF6]" : "text-[#5A5A62]"
                }`}>
                  {b.rarity}{b.unlocked ? "" : " · locked"}
                </div>
                <div className="mt-4 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62] leading-[1.6]">
                  {b.unlocked && b.unlocked_at
                    ? `UNLOCKED · ${new Date(b.unlocked_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }).toUpperCase()}`
                    : b.description.toUpperCase()}
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full font-mono uppercase tracking-[0.22em] text-[11px] text-[#5A5A62]">
                No badges in this filter yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
