import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";
import CustomCursor from "@/components/CustomCursor";
import NoiseOverlay from "@/components/NoiseOverlay";
import MentorDrawer from "@/components/MentorDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/MicroToast";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Focus from "@/pages/Focus";
import Analytics from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import Mentor from "@/pages/Mentor";
import StudyPlan from "@/pages/StudyPlan";
import ComingSoon from "@/pages/ComingSoon";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import NotFound from "@/pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

function DefaultSEO() {
  return (
    <Helmet>
      <html lang="en" />
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#0A0A0C" />
      <title>The CA Grid · Your CA journey, finally in one place.</title>
      <meta
        name="description"
        content="A premium dark-mode-first productivity platform for Indian Chartered Accountancy aspirants. Focus timer, streaks, AI mentor powered by Claude Sonnet 4.5, and analytics — built for the 2026 cohort."
      />
      <meta name="robots" content="index,follow" />
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="The CA Grid" />
      <meta property="og:title" content="The CA Grid · Your CA journey, finally in one place." />
      <meta
        property="og:description"
        content="Focus timer, streaks, AI mentor, and analytics — built for Indian CA aspirants."
      />
      <meta property="og:image" content="/og-image.svg" />
      <meta property="og:locale" content="en_IN" />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="The CA Grid" />
      <meta
        name="twitter:description"
        content="Focus timer, streaks, AI mentor, and analytics — built for Indian CA aspirants."
      />
      <meta name="twitter:image" content="/og-image.svg" />
      {/* Icons + manifest */}
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
    </Helmet>
  );
}

function RoutedApp() {
  const location = useLocation();
  const { user } = useAuth();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  // Hide drawer on Mentor page itself + landing/auth/legal/error pages
  const drawerHiddenPaths = ["/", "/login", "/signup", "/onboarding", "/mentor", "/terms", "/privacy", "/forgot-password", "/reset-password"];
  const drawerVisible = user && !drawerHiddenPaths.some((p) => location.pathname === p || location.pathname.startsWith("/mentor"));

  return (
    <>
      <ScrollToTop />
      <a
        href="#main-content"
        data-testid="skip-to-content"
        className="sr-only focus:not-sr-only fixed top-2 left-2 z-[9999] bg-[#B4FF39] text-black px-4 py-2 rounded text-sm font-medium"
      >
        Skip to main content
      </a>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          id="main-content"
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/onboarding" element={<ProtectedRoute requireOnboarded={false}><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/focus" element={<ProtectedRoute><Focus /></ProtectedRoute>} />
            <Route path="/mentor" element={<ProtectedRoute><Mentor /></ProtectedRoute>} />
            <Route path="/mentor/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/coming-soon" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {drawerVisible && <MentorDrawer />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <DefaultSEO />
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <NoiseOverlay />
              <CustomCursor />
              <RoutedApp />
              <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                  style: {
                    background: "#111114",
                    color: "#F2F2F2",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "Space Grotesk, system-ui, sans-serif",
                  },
                  className: "cagrid-toast",
                }}
              />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
