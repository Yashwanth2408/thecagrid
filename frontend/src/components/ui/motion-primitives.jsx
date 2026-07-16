import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export function ShimmerText({
  className = "",
  children,
  speed = 2,
  colors = ["#8B5CF6", "#B4FF39", "#EC4899", "#8B5CF6"],
  ...props
}) {
  return (
    <motion.span
      className={cn("relative inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPositionX: ["0%", "200%", "0%"] }}
      transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      {...props}
    >
      {children}
    </motion.span>
  )
}

export function TypewriterText({
  text,
  speed = 30,
  className = "",
  onComplete,
  startDelay = 0,
}) {
  const [displayed, setDisplayed] = React.useState("")
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    if (index >= text.length) {
      onComplete?.()
      return
    }
    const timer = setTimeout(() => {
      setDisplayed(prev => prev + text[index])
      setIndex(prev => prev + 1)
    }, speed)
    return () => clearTimeout(timer)
  }, [index, text, speed, onComplete])

  React.useEffect(() => {
    const timer = setTimeout(() => setIndex(1), startDelay)
    setDisplayed(text[0] || "")
    return () => clearTimeout(timer)
  }, [text, startDelay])

  return <span className={cn("font-mono", className)}>{displayed}<motion.span className="ml-1" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>|</motion.span></span>
}

export function CounterNumber({
  value,
  duration = 1200,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
  formatter,
}) {
  const [display, setDisplay] = React.useState(0)
  const prevRef = React.useRef(value)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const start = prevRef.current
    const end = value
    const startTime = performance.now()

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(current)
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
    prevRef.current = value
  }, [value, duration])

  const formatted = formatter ? formatter(display) :
    `${prefix}${Number(display).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`

  return <span className={cn("font-display tabular-nums", className)}>{formatted}</span>
}

export function FloatingLabel({
  children,
  className = "",
  speed = 3,
  intensity = 8,
  rotateIntensity = 2,
}) {
  const ref = React.useRef(null)
  const [mouse, setMouse] = React.useState({ x: 0, y: 0 })

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleMove = (e) => {
      const rect = el.getBoundingClientRect()
      setMouse({
        x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
        y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
      })
    }
    el.addEventListener("mousemove", handleMove)
    el.addEventListener("mouseleave", () => setMouse({ x: 0, y: 0 }))
    return () => {
      el.removeEventListener("mousemove", handleMove)
      el.removeEventListener("mouseleave", () => setMouse({ x: 0, y: 0 }))
    }
  }, [])

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block perspective-1000", className)}
      style={{
        transform: `rotateY(${mouse.x * rotateIntensity}deg) rotateX(${-mouse.y * rotateIntensity}deg) translateZ(${intensity}px)`,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMouse({
          x: (e.clientX - rect.left - rect.width / 2) / (rect.width / 2),
          y: (e.clientY - rect.top - rect.height / 2) / (rect.height / 2),
        })
      }}
      onMouseLeave={() => setMouse({ x: 0, y: 0 })}
    >
      {children}
    </motion.div>
  )
}

export function MagneticButton({
  children,
  className = "",
  strength = 30,
  ...props
}) {
  const ref = React.useRef(null)

  return (
    <motion.button
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        e.currentTarget.style.transform = `translate(${x / strength}px, ${y / strength}px)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translate(0, 0)"
      }}
      whileTap={{ scale: 0.96 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export function RippleEffect({ className = "", color = "rgba(139,92,246,0.4)", ...props }) {
  const [ripples, setRipples] = React.useState([])

  const trigger = React.useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = Date.now()
    setRipples(prev => [...prev, { id, x, y, size }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
  }, [])

  return (
    <div className={cn("relative overflow-hidden", className)} onMouseDown={trigger} {...props}>
      <AnimatePresence>
        {ripples.map(r => (
          <motion.div
            key={r.id}
            initial={{ width: 0, height: 0, opacity: 0.5 }}
            animate={{ width: r.size * 2, height: r.size * 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              borderRadius: "50%",
              background: color,
              pointerEvents: "none",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}