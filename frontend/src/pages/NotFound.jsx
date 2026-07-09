import React from "react";
import { Link } from "react-router-dom";
import GridBackground from "@/components/GridBackground";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function NotFound() {
  const { user } = useAuth();
  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#0A0A0C", color: "#F2F2F2" }}
      data-testid="not-found-page"
    >
      <GridBackground />
      <div className="relative z-10 min-h-screen flex items-center px-6">
        <div className="max-w-3xl mx-auto w-full py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-mono uppercase tracking-[0.22em] text-[10.5px] mb-8"
            style={{ color: "#8B5CF6" }}
          >
            ERROR · 404 · Page not found
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="font-display leading-[0.96] mb-8"
            style={{
              fontSize: "clamp(72px, 14vw, 176px)",
              letterSpacing: "-0.03em",
            }}
          >
            <span style={{ color: "#8B5CF6" }}>404</span>
            <br />
            <em className="italic" style={{ color: "rgba(255,255,255,0.85)" }}>
              nothing here.
            </em>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-base md:text-lg text-white/60 max-w-lg mb-10"
          >
            The URL you followed points to a page that doesn&apos;t exist on
            <em className="not-italic mx-1" style={{ color: "#F2F2F2" }}>
              The&nbsp;CA&nbsp;Grid
            </em>
            — or it may have moved. Let&apos;s get you back on track.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-3"
          >
            <Link
              to={user ? "/dashboard" : "/"}
              data-testid="not-found-home-link"
              className="px-5 py-2.5 rounded-full text-sm font-medium text-black hover:opacity-90 transition"
              style={{ background: "#B4FF39" }}
            >
              {user ? "Back to dashboard" : "Back to home"}
            </Link>
            {!user && (
              <Link
                to="/signup"
                data-testid="not-found-signup-link"
                className="px-5 py-2.5 rounded-full text-sm font-medium border border-white/15 hover:border-white/40 transition"
              >
                Start free
              </Link>
            )}
            <Link
              to="/mentor"
              data-testid="not-found-mentor-link"
              className="px-5 py-2.5 rounded-full text-sm font-medium border border-white/15 hover:border-white/40 transition"
            >
              Ask the AI mentor
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
