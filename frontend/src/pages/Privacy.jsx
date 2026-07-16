import React from "react";
import { Link } from "react-router-dom";
import GridBackground from "@/components/GridBackground";
import { Helmet } from "react-helmet-async";

function Section({ n, title, children }) {
  return (
    <section className="mb-14" data-testid={`legal-section-${n}`}>
      <div
        className="font-mono uppercase tracking-[0.22em] text-[10.5px] mb-3"
        style={{ color: "#8B5CF6" }}
      >
        § {String(n).padStart(2, "0")}
      </div>
      <h2
        className="font-display leading-[1.05] mb-5"
        style={{ fontSize: "clamp(28px, 4vw, 42px)", letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      <div className="text-white/70 text-[15px] leading-[1.75] space-y-4 max-w-[68ch]">
        {children}
      </div>
    </section>
  );
}

function VendorRow({ name, purpose, dataFlow }) {
  return (
    <tr className="border-b border-white/8">
      <td className="py-3 pr-6 align-top" style={{ color: "#F2F2F2" }}>{name}</td>
      <td className="py-3 pr-6 align-top text-white/70">{purpose}</td>
      <td className="py-3 align-top text-white/50 text-xs font-mono">{dataFlow}</td>
    </tr>
  );
}

export default function Privacy() {
  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#0A0A0C", color: "#F2F2F2" }}
      data-testid="privacy-page"
    >
      <Helmet>
        <title>Privacy Policy · The CA Grid</title>
        <meta
          name="description"
          content="How The CA Grid handles your data — collected, stored, shared, and deleted."
        />
        <meta name="robots" content="index,follow" />
      </Helmet>
      <GridBackground />
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-24">
        <Link
          to="/"
          data-testid="privacy-back-link"
          className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-white/50 hover:text-white transition"
        >
          ← The CA Grid
        </Link>
        <header className="mt-10 mb-16 pb-10 border-b border-white/8">
          <div
            className="font-mono uppercase tracking-[0.22em] text-[10.5px] mb-4"
            style={{ color: "#B4FF39" }}
          >
            LEGAL · Privacy Policy
          </div>
          <h1
            className="font-display leading-[0.98] mb-6"
            style={{ fontSize: "clamp(56px, 9vw, 104px)", letterSpacing: "-0.03em" }}
          >
            <em>Privacy</em>
            <br />
            Policy.
          </h1>
          <div className="font-mono text-[11px] text-white/45 tracking-[0.14em]">
            Operated as an independent product · Built in India · 2026
          </div>
          <div className="font-mono text-[11px] text-white/45 tracking-[0.14em] mt-1">
            Effective: 09 Jul 2026 · Version 1.0
          </div>
        </header>

        <Section n={1} title="What we collect">
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account:</strong> email, display name, and (if Google sign-in) a
              profile picture URL supplied by Google. For email/password accounts we
              store a bcrypt hash — never the plain password.
            </li>
            <li>
              <strong>Onboarding:</strong> your CA journey level, daily study goal,
              subject preferences, and optional city.
            </li>
            <li>
              <strong>Study activity:</strong> focus session records (subject,
              duration, ambient track), streak state, XP, and unlocked badges.
            </li>
            <li>
              <strong>AI mentor:</strong> your prompts and the model responses tied to
              your account, kept so your chat history persists.
            </li>
            <li>
              <strong>Product analytics:</strong> anonymised page navigation and error
              reports via PostHog.
            </li>
          </ul>
        </Section>

        <Section n={2} title="What we do NOT collect">
          <p>
            No payment information (the product is currently free). No location tracking
            beyond the city you optionally provide. No contact list, calendar, or camera
            access. No third-party ad tracking, no data broker sales.
          </p>
        </Section>

        <Section n={3} title="How we use your data">
          <ul className="list-disc pl-6 space-y-1">
            <li>To personalise the dashboard, streak logic, and AI mentor context.</li>
            <li>To operate authentication and keep your session secure.</li>
            <li>
              To diagnose crashes and improve product quality (aggregated telemetry).
            </li>
            <li>To communicate service updates when strictly necessary.</li>
          </ul>
        </Section>

        <Section n={4} title="Third-party services">
          <p>
            We use the following services strictly to make the product work. Data
            flows are minimised.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/15 text-left">
                  <th className="py-2 pr-6 font-mono text-[10.5px] tracking-[0.18em] uppercase text-white/60">Service</th>
                  <th className="py-2 pr-6 font-mono text-[10.5px] tracking-[0.18em] uppercase text-white/60">Purpose</th>
                  <th className="py-2 font-mono text-[10.5px] tracking-[0.18em] uppercase text-white/60">Data shared</th>
                </tr>
              </thead>
              <tbody>
                <VendorRow
                  name="Google OAuth"
                  purpose="Google OAuth sign-in proxy"
                  dataFlow="email · name · Google profile picture URL"
                />
                <VendorRow
                  name="Groq"
                  purpose="AI mentor answers and study-plan generation (Groq-hosted LLM)"
                  dataFlow="your prompt · anonymised study context · no PII beyond level and goals"
                />
                <VendorRow
                  name="MongoDB"
                  purpose="Primary application database (self-hosted / Atlas)"
                  dataFlow="all account &amp; activity data listed in §1"
                />
                <VendorRow
                  name="Pixabay CDN"
                  purpose="Ambient focus audio (rain, lofi, brown noise)"
                  dataFlow="none — audio is streamed to your browser; we do not proxy user data"
                />
                <VendorRow
                  name="PostHog"
                  purpose="Aggregated product analytics + session replay"
                  dataFlow="page views · anonymised events · errors — no passwords, no AI prompts"
                />
                <VendorRow
                  name="Google Fonts"
                  purpose="Serving Instrument Serif · Space Grotesk · JetBrains Mono"
                  dataFlow="your IP is visible to Google when fonts load"
                />
              </tbody>
            </table>
          </div>
        </Section>

        <Section n={5} title="Where your data lives">
          <p>
            Application data lives in a MongoDB cluster hosted in the platform region
            configured for our deployment. Backups are encrypted at rest. All requests
            to our API travel over HTTPS.
          </p>
        </Section>

        <Section n={6} title="Retention &amp; deletion">
          <p>
            We keep your data for as long as your account is active. You can export a
            JSON dump of everything tied to your <code className="font-mono">user_id</code> from
            <em className="mx-1">Profile → Export my data</em>, and delete your account
            (cascade) from <em className="mx-1">Profile → Delete account</em>. Deletion
            removes profile, sessions, focus history, streaks, badges, mentor sessions,
            mentor messages, and study plans. Log-level entries are purged within 30
            days.
          </p>
        </Section>

        <Section n={7} title="Your rights">
          <p>
            You have the right to access, correct, export, and delete your data. Email
            <a
              href="mailto:privacy@cagrid.in"
              className="mx-1 underline decoration-white/20 hover:decoration-white/60"
              style={{ color: "#B4FF39" }}
            >
              privacy@cagrid.in
            </a>
            if the in-product controls don&apos;t cover what you need. We respond within
            30 days.
          </p>
        </Section>

        <Section n={8} title="Cookies">
          <p>
            We use a single httpOnly cookie named <code className="font-mono">session_token</code>{" "}
            to keep you signed in. It&apos;s scoped tightly (SameSite=None, Secure) and
            expires after 7 days. PostHog sets one first-party cookie for analytics; you
            can opt out in your browser or via privacy extensions with no loss of
            functionality.
          </p>
        </Section>

        <Section n={9} title="Security">
          <p>
            See <a href="/SECURITY.md" className="underline decoration-white/20">SECURITY.md</a>{" "}
            for our current posture — bcrypt-hashed passwords, session rotation,
            rate-limited auth endpoints, security headers, and a locked CORS allowlist.
            No system is unbreakable; we act on responsible disclosure at
            <a
              href="mailto:security@cagrid.in"
              className="mx-1 underline decoration-white/20"
              style={{ color: "#B4FF39" }}
            >
              security@cagrid.in
            </a>
            .
          </p>
        </Section>

        <Section n={10} title="Contact">
          <p>
            Data protection questions:
            <a
              href="mailto:privacy@cagrid.in"
              className="mx-1 underline decoration-white/20"
              style={{ color: "#B4FF39" }}
            >
              privacy@cagrid.in
            </a>
            .
          </p>
        </Section>

        <div className="border-t border-white/8 pt-10 mt-16 flex items-center justify-between text-xs font-mono text-white/40">
          <span>© 2026 The CA Grid</span>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-white transition">Terms</Link>
            <Link to="/" className="hover:text-white transition">Home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
