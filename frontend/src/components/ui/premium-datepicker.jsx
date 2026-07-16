"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addDays, isSameMonth, isSameDay, isBefore, isAfter, parseISO } from "date-fns"

/**
 * Premium Date Picker with range selection, keyboard navigation, and animations
 */
export const DatePicker = React.forwardRef((
  {
    className,
    label,
    error,
    hint,
    mode = "single", // single | range | multiple
    value,
    onChange,
    placeholder = "Select date...",
    minDate,
    maxDate,
    disabledDates = [],
    disabledDaysOfWeek = [], // 0 = Sunday, 6 = Saturday
    showWeekNumbers = false,
    locale = "en-US",
    firstDayOfWeek = 0, // 0 = Sunday, 1 = Monday
    ...props
  },
  ref
) => {
  const [focused, setFocused] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState(() => value?.[0] ? parseISO(value[0]) : new Date())
  const inputRef = React.useRef(null)
  const calendarRef = React.useRef(null)

  const [rangeStart, rangeEnd] = React.useMemo(() => {
    if (mode === "range" && Array.isArray(value) && value.length === 2) {
      return [parseISO(value[0]), parseISO(value[1])]
    }
    return [null, null]
  }, [value, mode])

  const selectedDate = React.useMemo(() => {
    if (mode === "single" && value) return parseISO(value)
    if (mode === "multiple" && Array.isArray(value)) return value.map(parseISO)
    return null
  }, [value, mode])

  const handleDayClick = (day) => {
    if (isDisabled(day)) return

    if (mode === "single") {
      onChange?.(format(day, "yyyy-MM-dd"))
      setOpen(false)
    } else if (mode === "range") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        onChange?.([format(day, "yyyy-MM-dd"), ""])
      } else if (isAfter(day, rangeStart)) {
        onChange?.([format(rangeStart, "yyyy-MM-dd"), format(day, "yyyy-MM-dd")])
      } else {
        onChange?.([format(day, "yyyy-MM-dd"), format(rangeStart, "yyyy-MM-dd")])
      }
      setOpen(false)
    } else if (mode === "multiple") {
      const selected = selectedDate || []
      const exists = selected.find(d => isSameDay(d, day))
      const newSelected = exists ? selected.filter(d => !isSameDay(d, day)) : [...selected, day]
      onChange?.(newSelected.map(d => format(d, "yyyy-MM-dd")))
    }
  }

  const isDisabled = (day) => {
    if (minDate && isBefore(day, startOfDay(minDate))) return true
    if (maxDate && isAfter(day, endOfDay(maxDate))) return true
    if (disabledDaysOfWeek.includes(day.getDay())) return true
    if (disabledDates.some(d => isSameDay(parseISO(d), day))) return true
    return false
  }

  const isSelected = (day) => {
    if (mode === "single" && selectedDate) return isSameDay(day, selectedDate)
    if (mode === "range" && rangeStart && rangeEnd) return isAfter(day, rangeStart) && isBefore(day, rangeEnd)
    if (mode === "range" && rangeStart) return isSameDay(day, rangeStart) || isSameDay(day, rangeEnd)
    if (mode === "multiple" && selectedDate) return selectedDate.some(d => isSameDay(d, day))
    return false
  }

  const isInRange = (day) => {
    if (mode !== "range" || !rangeStart || !rangeEnd) return false
    return isAfter(day, rangeStart) && isBefore(day, rangeEnd)
  }

  const isToday = (day) => isSameDay(day, new Date())

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  const weeks = React.useMemo(() => {
    const monthStart = startOfMonth(viewMonth)
    const monthEnd = endOfMonth(viewMonth)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: firstDayOfWeek })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: firstDayOfWeek })

    const weeks = []
    let week = []
    let day = calendarStart

    while (day <= calendarEnd) {
      week.push(new Date(day))
      if (week.length === 7) {
        weeks.push(week)
        week = []
      }
      day = addDays(day, 1)
    }
    return weeks
  }, [viewMonth, firstDayOfWeek])

  const monthYear = format(viewMonth, "MMMM yyyy", { locale })

  const goToPrevMonth = () => setViewMonth(subMonths(viewMonth, 1))
  const goToNextMonth = () => setViewMonth(addMonths(viewMonth, 1))
  const goToToday = () => { setViewMonth(new Date()); setOpen(true) }

  return (
    <div className={cn("relative w-full", className)}>
      <motion.div
        ref={inputRef}
        className="relative"
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 100)}
      >
        <label className="block mb-2 font-medium text-white">{label}</label>

        <div className="relative">
          <motion.div
            className={cn(
              "w-full bg-white/[0.02] border rounded-xl px-4 py-3 transition-all duration-200",
              "focus-within:border-[#8B5CF6] focus-within:bg-white/[0.04] focus-within:shadow-[0_0_0_1px_rgba(139,92,246,0.3)]",
              "hover:border-white/[0.15]",
              error && "border-[#EF4444]/50 bg-[#EF4444]/05",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !props.disabled && setOpen(true)}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                "font-mono text-sm",
                (mode === "range" && rangeStart && rangeEnd) || (mode === "single" && selectedDate) || (mode === "multiple" && selectedDate?.length)
                  ? "text-white"
                  : "text-white/40"
              )}>
                {(() => {
                  if (mode === "range" && rangeStart && rangeEnd) {
                    return `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`
                  }
                  if (mode === "range" && rangeStart) {
                    return `${format(rangeStart, "MMM d, yyyy")} – ...`
                  }
                  if (mode === "single" && selectedDate) {
                    return format(selectedDate, "MMM d, yyyy")
                  }
                  if (mode === "multiple" && selectedDate?.length) {
                    return `${selectedDate.length} dates selected`
                  }
                  return placeholder
                })()}
              </span>
              <div className="flex items-center gap-2 text-white/40">
                <Calendar className="w-4 h-4" />
                <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {open && (
              <motion.div
                ref={calendarRef}
                className="absolute z-50 top-full left-0 right-0 mt-2"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <div className="bg-[#0F0F12] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.4)] p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <motion.button
                      onClick={goToPrevMonth}
                      className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-5 h-5 text-white/60" />
                    </motion.button>

                    <motion.div
                      className="font-display italic text-lg text-white text-center"
                      key={viewMonth.toISOString()}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {monthYear}
                    </motion.div>

                    <motion.button
                      onClick={goToNextMonth}
                      className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </motion.button>
                  </div>

                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].slice(firstDayOfWeek).concat(
                      ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].slice(0, firstDayOfWeek)
                    ).map((day, i) => (
                      <div key={i} className="text-center font-mono uppercase tracking-[0.18em] text-[10px] text-white/40 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <motion.div
                    className="grid grid-cols-7 gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                  >
                    {weeks.map((week, wIndex) =>
                      week.map((day, dIndex) => {
                        const isCurrentMonth = isSameMonth(day, viewMonth)
                        const disabled = isDisabled(day)
                        const selected = isSelected(day)
                        const inRange = isInRange(day)
                        const today = isToday(day)

                        return (
                          <motion.button
                            key={`${wIndex}-${dIndex}`}
                            onClick={() => !disabled && handleDayClick(day)}
                            disabled={disabled}
                            className={cn(
                              "relative aspect-square flex items-center justify-center rounded-xl transition-all duration-200",
                              "font-mono text-sm",
                              !isCurrentMonth && "text-white/20",
                              disabled && "opacity-30 cursor-not-allowed",
                              selected && "bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] text-white shadow-[0_4px_16px_rgba(139,92,246,0.4)]",
                              inRange && !selected && "bg-[#8B5CF6]/10 text-white",
                              today && !selected && "ring-2 ring-[#B4FF39]/50",
                              "hover:not(:disabled):bg-white/[0.05]",
                              "focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50 focus:ring-offset-2 focus:ring-offset-[#0A0A0C]"
                            )}
                            whileHover={{ scale: disabled ? 1 : 1.1 }}
                            whileTap={{ scale: disabled ? 1 : 0.95 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (wIndex * 7 + dIndex) * 0.01, duration: 0.2 }}
                          >
                            {day.getDate()}
                            {today && !selected && (
                              <motion.div
                                className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#B4FF39]"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                              />
                            )}
                          </motion.button>
                        )
                      })}
                    )}
                  </motion.div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                    <motion.button
                      onClick={goToToday}
                      className="font-mono text-sm text-[#8B5CF6] hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
                      whileHover={{ x: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Today
                    </motion.button>

                    {mode === "range" && rangeStart && !rangeEnd && (
                      <motion.div className="font-mono text-sm text-white/60">
                        Select end date
                      </motion.div>
                    )}

                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => setOpen(false)}
                        className="font-mono text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                        whileTap={{ scale: 0.98 }}
                      >
                        Close
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p className="mt-2 flex items-center gap-1.5 font-mono uppercase tracking-[0.18em] text-[10.5px] text-[#EF4444]" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} role="alert">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </motion.p>
          )}
          {!error && hint && (
            <motion.p className="mt-2 font-mono uppercase tracking-[0.18em] text-[10.5px] text-white/40" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
})
DatePicker.displayName = "DatePicker"