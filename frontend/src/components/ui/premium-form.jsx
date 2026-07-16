import React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"

/**
 * Premium Input with floating label, validation states, and micro-interactions
 */
export const Input = React.forwardRef((
  {
    className,
    label,
    error,
    hint,
    floatingLabel = true,
    type = "text",
    prefix,
    suffix,
    loading = false,
    leftIcon,
    rightIcon,
    clearable = false,
    ...props
  },
  ref
) => {
  const [focused, setFocused] = React.useState(false)
  const [value, setValue] = React.useState(props.value || props.defaultValue || "")
  const inputId = useId()

  const handleChange = (e) => {
    const newValue = e.target.value
    setValue(newValue)
    props.onChange?.(e)
  }

  const handleClear = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setValue("")
    props.onChange?.({ target: { value: "" } })
    ref.current?.focus()
  }

  const hasValue = value.length > 0

  return (
    <div className={cn("relative w-full", className)}>
      <motion.div
        className={cn(
          "transition-all duration-300",
          floatingLabel && label && "pt-6"
        )}
      >
        {floatingLabel && label && (
          <motion.label
            htmlFor={inputId}
            className={cn(
              "absolute left-3 pointer-events-none select-none transition-all duration-200",
              "font-medium text-white/60",
              focused || hasValue
                ? "top-1.5 text-[11px] text-[#8B5CF6] transform -translate-y-0"
                : "top-1/2 -translate-y-1/2 text-[14px] text-white/50"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {label}
          </motion.label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-white/40 group-focus-within:text-[#8B5CF6] transition-colors">
              {leftIcon}
            </div>
          )}

          <motion.input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={props.disabled}
            readOnly={props.readOnly}
            placeholder={floatingLabel && label ? "" : props.placeholder}
            className={cn(
              "w-full bg-white/[0.02] border rounded-xl px-4 py-3 transition-all duration-200",
              "font-mono text-sm text-white placeholder:text-white/30",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-0",
              leftIcon ? "pl-10" : "pl-4",
              rightIcon || suffix || (clearable && hasValue) ? "pr-12" : "pr-4",
              focused
                ? "border-[#8B5CF6] bg-white/[0.04] shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
                : error
                ? "border-[#EF4444]/50 bg-[#EF4444]/05 hover:border-[#EF4444]"
                : "border-white/[0.08] hover:border-white/[0.15]",
              props.className
            )}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />

          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <motion.span
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
            </div>
          )}

          {(clearable && hasValue && !props.disabled && !props.readOnly) && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white/80 transition-colors rounded"
              aria-label="Clear input"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-white/40">
              {rightIcon}
            </div>
          )}

          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-white/40 pointer-events-none">
              {suffix}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              id={`${inputId}-error`}
              className="mt-2 flex items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-[10.5px] text-[#EF4444]"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              role="alert"
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </motion.p>
          )}
          {!error && hint && (
            <motion.p
              id={`${inputId}-hint`}
              className="mt-2 font-mono uppercase tracking-[0.18em] text-[10.5px] text-white/40"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
})
Input.displayName = "Input"

/**
 * Premium Textarea with floating label, character count, and auto-resize
 */
export const Textarea = React.forwardRef((
  {
    className,
    label,
    error,
    hint,
    floatingLabel = true,
    maxLength,
    showCount = false,
    autoResize = true,
    rows = 4,
    ...props
  },
  ref
) => {
  const [focused, setFocused] = React.useState(false)
  const [value, setValue] = React.useState(props.value || props.defaultValue || "")
  const textareaRef = React.useRef(null)
  const inputId = useId()

  const handleChange = (e) => {
    const newValue = e.target.value
    if (maxLength && newValue.length > maxLength) return
    setValue(newValue)
    props.onChange?.(e)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && maxLength && value.length >= maxLength) {
      e.preventDefault()
    }
  }

  React.useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value, autoResize])

  const hasValue = value.length > 0

  return (
    <div className={cn("relative w-full", className)}>
      <motion.div className={cn("transition-all duration-300", floatingLabel && label && "pt-6")}>
        {floatingLabel && label && (
          <motion.label
            htmlFor={inputId}
            className={cn(
              "absolute left-3 pointer-events-none select-none transition-all duration-200",
              "font-medium text-white/60",
              focused || hasValue
                ? "top-1.5 text-[11px] text-[#8B5CF6] transform -translate-y-0"
                : "top-1/2 -translate-y-1/2 text-[14px] text-white/50"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {label}
          </motion.label>
        )}

        <motion.textarea
          ref={textareaRef}
          id={inputId}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={props.disabled}
          readOnly={props.readOnly}
          placeholder={floatingLabel && label ? "" : props.placeholder}
          rows={rows}
          style={{
            resize: autoResize ? "none" : "both",
            minHeight: autoResize ? undefined : `${rows * 1.5}rem`,
          }}
          className={cn(
            "w-full bg-white/[0.02] border rounded-xl px-4 py-3 transition-all duration-200",
            "font-mono text-sm text-white placeholder:text-white/30",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-0",
            focused
              ? "border-[#8B5CF6] bg-white/[0.04] shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
              : error
              ? "border-[#EF4444]/50 bg-[#EF4444]/05 hover:border-[#EF4444]"
              : "border-white/[0.08] hover:border-white/[0.15]",
            props.className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              id={`${inputId}-error`}
              className="mt-2 flex items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-[10.5px] text-[#EF4444]"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              role="alert"
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </motion.p>
          )}
          {!error && (hint || (showCount && maxLength)) && (
            <motion.p
              id={`${inputId}-hint`}
              className={cn("mt-2 font-mono uppercase tracking-[0.18em] text-[10.5px] text-right", error ? "text-[#EF4444]" : "text-white/40")}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {hint}
              {showCount && maxLength && (
                <span className={cn("ml-2 tabular-nums", value.length >= maxLength ? "text-[#EF4444]" : "text-white/30")}>
                  {value.length}/{maxLength}
                </span>
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
})
Textarea.displayName = "Textarea"

/**
 * Premium Checkbox with animated checkmark
 */
export const Checkbox = React.forwardRef((
  { className, label, description, error, indeterminate = false, ...props },
  ref
) => {
  const [focused, setFocused] = React.useState(false)

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <motion.div
        className="relative flex-shrink-0"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <input
          ref={ref}
          type="checkbox"
          className="peer absolute opacity-0 w-5 h-5 cursor-pointer"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        <motion.div
          className={cn(
            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#8B5CF6]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0A0A0C]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            props.checked || indeterminate
              ? "bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] border-transparent"
              : focused
              ? "border-[#8B5CF6] bg-white/[0.02]"
              : "border-white/[0.12] hover:border-white/[0.2] bg-white/[0.02]"
          )}
        >
          <motion.svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={indeterminate ? "M5 12h14" : "M5 13l4 4L19 7"} />
          </motion.svg>
        </motion.div>
      </motion.div>

      <div className="flex-1 min-w-0 pt-0.5">
        <label className="block cursor-pointer">
          {label && (
            <motion.span className="font-medium text-white block mb-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              {label}
            </motion.span>
          )}
          {description && (
            <motion.p className="font-mono text-[12px] text-white/40 mt-0.5" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              {description}
            </motion.p>
          )}
          {error && (
            <motion.p className="font-mono uppercase tracking-[0.18em] text-[10.5px] text-[#EF4444] mt-1.5" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert">
              {error}
            </motion.p>
          )}
        </label>
      </div>
    </div>
  )
})
Checkbox.displayName = "Checkbox"

/**
 * Premium Radio Group
 */
export const RadioGroup = React.forwardRef(({
  className,
  label,
  description,
  options = [],
  direction = "vertical",
  ...props
}, ref) => {
  return (
    <fieldset className={cn("w-full", className)} ref={ref}>
      {(label || description) && (
        <div className="mb-4">
          {label && <legend className="font-medium text-white mb-1">{label}</legend>}
          {description && <p className="font-mono text-[12px] text-white/40">{description}</p>}
        </div>
      )}
      <div className={cn(
        "flex gap-4",
        direction === "vertical" && "flex-col",
        direction === "horizontal" && "flex-wrap"
      )} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <Radio key={option.value} {...option} {...props} />
        ))}
      </div>
    </fieldset>
  )
})
RadioGroup.displayName = "RadioGroup"

export const Radio = React.forwardRef(({
  className,
  label,
  description,
  value,
  disabled = false,
  ...props
}, ref) => {
  const [focused, setFocused] = React.useState(false)

  return (
    <label className={cn("flex items-start gap-3 cursor-pointer", className)} ref={ref}>
      <motion.div
        className="relative flex-shrink-0 mt-0.5"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <input
          type="radio"
          className="peer absolute opacity-0 w-4 h-4 cursor-pointer"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          ref={ref}
          {...props}
        />
        <motion.div
          className={cn(
            "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#8B5CF6]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0A0A0C]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            props.checked
              ? "bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] border-transparent"
              : focused
              ? "border-[#8B5CF6] bg-white/[0.02]"
              : "border-white/[0.12] hover:border-white/[0.2] bg-white/[0.02]"
          )}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-white"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: props.checked ? 1 : 0, scale: props.checked ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          />
        </motion.div>
      </motion.div>

      <div className="flex-1 min-w-0 pt-0.5">
        {label && <span className="font-medium text-white block">{label}</span>}
        {description && <p className="font-mono text-[12px] text-white/40 mt-0.5">{description}</p>}
      </div>
    </label>
  )
})
Radio.displayName = "Radio"

/**
 * Premium Switch/Toggle
 */
export const Switch = React.forwardRef(({
  className,
  label,
  description,
  size = "default",
  ...props
}, ref) => {
  const [focused, setFocused] = React.useState(false)

  const sizes = {
    sm: { track: "w-8 h-4.5", thumb: "w-3.5 h-3.5 translate-x-0.5 peer-checked:translate-x-full" },
    default: { track: "w-11 h-6", thumb: "w-5 h-5 translate-x-0.5 peer-checked:translate-x-5" },
    lg: { track: "w-14 h-7", thumb: "w-6 h-6 translate-x-0.5 peer-checked:translate-x-7" },
  }

  const s = sizes[size] || sizes.default

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <motion.div
        className="relative flex-shrink-0"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input
          type="checkbox"
          role="switch"
          className={cn(
            "peer absolute opacity-0 w-full h-full cursor-pointer",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#8B5CF6]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0A0A0C]"
          )}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          ref={ref}
          {...props}
        />
        <motion.div
          className={cn(
            "rounded-full border-2 transition-all duration-300 ease-out",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-[#8B5CF6]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0A0A0C]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            props.checked
              ? "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] border-transparent shadow-[0_0_12px_rgba(139,92,246,0.5)]"
              : focused
              ? "border-[#8B5CF6]/50 bg-white/[0.02]"
              : "border-white/[0.12] hover:border-white/[0.2] bg-white/[0.02]"
          )}
          style={{ width: s.track.split(" ")[0].replace("w-", ""), height: s.track.split(" ")[1].replace("h-", "") }}
        >
          <motion.div
            className={cn(
              "rounded-full bg-white shadow-lg transition-transform duration-300 ease-out",
              props.checked ? "peer-checked:translate-x-full" : ""
            )}
            style={{ width: s.thumb.split(" ")[0].replace("w-", ""), height: s.thumb.split(" ")[1].replace("h-", "") }}
            animate={{ x: props.checked ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </motion.div>
      </motion.div>

      <div className="flex-1 min-w-0">
        {label && <span className="font-medium text-white">{label}</span>}
        {description && <p className="font-mono text-[12px] text-white/40 mt-0.5">{description}</p>}
      </div>
    </div>
  )
})
Switch.displayName = "Switch"

/**
 * Premium Slider
 */
export const Slider = React.forwardRef(({
  className,
  label,
  min = 0,
  max = 100,
  step = 1,
  showValue = true,
  valueLabel,
  ...props
}, ref) => {
  const [focused, setFocused] = React.useState(false)
  const [dragging, setDragging] = React.useState(false)
  const trackRef = React.useRef(null)

  const value = props.value || props.defaultValue || min
  const percentage = ((value - min) / (max - min)) * 100

  const handleChange = (e) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return
    const newPercentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const newValue = Math.round(min + (newPercentage / 100) * (max - min))
    const steppedValue = Math.round(newValue / step) * step
    const clampedValue = Math.max(min, Math.min(max, steppedValue))
    props.onChange?.({ target: { value: clampedValue } })
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-white">{label}</span>
          {showValue && (
            <motion.span
              className="font-mono text-sm text-[#8B5CF6] tabular-nums"
              animate={{ scale: dragging ? 1.1 : 1 }}
            >
              {valueLabel ? valueLabel(value) : value}
            </motion.span>
          )}
        </div>
      )}
      <div
        ref={trackRef}
        className="relative h-2"
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
        onTouchStart={() => setDragging(true)}
        onTouchEnd={() => setDragging(false)}
      >
        <div className="absolute inset-0 rounded-full bg-white/[0.06]" />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(90deg, #8B5CF6, #A855F7)",
            boxShadow: "0 0 12px rgba(139,92,246,0.5)",
          }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
        <motion.input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
          style={{ WebkitAppearance: "none" }}
          whileHover={{ scale: 1.5 }}
          whileTap={{ scale: 2 }}
          {...props}
        />
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-3 border-[#8B5CF6] shadow-lg pointer-events-none"
          style={{
            left: `calc(${percentage}% - 10px)`,
            boxShadow: "0 0 0 4px rgba(139,92,246,0.2), 0 4px 12px rgba(0,0,0,0.3)",
          }}
          animate={{ x: dragging ? 0 : 0, scale: dragging ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </div>
    </div>
  )
})
Slider.displayName = "Slider"

import { useId, AnimatePresence } from "react"