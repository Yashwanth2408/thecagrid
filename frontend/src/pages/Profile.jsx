import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import BadgeIcon from "@/components/BadgeIcon";
import { api, API } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TABS = ["ALL", "UNLOCKED", "LOCKED", "LEGENDARY"];

export default function Profile() {
  const { user, stats, logout } = useAuth();
  const [badges, setBadges] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [exporting, setExporting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const handleExport = async () => {
    setExporting(true);
    try {
      // Use fetch so we can trigger a native download
      const res = await fetch(`${API}/account/export`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cagrid-export-${user?.user_id || "me"}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (e) {
      toast.error("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") {
      toast.error('Type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      await api.delete("/account/delete");
      toast.success("Account deleted");
      if (logout) await logout();
      navigate("/", { replace: true });
    } catch (e) {
      toast.error("Delete failed. Try again.");
      setDeleting(false);
    }
  };

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

        {/* Account data rights */}
        <div className="mt-20 border-t border-white/[0.06] pt-10" data-testid="account-section">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6]">[ account ]</div>
          <h2 className="mt-3 font-display italic text-[40px] lg:text-[56px] leading-[0.98] tracking-[-0.02em]">
            Your data. <span className="text-[#8B5CF6]">Your rules.</span>
          </h2>
          <p className="mt-4 text-white/60 text-[15px] max-w-[60ch]">
            Export a JSON snapshot of every row tied to your account, or permanently
            delete the account and all associated data. Deletion is immediate and
            irreversible.
          </p>
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="p-6 border border-white/[0.08] bg-[#0F0F12]" data-testid="account-export-card">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] mb-2">
                EXPORT
              </div>
              <div className="text-[17px] font-semibold mb-1">Download my data</div>
              <div className="text-white/50 text-sm mb-6">
                Profile, sessions, streaks, badges, mentor history, and study plans.
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                data-testid="account-export-btn"
                className="px-4 py-2 rounded-full text-sm font-medium text-black hover:opacity-90 transition disabled:opacity-50"
                style={{ background: "#B4FF39" }}
              >
                {exporting ? "Preparing…" : "Export JSON"}
              </button>
            </div>
            <div className="p-6 border border-[#FF6B6B]/30 bg-[#0F0F12]" data-testid="account-delete-card">
              <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#FF6B6B] mb-2">
                DANGER · Delete account
              </div>
              <div className="text-[17px] font-semibold mb-1">Delete everything</div>
              <div className="text-white/50 text-sm mb-6">
                Cascades across profile, sessions, mentor history &amp; plans. Cannot be undone.
              </div>
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  data-testid="account-delete-btn"
                  className="px-4 py-2 rounded-full text-sm font-medium border border-[#FF6B6B]/50 text-[#FF6B6B] hover:bg-[#FF6B6B]/10 transition"
                >
                  Delete my account
                </button>
              ) : (
                <div className="space-y-3">
                  <label className="block">
                    <span className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/50">
                      Type DELETE to confirm
                    </span>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      data-testid="account-delete-confirm-input"
                      className="mt-2 w-full bg-transparent border border-white/[0.15] focus:border-[#FF6B6B] focus:outline-none px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      data-testid="account-delete-confirm-btn"
                      className="px-4 py-2 rounded-full text-sm font-medium bg-[#FF6B6B] text-black disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Confirm delete"}
                    </button>
                    <button
                      onClick={() => { setShowDelete(false); setDeleteConfirm(""); }}
                      className="px-4 py-2 rounded-full text-sm font-medium border border-white/15 hover:border-white/40 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
