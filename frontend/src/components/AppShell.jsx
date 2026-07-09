import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Flame,
  User as UserIcon,
  ChevronDown,
  LogOut,
  Settings,
  LayoutGrid,
  Timer,
  BarChart3,
  UserCircle2,
} from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { key: "dashboard", label: "Dashboard", to: "/dashboard", icon: LayoutGrid, active: true },
  { key: "focus", label: "Focus", to: "/coming-soon?f=focus", icon: Timer },
  { key: "analytics", label: "Analytics", to: "/coming-soon?f=analytics", icon: BarChart3 },
  { key: "profile", label: "Profile", to: "/coming-soon?f=profile", icon: UserCircle2 },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.name || user?.email || "U")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");

  const onLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F5F5F7] flex flex-col">
      {/* Top nav */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-[#0A0A0B]/70 border-b border-white/[0.06]"
        data-testid="app-topnav"
      >
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02]"
              data-testid="streak-flame"
            >
              <Flame className="w-4 h-4 text-[#F59E0B]" strokeWidth={1.8} />
              <span className="text-sm font-semibold tracking-tight">0</span>
              <span className="text-[11px] text-[#71717A] uppercase tracking-wider ml-1">streak</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-white/[0.06] hover:border-white/[0.15] transition"
                  data-testid="user-avatar-trigger"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] flex items-center justify-center text-xs font-bold">
                    {initials}
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#A1A1AA]" strokeWidth={1.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#111114] border-white/[0.06] text-[#F5F5F7]"
              >
                <DropdownMenuLabel className="text-[#A1A1AA] font-normal">
                  <div className="text-sm text-[#F5F5F7] font-semibold truncate">{user?.name}</div>
                  <div className="text-xs text-[#71717A] truncate">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem
                  onClick={() => navigate("/coming-soon?f=profile")}
                  className="focus:bg-white/[0.04] cursor-pointer"
                  data-testid="menu-profile"
                >
                  <UserIcon className="w-4 h-4 mr-2" strokeWidth={1.5} /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/coming-soon?f=settings")}
                  className="focus:bg-white/[0.04] cursor-pointer"
                  data-testid="menu-settings"
                >
                  <Settings className="w-4 h-4 mr-2" strokeWidth={1.5} /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="focus:bg-white/[0.04] cursor-pointer text-[#F5F5F7]"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside
          className="hidden md:flex flex-col w-16 py-6 gap-2 border-r border-white/[0.06] bg-[#0A0A0B]/60 backdrop-blur"
          data-testid="app-sidebar"
        >
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.key}
                to={n.to}
                className={`mx-2 h-11 rounded-xl flex items-center justify-center transition-all ${
                  n.active
                    ? "bg-[#7C3AED]/20 text-[#F5F5F7] shadow-[inset_0_0_0_1px_rgba(124,58,237,0.4)]"
                    : "text-[#71717A] hover:text-[#F5F5F7] hover:bg-white/[0.04]"
                }`}
                data-testid={`sidebar-${n.key}`}
                title={n.label}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </Link>
            );
          })}
        </aside>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
