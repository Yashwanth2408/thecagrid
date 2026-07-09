import React from "react";
import { Link } from "react-router-dom";
import GridBackground from "@/components/GridBackground";
import { motion } from "framer-motion";

export default function ServerError() {
  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#0A0A0C", color: "#F2F2F2" }}
      data-testid="server-error-page"
    >
      <GridBackground />
      <div className="relative z-10 min-h-screen flex items-center px-6">
        <div className="max-w-3xl mx-auto w-full py-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-mono uppercase tracking-[0.22em] text-[10.5px] mb-8"
            style={{ color: "#F59E0B" }}
          >
            ERROR · 500 · Something on our side broke
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.5 }}
            className="font-display leading-[0.96] mb-8"
            style={{ fontSize: "clamp(72px, 14vw, 176px)", letterSpacing: "-0.03em" }}
          >
            <span style={{ color: "#F59E0B" }}>500</span>
            <br />
            <em className="italic">the grid stalled.</em>
          </motion.h1>
          <p className="text-base md:text-lg text-white/60 max-w-lg mb-10">
            Our servers had a wobble. The error was logged and we&apos;re on it.
            Give it a moment, then try again.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              data-testid="server-error-reload"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-black hover:opacity-90 transition"
              style={{ background: "#B4FF39" }}
            >
              Retry
            </button>
            <Link
              to="/"
              data-testid="server-error-home"
              className="px-5 py-2.5 rounded-full text-sm font-medium border border-white/15 hover:border-white/40 transition"
            >
              Return home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
