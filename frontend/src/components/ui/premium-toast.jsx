"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, AlertCircle, AlertTriangle, Info, CheckCircle, Loader2, Bell, Shield, MessageSquare, Zap, Sparkles } from "lucide-react"

/**
 * Premium Toast/Notification System
 */
const toastIcons = {
  default: { icon: Bell, color: "#8B5CF6", bg: "bg-[#8B5CF6]/15 border-[#8B5CF6]/30" },
  success: { icon: CheckCircle, color: "#10B981", bg: "bg-[#10B981]/15 border-[#10B981]/30" },
  error: { icon: AlertCircle, color: "#EF4444", bg: "bg-[#EF4444]/15 border-[#EF4444]/30" },
  warning: { icon: AlertTriangle, color: "#F59E0B", bg: "bg-[#F59E0B]/15 border-[#F59E0B]/30" },
  info: { icon: Info, color: "#06B6D4", bg: "bg-[#06B6D4]/15 border-[#06B6D4]/30" },
  loading: { icon: Loader2, color: "#8B5CF6", bg: "bg-[#8B5CF6]/15 border-[#8B5CF6]/30" },
  streak: { icon: Zap, color: "#B4FF39", bg: "bg-[#B4FF39]/15 border-[#B4FF39]/30" },
  badge: { icon: Shield, color: "#8B5CF6", bg: "bg-[#8B5CF6]/15 border-[#8B5CF6]/30" },
  community: { icon: MessageSquare, color: "#EC4899", bg: "bg-[#EC4899]/15 border-[#EC4899]/30" },
  achievement: { icon: Sparkles, color: "#F59E0B", bg: "bg-[#F59E0B]/15 border-[#F59E0B]/30" },
}

export function Toast({
  type = "default",
  title,
  message,
  action,
  dismissible = true,
  duration = 5000,
  onDismiss,
  className,
}) {
  const [visible, setVisible] = React.useState(true)
  const { icon: Icon, color, bg } = toastIcons[type] || toastIcons.default

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => setVisible(false), duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  if (!visible) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={cn(
          "relative flex items-start gap-3 p-4 rounded-xl border shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          "backdrop-blur-xl",
          bg,
          "animate-slide-in-right",
          className
        )}
        initial={{ opacity: 0, x: 100, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 100, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        role="alert"
        aria-live="polite"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color, color: color === "#B4FF39" ? "#0A0A0C" : "white" }}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <motion.h4 className="font-medium text-white mb-1" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              {title}
            </motion.h4>
          )}
          {message && (
            <motion.p className="text-white/80 text-sm leading-relaxed" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              {message}
            </motion.p>
          )}
          {action && (
            <motion.button
              onClick={action.onClick}
              className="mt-3 px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-[10px] rounded-lg transition-colors"
              style={{ background: color, color: color === "#B4FF39" ? "#0A0A0C" : "white" }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {action.label}
            </motion.button>
          )}
        </div>
        {dismissible && (
          <motion.button
            onClick={() => { setVisible(false); onDismiss?.() }}
            className="flex-shrink-0 p-1 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

Toast.displayName = "Toast"

/**
 * Toast Container / Provider
 */
export function ToastContainer({ toasts, onDismiss, className, position = "top-right" }) {
  const positions = {
    "top-right": "fixed top-6 right-6 z-[9999] flex flex-col gap-3",
    "top-left": "fixed top-6 left-6 z-[9999] flex flex-col gap-3",
    "bottom-right": "fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3",
    "bottom-left": "fixed bottom-6 left-6 z-[9999] flex flex-col-reverse gap-3",
    "top-center": "fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3",
    "bottom-center": "fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-3",
  }

  return (
    <div className={cn(positions[position], className)} role="region" aria-label="Notifications">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            onDismiss={() => onDismiss?.(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

ToastContainer.displayName = "ToastContainer"

/**
 * Hook for using toasts
 */
export function useToast() {
  const [toasts, setToasts] = React.useState([])

  const addToast = React.useCallback((toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newToast = { ...toast, id }
    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const dismiss = React.useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const dismissAll = React.useCallback(() => {
    setToasts([])
  }, [])

  const success = React.useCallback((title, message, options = {}) => {
    addToast({ type: "success", title, message, ...options })
  }, [addToast])

  const error = React.useCallback((title, message, options = {}) => {
    addToast({ type: "error", title, message, ...options })
  }, [addToast])

  const warning = React.useCallback((title, message, options = {}) => {
    addToast({ type: "warning", title, message, ...options })
  }, [addToast])

  const info = React.useCallback((title, message, options = {}) => {
    addToast({ type: "info", title, message, ...options })
  }, [addToast])

  const loading = React.useCallback((title, message, options = {}) => {
    return addToast({ type: "loading", title, message, duration: 0, ...options })
  }, [addToast])

  const streak = React.useCallback((title, message, options = {}) => {
    addToast({ type: "streak", title, message, ...options })
  }, [addToast])

  const badge = React.useCallback((title, message, options = {}) => {
    addToast({ type: "badge", title, message, ...options })
  }, [addToast])

  const community = React.useCallback((title, message, options = {}) => {
    addToast({ type: "community", title, message, ...options })
  }, [addToast])

  const achievement = React.useCallback((title, message, options = {}) => {
    addToast({ type: "achievement", title, message, ...options })
  }, [addToast])

  return {
    toasts,
    addToast,
    dismiss,
    dismissAll,
    success,
    error,
    warning,
    info,
    loading,
    streak,
    badge,
    community,
    achievement,
  }
}

/**
 * Inline Alert/Banner Component
 */
export function Alert({
  type = "default",
  title,
  children,
  dismissible = false,
  onDismiss,
  action,
  className,
}) {
  const { icon: Icon, color, bg } = toastIcons[type] || toastIcons.default
  const [visible, setVisible] = React.useState(true)

  if (!visible) return null

  return (
    <motion.div
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-xl border",
        "backdrop-blur-xl",
        bg,
        className
      )}
      initial={{ opacity: 0, y: -20, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -20, height: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      role="alert"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color, color: color === "#B4FF39" ? "#0A0A0C" : "white" }}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-medium text-white mb-1">{title}</h4>}
        <div className="text-white/80 text-sm leading-relaxed">{children}</div>
        {action && (
          <motion.button
            onClick={action.onClick}
            className="mt-3 px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-[10px] rounded-lg transition-colors"
            style={{ background: color, color: color === "#B4FF39" ? "#0A0A0C" : "white" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {action.label}
          </motion.button>
        )}
      </div>
      {dismissible && (
        <motion.button
          onClick={() => { setVisible(false); onDismiss?.() }}
          className="flex-shrink-0 p-1 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" strokeWidth={2} />
        </motion.button>
      )}
    </motion.div>
  )
}

Alert.displayName = "Alert"

/**
 * Notification Badge
 */
export function NotificationBadge({
  count,
  max = 99,
  className,
  variant = "default", // default | subtle | pulse
  showZero = false,
}) {
  if (count === 0 && !showZero) return null

  const displayCount = count > max ? `${max}+` : count

  const variants = {
    default: "bg-gradient-to-r from-[#EF4444] to-[#F97316] text-white",
    subtle: "bg-white/[0.1] text-white/70 border border-white/[0.1]",
    pulse: "bg-gradient-to-r from-[#EF4444] to-[#F97316] text-white animate-pulse-ring",
  }

  return (
    <motion.span
      className={cn(
        "inline-flex items-center justify-center font-mono font-medium",
        "min-w-[18px] h-5 px-1.5 rounded-full",
        "text-[10px] leading-none",
        variants[variant],
        className
      )}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      whileHover={{ scale: 1.1 }}
    >
      {displayCount}
    </motion.span>
  )
}

NotificationBadge.displayName = "NotificationBadge"

/**
 * Floating Action Toast (for major achievements)
 */
export function AchievementToast({
  title,
  subtitle,
  icon,
  color = "#8B5CF6",
  onDismiss,
  duration = 8000,
}) {
  const [visible, setVisible] = React.useState(true)

  React.useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration)
    return () => clearTimeout(timer)
  }, [duration])

  if (!visible) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed bottom-8 right-8 z-[9999] max-w-md"
        initial={{ opacity: 0, y: 100, scale: 0.9, rotate: -5 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, y: 100, scale: 0.9, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0F0F12]/95 backdrop-blur-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] p-6">
          <div className="absolute inset-0 bg-gradient-to-br opacity-10" style={{ background: color }} />
          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
              {icon ? (
                <span className="text-3xl">{icon}</span>
              ) : (
                <span className="text-4xl">🏆</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <motion.h4 className="font-display italic text-xl text-white mb-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                {title}
              </motion.h4>
              <motion.p className="text-white/70 text-sm" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {subtitle}
              </motion.p>
            </div>
            <motion.button
              onClick={() => { setVisible(false); onDismiss?.() }}
              className="flex-shrink-0 p-1 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </motion.button>
          </div>
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}00)` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: duration / 1000, ease: "linear" }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

AchievementToast.displayName = "AchievementToast"

/**
 * Progress Toast (for long-running operations)
 */
export function ProgressToast({
  title,
  message,
  progress, // 0-100
  onCancel,
  className,
}) {
  return (
    <motion.div
      className={cn(
        "relative flex items-start gap-3 p-4 rounded-xl border bg-[#8B5CF6]/15 border-[#8B5CF6]/30",
        "backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        className
      )}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      role="alert"
      aria-live="polite"
    >
      <Loader2 className="w-8 h-8 flex-shrink-0 text-[#8B5CF6] animate-spin" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-medium text-white mb-1">{title}</h4>}
        {message && <p className="text-white/80 text-sm mb-3">{message}</p>}
        <motion.div className="h-1.5 rounded-full bg-white/[0.1] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #8B5CF6, #A855F7)" }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </motion.div>
        <p className="mt-2 font-mono text-[11px] text-white/50 tabular-nums">{Math.round(progress)}%</p>
        {onCancel && (
          <motion.button
            onClick={onCancel}
            className="mt-3 text-white/60 hover:text-white font-mono uppercase tracking-[0.18em] text-[10px]"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

ProgressToast.displayName = "ProgressToast"