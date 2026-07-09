/**
 * The CA Grid — Design tokens
 * Single source of truth for palette, spacing, motion.
 */
export const theme = {
  color: {
    bg: "#0A0A0B",
    bgPanel: "#111114",
    bgCard: "#16161B",
    violet: "#7C3AED",
    violetHover: "#8B5CF6",
    amber: "#F59E0B",
    emerald: "#10B981",
    text: "#F5F5F7",
    textDim: "#A1A1AA",
    textMuted: "#71717A",
    border: "rgba(255,255,255,0.06)",
    borderHover: "rgba(124,58,237,0.4)",
  },
  radius: {
    card: "20px",
    button: "12px",
  },
  motion: {
    fast: 0.2,
    base: 0.28,
    slow: 0.35,
  },
};

export const glow = (opacity = 0.35) =>
  `0 20px 60px -20px rgba(124,58,237,${opacity})`;

export const cardBase =
  "rounded-[20px] border border-white/[0.06] bg-[#16161B] backdrop-blur-xl transition-all duration-300";
