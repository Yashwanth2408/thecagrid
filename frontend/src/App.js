import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import "@/App.css";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthCallback from "@/components/AuthCallback";
import CustomCursor from "@/components/CustomCursor";
import NoiseOverlay from "@/components/NoiseOverlay";
import MentorDrawer from "@/components/MentorDrawer";
import { ToastProvider } from "@/components/MicroToast";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Focus from "@/pages/Focus";
import Analytics from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import Mentor from "@/pages/Mentor";
import StudyPlan from "@/pages/StudyPlan";
import ComingSoon from "@/pages/ComingSoon";

function RoutedApp() {
  const location = useLocation();
  const { user } = useAuth();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  // Hide drawer on Mentor page itself + landing/auth pages
  const drawerVisible = user && !["/", "/login", "/signup", "/onboarding", "/mentor"].some((p) => location.pathname === p || location.pathname.startsWith("/mentor"));

  return (
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes location={location}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<ProtectedRoute requireOnboarded={false}><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/focus" element={<ProtectedRoute><Focus /></ProtectedRoute>} />
            <Route path="/mentor" element={<ProtectedRoute><Mentor /></ProtectedRoute>} />
            <Route path="/mentor/study-plan" element={<ProtectedRoute><StudyPlan /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/coming-soon" element={<ProtectedRoute><ComingSoon /></ProtectedRoute>} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
      {drawerVisible && <MentorDrawer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NoiseOverlay />
          <CustomCursor />
          <RoutedApp />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
