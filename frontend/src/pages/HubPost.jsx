import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import AppShell from "@/components/AppShell";
import GridBackground from "@/components/GridBackground";
import { api } from "@/lib/apiClient";

function heroStyle(grad) {
  const [a, b, c] = grad || ["#7C3AED", "#0A0A0C", "#8B5CF6"];
  return {
    background: `radial-gradient(120% 100% at 20% 10%, ${a} 0%, ${b} 55%, ${c} 100%)`,
  };
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const mdComponents = {
  h1: ({ node, ...p }) => <h1 className="font-display italic text-[36px] md:text-[44px] leading-[1.05] mt-14 mb-5 tracking-[-0.02em]" {...p} />,
  h2: ({ node, children, ...p }) => {
    const text = String(children?.[0] ?? "");
    return (
      <h2 id={slugify(text)} className="font-display italic text-[28px] md:text-[34px] leading-[1.1] mt-12 mb-4 tracking-[-0.02em] text-white/95" {...p}>{children}</h2>
    );
  },
  h3: ({ node, ...p }) => <h3 className="font-display italic text-[22px] md:text-[26px] leading-[1.15] mt-8 mb-3 text-white/95" {...p} />,
  p: ({ node, ...p }) => <p className="text-[17px] leading-[1.75] my-5 text-white/80" {...p} />,
  a: ({ node, ...p }) => <a className="text-[#B4FF39] underline decoration-white/20 hover:decoration-white/60 transition" {...p} />,
  ul: ({ node, ...p }) => <ul className="my-5 pl-6 list-disc space-y-2 text-[17px] leading-[1.7] text-white/80" {...p} />,
  ol: ({ node, ...p }) => <ol className="my-5 pl-6 list-decimal space-y-2 text-[17px] leading-[1.7] text-white/80" {...p} />,
  li: ({ node, ...p }) => <li className="marker:text-[#8B5CF6]" {...p} />,
  blockquote: ({ node, ...p }) => (
    <blockquote className="my-6 pl-5 border-l-2 border-[#8B5CF6] italic font-display text-[19px] md:text-[21px] leading-[1.55] text-white/90" {...p} />
  ),
  code: ({ node, inline, className, children, ...p }) =>
    inline ? (
      <code className="font-mono text-[14px] px-1.5 py-0.5 bg-[#111114] border border-white/[0.08] text-[#B4FF39]" {...p}>{children}</code>
    ) : (
      <pre className="my-6 p-4 bg-[#111114] border border-white/[0.08] overflow-x-auto"><code className="font-mono text-[13px] text-white/85" {...p}>{children}</code></pre>
    ),
  strong: ({ node, ...p }) => <strong className="text-white font-semibold" {...p} />,
  em: ({ node, ...p }) => <em className="italic text-white/95" {...p} />,
  hr: () => <hr className="my-10 border-white/[0.08]" />,
};

function TOC({ headings }) {
  return (
    <nav aria-label="Table of contents" className="font-mono uppercase tracking-[0.2em] text-[10.5px] text-[#5A5A62] space-y-3">
      <div className="text-[#8B5CF6]">[ ON THIS PAGE ]</div>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className="block hover:text-white transition truncate"
          data-testid={`hub-toc-${h.id}`}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}

export default function HubPost() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);
    api.get(`/content/posts/${slug}`)
      .then((r) => setData(r.data))
      .catch((e) => setErr(e?.response?.status === 404 ? "not_found" : "error"))
      .finally(() => setLoading(false));
  }, [slug]);

  const headings = useMemo(() => {
    const body = data?.post?.body_markdown || "";
    const matches = [...body.matchAll(/^##\s+(.+)$/gm)];
    return matches.map((m) => ({ id: slugify(m[1]), text: m[1] }));
  }, [data]);

  if (loading) {
    return (
      <AppShell breadcrumb="APP / HUB / …">
        <div className="max-w-3xl mx-auto px-6 py-24 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#5A5A62]">
          loading…
        </div>
      </AppShell>
    );
  }
  if (err) {
    return (
      <AppShell breadcrumb="APP / HUB / NOT FOUND">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="font-display italic text-[56px] text-white/60">Post not found.</h1>
          <Link to="/hub" className="mt-8 inline-block font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] hover:text-white transition">
            ← back to hub
          </Link>
        </div>
      </AppShell>
    );
  }

  const { post, related } = data;

  return (
    <AppShell breadcrumb={`APP / HUB / ${(post.tags?.[0] || "").toUpperCase()}`}>
      <Helmet>
        <title>{`${post.title} · The CA Grid`}</title>
        <meta name="description" content={post.excerpt || ""} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ""} />
      </Helmet>
      <div className="relative" data-testid="hub-post-page">
        {/* Hero */}
        <div className="w-full aspect-[16/6] md:aspect-[21/6]" style={heroStyle(post.hero_gradient)}>
          <div className="w-full h-full bg-gradient-to-b from-transparent via-[#0A0A0C]/40 to-[#0A0A0C]" />
        </div>

        <div className="relative -mt-40 md:-mt-56">
          <GridBackground />
          <div className="relative max-w-[1100px] mx-auto px-6 lg:px-10">
            <Link
              to="/hub"
              data-testid="hub-post-back"
              className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#B4FF39] hover:text-white transition mb-8"
            >
              <ArrowLeft className="w-3 h-3" strokeWidth={1.5} /> BACK TO HUB
            </Link>
            <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-4">
              {post.tags?.map((t) => `[ ${t.toUpperCase()} ]`).join(" ")}
            </div>
            <h1
              data-testid="hub-post-title"
              className="font-display italic leading-[0.98] tracking-[-0.03em] text-white"
              style={{ fontSize: "clamp(48px, 8vw, 96px)" }}
            >
              {post.title}
            </h1>
            <div className="mt-8 font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92] flex flex-wrap gap-x-4 gap-y-1">
              <span className="text-white/80">{post.author_name}</span>
              <span>·</span>
              <span>{post.author_role}</span>
              <span>·</span>
              <span>{new Date(post.published_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}</span>
              <span>·</span>
              <span>{post.read_minutes} MIN READ</span>
            </div>

            <div className="grid lg:grid-cols-[1fr_240px] gap-14 mt-14">
              <article ref={contentRef} className="max-w-[720px]" data-testid="hub-post-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {post.body_markdown}
                </ReactMarkdown>
              </article>
              <aside className="hidden lg:block sticky top-24 self-start">
                {headings.length > 0 && <TOC headings={headings} />}
              </aside>
            </div>

            {/* Related */}
            {related && related.length > 0 && (
              <div className="mt-24 pt-10 border-t border-white/[0.06]">
                <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B5CF6] mb-6">
                  [ MORE ON THIS TOPIC ]
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      to={`/hub/${r.slug}`}
                      data-testid={`hub-related-${r.slug}`}
                      className="block border border-white/[0.06] hover:border-[#8B5CF6]/60 transition-colors overflow-hidden"
                    >
                      <div className="aspect-[16/9]" style={heroStyle(r.hero_gradient)} />
                      <div className="p-5">
                        <h3 className="font-display italic text-[20px] leading-[1.15] text-white/95">
                          {r.title}
                        </h3>
                        <div className="mt-3 font-mono uppercase tracking-[0.2em] text-[10px] text-[#5A5A62]">
                          {r.author_name} · {r.read_minutes}M
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div className="h-24" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
