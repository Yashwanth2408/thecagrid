import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, Timer, BarChart3, UserCircle2, LogOut, Settings, User as UserIcon } from "lucide-react";

const NAV = [
  { key: "dashboard", label: "Dashboard", to: "/dashboard", icon: LayoutGrid },
  { key: "focus", label: "Focus", to: "/focus", icon: Timer },
  { key: "analytics", label: "Analytics", to: "/analytics", icon: BarChart3 },
  { key: "profile", label: "Profile", to: "/profile", icon: UserCircle2 },
];

function keyForPath(pathname) {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/focus")) return "focus";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/profile")) return "profile";
  return "";
}

export default function AppShell({ children, breadcrumb }) {
  const { user, stats, refreshStats, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = keyForPath(location.pathname);
  const streak = stats?.current_streak ?? 0;
  const level = stats?.level ?? 1;

  // Refresh stats when shell mounts / user changes (covers post-login race)
  useEffect(() => {
    if (user && !stats) refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const initials = (user?.name || user?.email || "U")
    .split(/\s+|@/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");

  const onLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const crumb = breadcrumb || `DASHBOARD / ${activeKey?.toUpperCase() || "OVERVIEW"}`;

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F2F2] flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0A0A0C]/70 border-b border-[#8B5CF6]/40" data-testid="app-topnav">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-16 grid grid-cols-3 items-center">
          <Link to="/dashboard" className="flex items-center gap-3 justify-self-start"><Logo /></Link>
          <div className="justify-self-center font-mono uppercase tracking-[0.24em] text-[11px] text-[#8B8B92]" data-testid="app-breadcrumb">
            {crumb}
          </div>
          <div className="justify-self-end flex items-center gap-5">
            <div className="flex items-center gap-2 font-mono tabular-nums text-[13px]" data-testid="nav-streak-flame">
              <FlameIdle />
              <span className="text-[#B4FF39] font-medium">{streak}</span>
              <span className="text-[10px] uppercase tracking-[0.22em] text-[#5A5A62] ml-0.5">d</span>
            </div>
            <div
              className="flex items-center gap-1.5 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B5CF6] border border-[#8B5CF6]/40 px-2.5 py-1"
              data-testid="nav-level"
            >
              <span className="text-[9.5px] text-[#5A5A62]">L</span>{level}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#4C1D95] flex items-center justify-center text-xs font-bold border border-white/[0.06] hover:border-[#8B5CF6]/60 transition"
                  data-testid="user-avatar-trigger"
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#111114] border-white/[0.06] text-[#F2F2F2] rounded-none font-mono">
                <DropdownMenuLabel className="text-[#8B8B92] font-normal py-3">
                  <div className="font-sans text-sm text-[#F2F2F2] font-semibold truncate normal-case tracking-normal">{user?.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5A5A62] truncate mt-1">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={() => navigate("/profile")} className="focus:bg-white/[0.04] cursor-pointer uppercase tracking-[0.22em] text-[11px]" data-testid="menu-profile">
                  <UserIcon className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/coming-soon?f=settings")} className="focus:bg-white/[0.04] cursor-pointer uppercase tracking-[0.22em] text-[11px]" data-testid="menu-settings">
                  <Settings className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem onClick={onLogout} className="focus:bg-white/[0.04] cursor-pointer uppercase tracking-[0.22em] text-[11px] text-[#8B5CF6]" data-testid="menu-logout">
                  <LogOut className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="hidden md:flex flex-col w-16 py-8 gap-2 border-r border-white/[0.06] bg-[#0A0A0C]/60 backdrop-blur" data-testid="app-sidebar">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = n.key === activeKey;
            return (
              <Link
                key={n.key}
                to={n.to}
                className="relative mx-3 h-11 flex items-center justify-center group"
                data-testid={`sidebar-${n.key}`}
                title={n.label}
              >
                {active && <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#8B5CF6]" />}
                <Icon className={`w-5 h-5 transition-colors ${active ? "text-[#F2F2F2]" : "text-[#5A5A62] group-hover:text-[#F2F2F2]"}`} strokeWidth={1.5} />
              </Link>
            );
          })}
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function FlameIdle() {
  return (
    <span
      className="text-[15px] leading-none"
      style={{ animation: "flameflicker 1.6s ease-in-out infinite" }}
    >
      🔥
      <style>{`@keyframes flameflicker { 0%,100% { opacity: 1; } 50% { opacity: 0.82; } }`}</style>
    </span>
  );
}
