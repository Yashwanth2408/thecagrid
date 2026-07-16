"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

/**
 * Premium animated grid background with:
 * - Reactive dots that respond to cursor proximity
 * - Floating particles with organic movement
 * - Subtle gradient orbs that pulse
 * - Reduced motion support
 * - Touch device optimization
 */
export function AnimatedGridBackground({
  className = "",
  dotCount = 400,
  particleCount = 30,
  orbCount = 3,
  cursorRadius = 180,
  color = "violet", // violet | amber | cyan | emerald | rose
  intensity = 1, // 0.3 - 1.5
  showOrbs = true,
  showParticles = true,
  showDots = true,
}) {
  const containerRef = useRef(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const rafRef = useRef(null)
  const dotsRef = useRef([])
  const particlesRef = useRef([])
  const reducedMotion = useRef(false)
  const isTouch = useRef(false)

  const colorMap = {
    violet: { primary: "139,92,246", secondary: "180,255,57", glow: "139,92,246" },
    amber: { primary: "245,158,11", secondary: "180,255,57", glow: "245,158,11" },
    cyan: { primary: "6,182,212", secondary: "180,255,57", glow: "6,182,212" },
    emerald: { primary: "16,185,129", secondary: "180,255,57", glow: "16,185,129" },
    rose: { primary: "244,63,94", secondary: "180,255,57", glow: "244,63,94" },
  }

  const colors = colorMap[color] || colorMap.violet

  useEffect(() => {
    if (typeof window === "undefined") return
    reducedMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
    isTouch.current = "ontouchstart" in window || navigator.maxTouchPoints > 0

    const handleMove = (e) => {
      if (reducedMotion.current || isTouch.current) return
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    window.addEventListener("mousemove", handleMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMove)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setDims({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Initialize dots
  useEffect(() => {
    if (reducedMotion.current || isTouch.current || !showDots) return
    const { w, h } = dims
    if (!w || !h) return

    const spacing = 38
    const cols = Math.floor(w / spacing)
    const rows = Math.floor(h / spacing)
    const total = Math.min(cols * rows, dotCount)

    dotsRef.current = Array.from({ length: total }, (_, i) => ({
      x: (i % cols) * spacing + spacing / 2,
      y: Math.floor(i / cols) * spacing + spacing / 2,
      baseSize: 1.5 + Math.random() * 1.5,
      delay: Math.random() * 2000,
      phase: Math.random() * Math.PI * 2,
    }))
  }, [dims, dotCount, showDots])

  // Initialize particles
  useEffect(() => {
    if (reducedMotion.current || isTouch.current || !showParticles) return
    const { w, h } = dims
    if (!w || !h) return

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3 * intensity,
      vy: (Math.random() - 0.5) * 0.3 * intensity,
      size: 1 + Math.random() * 2.5,
      opacity: 0.1 + Math.random() * 0.4,
      life: Math.random() * Math.PI * 2,
    }))
  }, [dims, particleCount, showParticles, intensity])

  // Animation loop
  useEffect(() => {
    if (reducedMotion.current || isTouch.current) return

    const tick = () => {
      const { x: mx, y: my } = mouseRef.current
      const containerRect = containerRef.current?.getBoundingClientRect()

      // Update dots
      if (showDots && dotsRef.current.length) {
        const relX = mx - (containerRect?.left || 0)
        const relY = my - (containerRect?.top || 0)
        const r2 = cursorRadius * cursorRadius

        dotsRef.current.forEach(dot => {
          const dx = dot.x - relX
          const dy = dot.y - relY
          const d2 = dx * dx + dy * dy

          if (d2 < r2) {
            const t = 1 - d2 / r2
            const scale = 1 + t * 3 * intensity
            const alpha = 0.05 + t * 0.95
            const el = document.getElementById(`grid-dot-${dot.id}`)
            if (el) {
              el.style.transform = `scale(${scale})`
              el.style.opacity = alpha
              el.style.fill = `rgba(${colors.primary},${alpha})`
              el.style.filter = `drop-shadow(0 0 ${6 * t * intensity}px rgba(${colors.glow},${0.6 * t}))`
            }
          } else {
            const el = document.getElementById(`grid-dot-${dot.id}`)
            if (el) {
              el.style.transform = "scale(1)"
              el.style.opacity = 0.4
              el.style.fill = `rgba(255,255,255,0.04)`
              el.style.filter = "none"
            }
          }
        })
      }

      // Update particles
      if (showParticles && particlesRef.current.length) {
        particlesRef.current.forEach(p => {
          p.x += p.vx
          p.y += p.vy
          p.life += 0.01

          // Wrap around
          if (p.x < -50) p.x = dims.w + 50
          if (p.x > dims.w + 50) p.x = -50
          if (p.y < -50) p.y = dims.h + 50
          if (p.y > dims.h + 50) p.y = -50

          const el = document.getElementById(`particle-${p.id}`)
          if (el) {
            el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${0.8 + Math.sin(p.life) * 0.2})`
            el.style.opacity = p.opacity * (0.6 + Math.sin(p.life) * 0.4)
          }
        })
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(rafRef.current)
  }, [dims, showDots, showParticles, cursorRadius, intensity, colors])

  // Orbs
  const orbs = React.useMemo(() => {
    if (!showOrbs) return []
    return Array.from({ length: orbCount }, (_, i) => ({
      id: `orb-${i}`,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      size: 25 + Math.random() * 35,
      delay: i * 800,
      duration: 8000 + Math.random() * 4000,
      opacity: 0.04 + Math.random() * 0.08,
      blur: 60 + Math.random() * 40,
    }))
  }, [orbCount, showOrbs])

  if (!dims.w || !dims.h) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 pointer-events-none overflow-hidden",
        className
      )}
      aria-hidden="true"
      style={{ opacity: reducedMotion.current || isTouch.current ? 0.3 : 1 }}
    >
      {/* Gradient Orbs */}
      {showOrbs && orbs.map(orb => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: `${orb.size}%`,
            height: `${orb.size}%`,
            opacity: orb.opacity,
            filter: `blur(${orb.blur}px)`,
            background: `radial-gradient(circle at 30% 30%, rgba(${colors.primary},0.5), transparent 60%), radial-gradient(circle at 70% 70%, rgba(${colors.secondary},0.3), transparent 50%)`,
            transformOrigin: "center center",
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [orb.opacity, orb.opacity * 1.5, orb.opacity],
            x: [0, `${(Math.random() - 0.5) * 5}%`, 0],
            y: [0, `${(Math.random() - 0.5) * 5}%`, 0],
          }}
          transition={{
            duration: orb.duration / 1000,
            repeat: Infinity,
            ease: "easeInOut",
            delay: orb.delay / 1000,
          }}
        />
      ))}

      {/* Grid Dots */}
      {showDots && dotsRef.current.map((dot, i) => (
        <svg
          key={`dot-${i}`}
          id={`grid-dot-${i}`}
          width={dot.baseSize * 3}
          height={dot.baseSize * 3}
          style={{
            position: "absolute",
            left: `${dot.x - dot.baseSize * 1.5}px`,
            top: `${dot.y - dot.baseSize * 1.5}px`,
            transformOrigin: "center center",
            transition: "transform 300ms ease-out, fill 300ms ease-out, opacity 300ms ease-out, filter 300ms ease-out",
            pointerEvents: "none",
          }}
        >
          <circle
            cx={dot.baseSize * 1.5}
            cy={dot.baseSize * 1.5}
            r={dot.baseSize}
            fill="rgba(255,255,255,0.04)"
          />
        </svg>
      ))}

      {/* Floating Particles */}
      {showParticles && particlesRef.current.map((p, i) => (
        <motion.div
          key={`particle-${i}`}
          id={`particle-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(${colors.primary},${p.opacity})`,
            filter: `blur(${0.5}px)`,
          }}
          initial={{ opacity: 0 }}
          animate={{
            x: [0, (Math.random() - 0.5) * 100],
            y: [0, (Math.random() - 0.5) * 100],
            scale: [1, 1.5, 1],
            opacity: [p.opacity, p.opacity * 1.5, p.opacity],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(10,10,12,0.6) 100%)",
        }}
      />
    </div>
  )
}

/**
 * Mesh Gradient Background - Organic flowing gradients
 */
export function MeshGradientBackground({
  className = "",
  color = "violet",
  intensity = 1,
  animated = true,
}) {
  const colorMap = {
    violet: ["#7C3AED", "#8B5CF6", "#A855F7", "#0A0A0C"],
    amber: ["#F59E0B", "#FBBF24", "#FCD34D", "#0A0A0C"],
    cyan: ["#06B6D4", "#22D3EE", "#67E8F9", "#0A0A0C"],
    emerald: ["#10B981", "#34D399", "#6EE7B7", "#0A0A0C"],
    rose: ["#F43F5E", "#FB7185", "#FDA4AF", "#0A0A0C"],
  }

  const colors = colorMap[color] || colorMap.violet

  return (
    <div
      className={cn("fixed inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden="true"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 20% 20%, ${colors[0]}33 0%, transparent 50%),
          radial-gradient(ellipse 60% 80% at 80% 30%, ${colors[1]}22 0%, transparent 50%),
          radial-gradient(ellipse 70% 70% at 50% 80%, ${colors[2]}1A 0%, transparent 50%),
          ${colors[3]}
        `,
      }}
    >
      {animated && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 100% 100% at 50% 50%, transparent 0%, ${colors[3]} 100%),
            `,
          }}
          animate={{
            background: [
              `radial-gradient(ellipse 80% 60% at 20% 20%, ${colors[0]}33 0%, transparent 50%), radial-gradient(ellipse 60% 80% at 80% 30%, ${colors[1]}22 0%, transparent 50%), radial-gradient(ellipse 70% 70% at 50% 80%, ${colors[2]}1A 0%, transparent 50%), ${colors[3]}`,
              `radial-gradient(ellipse 80% 60% at 25% 25%, ${colors[0]}22 0%, transparent 50%), radial-gradient(ellipse 60% 80% at 75% 35%, ${colors[1]}1A 0%, transparent 50%), radial-gradient(ellipse 70% 70% at 55% 75%, ${colors[2]}15 0%, transparent 50%), ${colors[3]}`,
              `radial-gradient(ellipse 80% 60% at 20% 20%, ${colors[0]}33 0%, transparent 50%), radial-gradient(ellipse 60% 80% at 80% 30%, ${colors[1]}22 0%, transparent 50%), radial-gradient(ellipse 70% 70% at 50% 80%, ${colors[2]}1A 0%, transparent 50%), ${colors[3]}`,
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      )}
    </div>
  )
}

/**
 * Noise Texture Overlay
 */
export function NoiseOverlay({ className = "", opacity = 0.04 }) {
  return (
    <div
      className={cn("fixed inset-0 pointer-events-none z-[9999]", className)}
      aria-hidden="true"
      style={{
        opacity,
        mixBlendMode: "overlay",
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.15 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        backgroundSize: "200px 200px",
      }}
    />
  )
}

/**
 * Scanlines Effect
 */
export function ScanlinesOverlay({ className = "", opacity = 0.03 }) {
  return (
    <div
      className={cn("fixed inset-0 pointer-events-none z-[9998]", className)}
      aria-hidden="true"
      style={{
        opacity,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)",
        backgroundSize: "100% 4px",
        animation: "scanlines 8s linear infinite",
      }}
    >
      <style>{`@keyframes scanlines { 0% { background-position-y: 0; } 100% { background-position-y: 4px; } }`}</style>
    </div>
  )
}

/**
 * Vignette Overlay
 */
export function VignetteOverlay({ className = "", intensity = 0.4 }) {
  return (
    <div
      className={cn("fixed inset-0 pointer-events-none z-[9997]", className)}
      aria-hidden="true"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(10,10,12,${intensity}) 100%)`,
      }}
    />
  )
}

/**
 * Combined Premium Background - All effects in one
 */
export function PremiumBackground({
  className = "",
  variant = "default", // default | mesh | grid | minimal
  color = "violet",
  showNoise = true,
  showScanlines = false,
  showVignette = true,
  intensity = 1,
}) {
  return (
    <div className={cn("relative min-h-screen", className)}>
      {variant === "mesh" && <MeshGradientBackground color={color} intensity={intensity} />}
      {variant === "grid" && <AnimatedGridBackground color={color} intensity={intensity} />}
      {variant === "default" && (
        <>
          <MeshGradientBackground color={color} intensity={intensity * 0.6} animated />
          <AnimatedGridBackground color={color} intensity={intensity * 0.4} showOrbs={false} dotCount={200} />
        </>
      )}
      {showNoise && <NoiseOverlay opacity={0.03 * intensity} />}
      {showScanlines && <ScanlinesOverlay opacity={0.02} />}
      {showVignette && <VignetteOverlay intensity={0.3 * intensity} />}
    </div>
  )
}

import { cn } from "@/lib/utils"