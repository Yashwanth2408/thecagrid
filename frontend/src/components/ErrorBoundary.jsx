import React from "react";
import { api } from "@/lib/apiClient";

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Best-effort report; never throw from the reporter.
    try {
      api
        .post("/client-errors", {
          message: String(error?.message || error || "unknown"),
          stack: (error?.stack || info?.componentStack || "").slice(0, 8000),
          url: typeof window !== "undefined" ? window.location.href : "",
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        })
        .catch(() => {});
    } catch {}
    // Also log locally for dev
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") window.location.href = "/";
  };

  handleReload = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main
        role="alert"
        aria-live="assertive"
        data-testid="error-boundary-fallback"
        className="min-h-screen w-full flex items-center justify-center px-6 py-24"
        style={{ background: "#0A0A0C", color: "#F2F2F2" }}
      >
        <div className="max-w-xl w-full">
          <div
            className="font-mono uppercase tracking-[0.22em] text-[10.5px] mb-6"
            style={{ color: "#B4FF39" }}
          >
            ERROR · Something broke on our side
          </div>
          <h1
            className="font-display text-5xl md:text-6xl leading-[1.02] mb-6"
            style={{ letterSpacing: "-0.02em" }}
          >
            The grid <em style={{ color: "#8B5CF6" }}>flickered</em>.
          </h1>
          <p className="text-base text-white/60 mb-10 max-w-md">
            An unexpected error interrupted the page. We&apos;ve logged the details.
            Try reloading, or head back home and pick up where you left off.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={this.handleReload}
              data-testid="error-boundary-reload"
              className="px-5 py-2.5 rounded-full text-sm font-medium text-black hover:opacity-90 transition-opacity"
              style={{ background: "#B4FF39" }}
            >
              Reload page
            </button>
            <button
              onClick={this.handleReset}
              data-testid="error-boundary-home"
              className="px-5 py-2.5 rounded-full text-sm font-medium border border-white/15 hover:border-white/40 transition-colors"
            >
              Return home
            </button>
          </div>
          {this.state.error?.message && (
            <details className="mt-10 opacity-60 text-xs font-mono">
              <summary className="cursor-pointer select-none">Error detail</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {String(this.state.error.message)}
              </pre>
            </details>
          )}
        </div>
      </main>
    );
  }
}
