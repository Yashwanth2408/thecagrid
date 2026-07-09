import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Tag } from "lucide-react";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";

function heroGradientStyle(grad) {
  const [a, b, c] = grad || ["#7C3AED", "#0A0A0C", "#8B5CF6"];
  return {
    background: `radial-gradient(120% 100% at 20% 10%, ${a} 0%, ${b} 55%, ${c} 100%)`,
  };
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

function PostCard({ post, variant = "default" }) {
  if (variant === "hero") {
    return (
      <Link
        to={`/hub/${post.slug}`}
        data-testid={`hub-post-${post.slug}`}
        className="block group relative overflow-hidden border border-white/[0.06] hover:border-[#8B5CF6]/60 transition-colors"
      >
        <div className="aspect-[16/9] w-full" style={heroGradientStyle(post.hero_gradient)}>
          <div className="w-full h-full flex flex-col justify-end p-8 lg:p-10 bg-gradient-to-t from-[#0A0A0C]/80 via-[#0A0A0C]/20 to-transparent">
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] mb-3">
              {post.tags?.slice(0, 2).map((t) => `[ ${t.toUpperCase()} ]`).join(" ")}
            </div>
            <h2 className="font-display italic leading-[1.02] text-white" style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.02em" }}>
              {post.title}
            </h2>
            <div className="mt-4 font-mono uppercase tracking-[0.2em] text-[10.5px] text-white/60">
              {post.author_name} · {post.read_minutes} MIN READ
            </div>
          </div>
        </div>
      </Link>
    );
  }
  if (variant === "compact") {
    return (
      <Link
        to={`/hub/${post.slug}`}
        data-testid={`hub-post-${post.slug}`}
        className="block group border border-white/[0.06] hover:border-[#8B5CF6]/60 transition-colors p-5"
      >
        <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-2">
          [ {post.tags?.[0]?.toUpperCase() || "READ"} ]
        </div>
        <h3 className="font-display italic text-[20px] leading-[1.15] text-white/95 group-hover:text-white transition">
          {post.title}
        </h3>
        <div className="mt-3 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">
          {post.author_role?.split("·")[0]?.trim() || post.author_name} · {post.read_minutes}M
        </div>
      </Link>
    );
  }
  // horizontal
  return (
    <Link
      to={`/hub/${post.slug}`}
      data-testid={`hub-post-${post.slug}`}
      className="group grid grid-cols-[120px_1fr] md:grid-cols-[180px_1fr] gap-5 border border-white/[0.06] hover:border-[#8B5CF6]/60 transition-colors overflow-hidden"
    >
      <div className="aspect-square md:aspect-[4/3]" style={heroGradientStyle(post.hero_gradient)} />
      <div className="p-4 md:p-5 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-2">
            [ {(post.tags?.[0] || "READ").toUpperCase()} ]
          </div>
          <h3 className="font-display italic text-[18px] md:text-[22px] leading-[1.15] text-white/95 group-hover:text-white transition line-clamp-3">
            {post.title}
          </h3>
        </div>
        <div className="mt-3 font-mono uppercase tracking-[0.18em] text-[10px] text-[#5A5A62] truncate">
          {post.author_name} · {post.read_minutes}M
        </div>
      </div>
    </Link>
  );
}

export default function Hub() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState("all");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tag !== "all") params.set("tag", tag);
    params.set("level", "all");
    api.get(`/content/posts?${params.toString()}`)
      .then((r) => setPosts(r.data.items || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [tag]);

  const allTags = useMemo(() => {
    const s = new Set();
    posts.forEach((p) => (p.tags || []).forEach((t) => s.add(t)));
    return ["all", ...Array.from(s).slice(0, 12)];
  }, [posts]);

  const hero = posts[0];
  const secondary = posts.slice(1, 4);
  const rest = posts.slice(4);

  return (
    <AppShell breadcrumb="APP / HUB">
      <GridBackground />
      <div className="relative max-w-[1200px] mx-auto px-6 lg:px-10 py-16" data-testid="hub-page">
        <header className="mb-14">
          <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">
            [ CONTENT HUB ]
          </div>
          <h1 className="font-display italic leading-[0.96] tracking-[-0.03em]" style={{ fontSize: "clamp(48px, 9vw, 112px)" }}>
            Read <span style={{ color: "#8B5CF6" }}>between</span><br/>the sessions.
          </h1>
          <div className="mt-6 font-mono uppercase tracking-[0.22em] text-[11px] text-[#8B8B92]">
            {posts.length} POSTS · TOPPER INTERVIEWS · STRATEGY · REGULATORY · CAREER
          </div>
        </header>

        {/* Tag filter */}
        <div className="flex flex-wrap gap-2 mb-12">
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              data-testid={`hub-tag-filter-${t}`}
              className="px-3 py-1.5 font-mono uppercase tracking-[0.22em] text-[10.5px] transition"
              style={{
                color: tag === t ? "#0A0A0C" : "#8B8B92",
                background: tag === t ? "#B4FF39" : "transparent",
                border: `1px solid ${tag === t ? "#B4FF39" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              {t === "all" ? "ALL" : t.toUpperCase()}
            </button>
          ))}
        </div>

        {loading && <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">loading…</div>}
        {!loading && posts.length === 0 && (
          <div className="py-24 text-center" data-testid="hub-empty">
            <div className="font-display italic text-[40px] text-white/50">no posts match this filter.</div>
          </div>
        )}

        {/* Hero + secondary */}
        {hero && (
          <div className="grid lg:grid-cols-3 gap-4 mb-16">
            <div className="lg:col-span-2">
              <PostCard post={hero} variant="hero" />
            </div>
            <div className="flex flex-col gap-4">
              {secondary.map((p) => (
                <PostCard key={p.slug} post={p} variant="compact" />
              ))}
            </div>
          </div>
        )}

        {/* Grid — alternating horizontal + compact */}
        <div className="grid md:grid-cols-2 gap-4">
          {rest.map((p, i) => (
            <PostCard key={p.slug} post={p} variant={i % 3 === 0 ? "horizontal" : "compact"} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
