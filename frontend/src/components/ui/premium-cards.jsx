import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react"

const Card = React.forwardRef(({ className, children, hover = "lift", border = "subtle", accent = false, radius = 0, padding = "p-6", ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn(
      "relative bg-[#0F0F12] transition-all duration-300",
      "border",
      border === "subtle" && "border-white/[0.06] hover:border-[#8B5CF6]/30",
      border === "accent" && "border-[#8B5CF6]/40",
      border === "glow" && "border-white/[0.06] hover:border-[#8B5CF6]/50 shadow-[0_0_20px_rgba(139,92,246,0.1)]",
      accent && "before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#8B5CF6]/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
      `rounded-${radius === 0 ? "none" : radius === "sm" ? "lg" : radius === "md" ? "xl" : "2xl"}`,
      padding,
      className
    )}
    whileHover={hover === "lift" ? { y: -4, transition: { duration: 0.2 } } : hover === "glow" ? { scale: 1.01, boxShadow: "0 0 40px rgba(139,92,246,0.2)", transition: { duration: 0.3 } } : hover === "none" ? {} : { y: -2 }}
    {...props}
  >
    {children}
  </motion.div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, gradient, ...props }, ref) => (
  <motion.h3
    ref={ref}
    className={cn(
      "font-display italic tracking-tight text-white",
      "text-2xl lg:text-3xl",
      gradient && "bg-gradient-to-r bg-clip-text text-transparent",
      gradient === "violet" && "from-[#8B5CF6] to-[#EC4899]",
      gradient === "lime" && "from-[#B4FF39] to-[#84CC16]",
      gradient === "amber" && "from-[#F59E0B] to-[#EF4444]",
      gradient === "cyan" && "from-[#06B6D4] to-[#8B5CF6]",
      className
    )}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <motion.p
    ref={ref}
    className={cn("text-[#8B8B92] leading-relaxed", className)}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("pt-0", className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, delay: 0.2 }}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-white/[0.04]", className)}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4, delay: 0.25 }}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 4,
  className = "",
  showValue = true,
  gradient = "violet",
  animationDuration = 1.2,
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(value / max, 0), 1)
  const offset = circumference * (1 - progress)

  const gradientDefs = {
    violet: "0% #8B5CF6, 50% #EC4899, 100% #06B6D4",
    lime: "0% #B4FF39, 50% #84CC16, 100% #22C55E",
    amber: "0% #F59E0B, 50% #EF4444, 100% #F97316",
    cyan: "0% #06B6D4, 50% #8B5CF6, 100% #EC4899",
    mono: "0% #F2F2F2, 100% #8B8B92",
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={`progress-gradient-${gradient}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientDefs[gradient].split(",")[0].trim().split(" ")[1]} />
            <stop offset="50%" stopColor={gradientDefs[gradient].split(",")[1].trim().split(" ")[1]} />
            <stop offset="100%" stopColor={gradientDefs[gradient].split(",")[2].trim().split(" ")[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#progress-gradient-${gradient})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: animationDuration, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 8px rgba(139,92,246,0.4))" }}
        />
      </svg>
      {showValue && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center font-display tabular-nums"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: animationDuration * 0.5, ease: "easeOut" }}
        >
          <span className="text-2xl lg:text-3xl font-medium">{Math.round(progress * 100)}%</span>
        </motion.div>
      )}
    </div>
  )
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  trend = "neutral",
  className = "",
  href,
}) {
  const trendColors = {
    positive: "text-[#B4FF39]",
    negative: "text-[#FF6B6B]",
    neutral: "text-[#8B8B92]",
  }

  const trendIcons = {
    positive: "↗",
    negative: "↘",
    neutral: "→",
  }

  return (
    <motion.a
      href={href}
      className={cn("group", className)}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="h-full overflow-hidden" hover="lift" border="subtle" radius="md">
        <CardContent className="h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono uppercase tracking-[0.22em] text-[10px] text-[#8B5CF6]">{label}</span>
              {icon && <span className="text-[#8B8B92] group-hover:text-[#8B5CF6] transition-colors">{icon}</span>}
            </div>
            <motion.div
              className="font-display italic text-4xl lg:text-5xl leading-[0.95] text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {value}
            </motion.div>
          </div>
          {change !== undefined && (
            <motion.div
              className={cn("flex items-center gap-2 mt-4 font-mono uppercase tracking-[0.2em] text-[10px]", trendColors[trend])}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <span>{trendIcons[trend]}</span>
              <span className="tabular-nums">{change >= 0 ? "+" : ""}{change}%</span>
              {changeLabel && <span className="text-[#8B8B92]">{changeLabel}</span>}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.a>
  )
}

export function InteractiveCard({
  children,
  className = "",
  onClick,
  hover = "lift",
  ...props
}) {
  return (
    <motion.button
      className={cn("w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0C]", className)}
      whileHover={hover === "lift" ? { y: -4, transition: { duration: 0.2 } } : hover === "scale" ? { scale: 1.02 } : {}}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      {...props}
    >
      <Card hover={hover} border="subtle" radius="md" className="h-full">
        <CardContent className="h-full">{children}</CardContent>
      </Card>
    </motion.button>
  )
}

export function FeatureCard({
  icon,
  title,
  description,
  tags = [],
  metric,
  className = "",
  variant = "default",
}) {
  const variants = {
    default: "border-white/[0.06] hover:border-[#8B5CF6]/30",
    accent: "border-[#8B5CF6]/40 shadow-[0_0_30px_rgba(139,92,246,0.1)]",
    success: "border-[#B4FF39]/40 shadow-[0_0_30px_rgba(180,255,57,0.1)]",
    warning: "border-[#F59E0B]/40 shadow-[0_0_30px_rgba(245,158,11,0.1)]",
  }

  return (
    <motion.div
      className={cn("group", variants[variant], className)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card hover="lift" border="subtle" radius="xl" className="h-full overflow-hidden relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-[#8B5CF6]/5 before:to-transparent before:opacity-0 group-hover:before:opacity-100 before:transition-opacity">
        <CardContent className="h-full flex flex-col justify-between p-6 lg:p-8">
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              {icon && <span className="text-[#8B5CF6] text-2xl">{icon}</span>}
            </div>
            <motion.h3
              className="font-display italic text-2xl lg:text-3xl leading-[1.1] text-white mb-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {title}
            </motion.h3>
            <motion.p
              className="text-[#8B8B92] leading-relaxed mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {description}
            </motion.p>
          </div>
          <div className="flex flex-wrap gap-2 pt-4 border-t border-white/[0.04]">
            {tags.map((tag, i) => (
              <motion.span
                key={tag}
                className="font-mono uppercase tracking-[0.18em] text-[10px] px-2.5 py-1 border border-white/[0.08] text-[#8B8B92] hover:text-[#8B5CF6] hover:border-[#8B5CF6]/30 transition-colors"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              >
                {tag}
              </motion.span>
            ))}
          </div>
          {metric && (
            <motion.div
              className="mt-6 pt-6 border-t border-white/[0.04] font-display italic text-3xl text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {metric}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function GlassCard({
  children,
  className = "",
  blur = "md",
  opacity = 10,
  border = true,
  ...props
}) {
  const blurClasses = {
    none: "",
    sm: "backdrop-blur-sm",
    md: "backdrop-blur-md",
    lg: "backdrop-blur-lg",
    xl: "backdrop-blur-xl",
    "2xl": "backdrop-blur-2xl",
  }

  return (
    <motion.div
      className={cn(
        "relative rounded-2xl",
        "bg-white/[0.02]",
        border && "border border-white/[0.06]",
        blurClasses[blur],
        className
      )}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent" />
      <div className="relative z-10 p-6 lg:p-8">
        {children}
      </div>
    </motion.div>
  )
}