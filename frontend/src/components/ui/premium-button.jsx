import React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

/**
 * Enhanced Button with premium interactions
 */
export const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ripple = true, magnetic = false, loading = false, icon, iconPosition = "left", ...props }, ref) => {
  const Comp = asChild ? "button" : "button"

  const variants = {
    default: "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_24px_rgba(139,92,246,0.4)] hover:from-[#9D6CF8] hover:to-[#B86CF8] border-none",
    outline: "border border-white/[0.12] bg-transparent hover:bg-white/[0.05] hover:border-[#8B5CF6]/50 text-white",
    ghost: "bg-transparent hover:bg-white/[0.05] border-none text-white/80 hover:text-white",
    secondary: "bg-white/[0.04] border border-white/[0.06] text-white hover:bg-white/[0.08] hover:border-white/[0.12]",
    destructive: "bg-gradient-to-r from-[#EF4444] to-[#F97316] text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)] hover:shadow-[0_8px_24px_rgba(239,68,68,0.4)]",
    success: "bg-gradient-to-r from-[#10B981] to-[#22C55E] text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_24px_rgba(16,185,129,0.4)]",
    lime: "bg-gradient-to-r from-[#B4FF39] to-[#84CC16] text-black shadow-[0_4px_16px_rgba(180,255,57,0.4)] hover:shadow-[0_8px_24px_rgba(180,255,57,0.5)]",
    premium: "relative overflow-hidden bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#EC4899] bg-[length:200%_100%] text-white shadow-[0_4px_20px_rgba(139,92,246,0.4)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.5)] animate-gradient-x",
  }

  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
    default: "h-10 px-4 py-2 text-sm rounded-xl gap-2",
    lg: "h-12 px-6 text-base rounded-xl gap-2.5",
    xl: "h-14 px-8 text-lg rounded-2xl gap-3",
    icon: "h-10 w-10 rounded-xl",
  }

  const [hovered, setHovered] = React.useState(false)

  return (
    <motion.button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0C]",
        "disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none",
        "select-none whitespace-nowrap",
        variants[variant],
        sizes[size],
        magnetic && "magnetic-button",
        className
      )}
      whileHover={!loading && !magnetic ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!loading ? { scale: 0.97 } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={loading || props.disabled}
      {...props}
    >
      {ripple && (
        <RippleEffect className="absolute inset-0 pointer-events-none" color="rgba(255,255,255,0.3)" />
      )}
      <span className={cn("relative flex items-center justify-center gap-2", loading && "opacity-0")}>
        {loading ? (
          <motion.span
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
        ) : (
          <>
            {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
            {props.children}
            {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
        {magnetic && !loading && (
          <motion.span
            className="absolute bottom-0 left-0 w-full h-0.5 bg-white/20 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: hovered ? 1 : 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
      </span>
      {loading && (
        <motion.span
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </motion.span>
      )}
    </motion.button>
  )
})
Button.displayName = "Button"

function RippleEffect({ className, color, ...props }) {
  const [ripples, setRipples] = React.useState([])

  const trigger = React.useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = Date.now() + Math.random()
    setRipples(prev => [...prev, { id, x, y, size }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
  }, [])

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)} onMouseDown={trigger} {...props}>
      {ripples.map(r => (
        <motion.div
          key={r.id}
          initial={{ width: 0, height: 0, opacity: 0.4 }}
          animate={{ width: r.size * 2, height: r.size * 2, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            borderRadius: "50%",
            background: color,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  )
}

/**
 * Icon Button
 */
export function IconButton({ className, variant = "ghost", size = "default", children, ...props }) {
  return (
    <Button variant={variant} size={size} className={cn("p-0", className)} {...props}>
      {children}
    </Button>
  )
}

/**
 * Toggle Button
 */
export function ToggleButton({ pressed, onChange, className, children, variant = "outline", size = "default", ...props }) {
  return (
    <Button
      variant={pressed ? "default" : variant}
      className={cn(pressed && "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7]", className)}
      size={size}
      onClick={() => onChange(!pressed)}
      {...props}
    >
      {children}
    </Button>
  )
}

/**
 * Segmented Control
 */
export function SegmentedControl({ options, value, onChange, className, variant = "default", ...props }) {
  return (
    <div className={cn("inline-flex p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl", className)} role="group" {...props}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? "default" : "ghost"}
          size="sm"
          className="rounded-lg transition-all duration-200"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

/**
 * Floating Action Button
 */
export function FAB({ className, children, variant = "default", size = "lg", position = "bottom-right", ...props }) {
  const positions = {
    "bottom-right": "fixed bottom-8 right-8",
    "bottom-left": "fixed bottom-8 left-8",
    "top-right": "fixed top-8 right-8",
    "top-left": "fixed top-8 left-8",
  }

  return (
    <motion.button
      className={cn(
        "z-50 rounded-full shadow-[0_8px_32px_rgba(139,92,246,0.4)]",
        "hover:shadow-[0_12px_40px_rgba(139,92,246,0.5)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0C]",
        positions[position],
        className
      )}
      whileHover={{ scale: 1.05, rotate: 3 }}
      whileTap={{ scale: 0.95 }}
      variant={variant}
      size={size}
      {...props}
    >
      {children}
    </motion.button>
  )
}

/**
 * Loading Button State Helper
 */
export function useLoadingButton() {
  const [loading, setLoading] = React.useState(false)

  const execute = React.useCallback(async (asyncFn) => {
    setLoading(true)
    try {
      await asyncFn()
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, execute, setLoading }
}