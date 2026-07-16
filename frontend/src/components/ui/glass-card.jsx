import * as React from "react"
import { cn } from "@/lib/utils"

const GlassCard = React.forwardRef(({ className, variant = "default", ...props }, ref) => {
  const variants = {
    default: "bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] hover:border-[#8B5CF6]/30 transition-all duration-300",
    elevated: "bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.4),0_8px_24px_rgba(139,92,246,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.5),0_12px_32px_rgba(139,92,246,0.12)] transition-all duration-500",
    accent: "bg-white/[0.03] backdrop-blur-xl border border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/5 transition-all duration-300",
    success: "bg-white/[0.03] backdrop-blur-xl border border-[#B4FF39]/20 hover:border-[#B4FF39]/40 hover:bg-[#B4FF39]/5 transition-all duration-300",
    interactive: "bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] hover:border-[#8B5CF6]/30 hover:bg-white/[0.05] hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(139,92,246,0.1)] transition-all duration-300 cursor-pointer",
  }

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl p-6",
        variants[variant],
        className
      )}
      {...props}
    />
  )
})
GlassCard.displayName = "GlassCard"

export { GlassCard }