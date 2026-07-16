import React from "react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, ChevronUp, Check, X, Loader2, AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react"

/**
 * Premium Select with searchable options, groups, and animations
 */
export const Select = React.forwardRef((
  {
    className,
    label,
    error,
    hint,
    placeholder = "Select an option...",
    options = [],
    optionGroups,
    searchable = false,
    multi = false,
    maxSelected,
    clearable = true,
    loading = false,
    disabled = false,
    required = false,
    creatable = false,
    onCreate,
    ...props
  },
  ref
) => {
  const [focused, setFocused] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedValues, setSelectedValues] = React.useState(() => {
    if (multi) return Array.isArray(props.value) ? props.value : (props.defaultValue || [])
    return props.value || props.defaultValue || null
  })
  const selectRef = React.useRef(null)
  const inputId = useId()

  const filteredOptions = React.useMemo(() => {
    let opts = optionGroups
      ? optionGroups.flatMap(g => g.options.map(o => ({ ...o, group: g.label })))
      : options
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      opts = opts.filter(o =>
        o.label.toLowerCase().includes(query) ||
        (o.value && o.value.toLowerCase().includes(query))
      )
    }
    return opts
  }, [options, optionGroups, searchQuery])

  const handleSelect = (option) => {
    if (multi) {
      const isSelected = selectedValues.includes(option.value)
      const newValues = isSelected
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value]
      if (maxSelected && newValues.length > maxSelected) return
      setSelectedValues(newValues)
      props.onChange?.(newValues)
    } else {
      setSelectedValues(option.value)
      props.onChange?.(option.value)
      setOpen(false)
    }
    if (creatable && option.value === "__create__") {
      onCreate?.(searchQuery)
      setSearchQuery("")
    }
  }

  const handleRemove = (e, value) => {
    e.stopPropagation()
    const newValues = selectedValues.filter(v => v !== value)
    setSelectedValues(newValues)
    props.onChange?.(newValues)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (multi) {
      setSelectedValues([])
      props.onChange?.([])
    } else {
      setSelectedValues(null)
      props.onChange?.(null)
    }
  }

  const selectedOptions = multi
    ? selectedValues.map(v => options.find(o => o.value === v)).filter(Boolean)
    : options.find(o => o.value === selectedValues)

  const displayValue = multi
    ? selectedValues.length > 0
      ? selectedValues.map(v => options.find(o => o.value === v)?.label).filter(Boolean).join(", ")
      : placeholder
    : selectedOptions?.label || placeholder

  const handleClickOutside = (e) => {
    if (selectRef.current && !selectRef.current.contains(e.target)) {
      setOpen(false)
    }
  }

  React.useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  React.useEffect(() => {
    if (props.value !== undefined) {
      if (multi) setSelectedValues(Array.isArray(props.value) ? props.value : [])
      else setSelectedValues(props.value)
    }
  }, [props.value])

  return (
    <div ref={selectRef} className={cn("relative w-full", className)}>
      <motion.div
        className={cn("transition-all duration-300", label && "pt-6")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen(!open)
          }
          if (e.key === "Escape") setOpen(false)
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setOpen(true)
          }
        }}
        tabIndex={0}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (!open) setOpen(false) }}
      >
        {label && (
          <motion.label
            className={cn(
              "absolute left-3 pointer-events-none select-none transition-all duration-200",
              "font-medium text-white/60",
              focused || (multi ? selectedValues.length > 0 : selectedValues)
                ? "top-1.5 text-[11px] text-[#8B5CF6] transform -translate-y-0"
                : "top-1/2 -translate-y-1/2 text-[14px] text-white/50"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {label}
            {required && <span className="text-[#EF4444] ml-1">*</span>}
          </motion.label>
        )}

        <div className="relative">
          <motion.button
            type="button"
            onClick={() => !disabled && setOpen(!open)}
            className={cn(
              "w-full bg-white/[0.02] border rounded-xl px-4 py-3 flex items-center justify-between",
              "text-left transition-all duration-200",
              "focus:outline-none focus:ring-0",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              multi && selectedValues.length > 0
                ? "border-[#8B5CF6]/30 bg-white/[0.03]"
                : focused
                ? "border-[#8B5CF6] bg-white/[0.04] shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
                : error
                ? "border-[#EF4444]/50 bg-[#EF4444]/05 hover:border-[#EF4444]"
                : "border-white/[0.08] hover:border-white/[0.15]",
              props.className
            )}
            disabled={disabled}
          >
            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
              {multi && selectedValues.length > 0 ? (
                <AnimatePresence mode="popLayout">
                  {selectedValues.map((value, i) => {
                    const opt = options.find(o => o.value === value)
                    return (
                      <motion.span
                        key={value}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-[#8B5CF6] rounded-lg text-xs font-mono"
                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, x: 10 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        {opt?.label || value}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemove(e, value) }}
                          className="ml-1.5 p-0.5 hover:bg-white/10 rounded transition-colors"
                          aria-label={`Remove ${opt?.label || value}`}
                        >
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </motion.span>
                    )
                  })}
                </AnimatePresence>
              ) : (
                <span className={cn(
                  "font-mono text-sm truncate",
                  selectedValues ? "text-white" : "text-white/30"
                )}>
                  {displayValue}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 text-white/50 animate-spin" />}
              {clearable && (multi ? selectedValues.length > 0 : selectedValues) && !disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClear(e) }}
                  className="p-1 text-white/40 hover:text-white/80 transition-colors rounded"
                  aria-label="Clear selection"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
              <motion.div
                className="flex items-center gap-1 text-white/40"
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" strokeWidth={2} />
              </motion.div>
            </div>
          </motion.button>

          <AnimatePresence>
            {open && !disabled && (
              <motion.div
                className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0F0F12] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                role="listbox"
              >
                {searchable && (
                  <div className="p-3 border-b border-white/[0.06]">
                    <input
                      type="text"
                      placeholder="Search options..."
                      value={searchQuery}
                      onChange={(e) => { e.stopPropagation(); setSearchQuery(e.target.value) }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-3 py-2 font-mono text-sm text-white placeholder:text-white/40 focus:border-[#8B5CF6] focus:outline-none"
                    />
                  </div>
                )}
                {creatable && searchQuery && !options.find(o => o.value === searchQuery) && (
                  <motion.button
                    className="w-full px-3 py-2.5 text-left flex items-center gap-2 text-[#8B5CF6] hover:bg-white/[0.04] border-t border-white/[0.06]"
                    onClick={(e) => { e.stopPropagation(); handleSelect({ value: searchQuery, label: searchQuery, __create__: true }) }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Plus className="w-4 h-4" strokeWidth={2} />
                    <span className="font-mono uppercase tracking-[0.18em] text-[11px]">Create "{searchQuery}"</span>
                  </motion.button>
                )}
                <div className="max-h-96 overflow-y-auto">
                  {optionGroups ? (
                    optionGroups.map((group, gi) => (
                      <React.Fragment key={group.label}>
                        <motion.li className="px-3 py-1.5 font-mono uppercase tracking-[0.18em] text-[10px] text-white/30 border-t border-white/[0.04] first:border-t-0 bg-white/[0.01] sticky top-0 z-10 backdrop-blur-sm" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
                          {group.label}
                        </motion.li>
                        <AnimatePresence mode="popLayout">
                          {group.options.map((option, i) => (
                            <motion.button
                              key={option.value}
                              type="button"
                              role="option"
                              aria-selected={multi ? selectedValues.includes(option.value) : selectedValues === option.value}
                              className={cn(
                                "w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors",
                                "hover:bg-white/[0.04]",
                                multi ? selectedValues.includes(option.value)
                                  : selectedValues === option.value
                                ? "bg-[#8B5CF6]/10 text-[#8B5CF6]"
                                : ""
                              )}
                              onClick={(e) => { e.stopPropagation(); handleSelect(option) }}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ delay: i * 0.01 }}
                            >
                              {multi && selectedValues.includes(option.value) && (
                                <Check className="w-4 h-4 flex-shrink-0 text-[#8B5CF6]" strokeWidth={2.5} />
                              )}
                              <span className="font-mono text-sm text-white flex-1 truncate">{option.label}</span>
                              {option.description && <span className="font-mono text-[11px] text-white/30">{option.description}</span>}
                            </motion.button>
                          ))}
                        </AnimatePresence>
                      </React.Fragment>
                    ))
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredOptions.length === 0 ? (
                        <motion.li className="px-3 py-4 text-center text-white/40 font-mono text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          No options found
                        </motion.li>
                      ) : (
                        filteredOptions.map((option, i) => (
                          <motion.button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={multi ? selectedValues.includes(option.value) : selectedValues === option.value}
                            className={cn(
                              "w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors",
                              "hover:bg-white/[0.04]",
                              multi ? selectedValues.includes(option.value)
                                : selectedValues === option.value
                              ? "bg-[#8B5CF6]/10 text-[#8B5CF6]"
                              : ""
                            )}
                            onClick={(e) => { e.stopPropagation(); handleSelect(option) }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ delay: i * 0.01 }}
                          >
                            {multi && selectedValues.includes(option.value) && (
                              <Check className="w-4 h-4 flex-shrink-0 text-[#8B5CF6]" strokeWidth={2.5} />
                            )}
                            <span className="font-mono text-sm text-white flex-1 truncate">{option.label}</span>
                            {option.description && <span className="font-mono text-[11px] text-white/30">{option.description}</span>}
                          </motion.button>
                        ))
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
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
Select.displayName = "Select"

/**
 * Premium Combobox / Autocomplete
 */
export const Combobox = React.forwardRef((
  {
    className,
    label,
    error,
    hint,
    placeholder = "Type to search...",
    options = [],
    onSearch,
    debounceMs = 200,
    minChars = 1,
    ...props
  },
  ref
) => {
  const [focused, setFocused] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const comboboxRef = React.useRef(null)
  const inputId = useId()
  const debounceRef = React.useRef(null)

  const handleSearch = React.useCallback(async (searchQuery) => {
    if (searchQuery.length < minChars) {
      setResults([])
      return
    }
    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await onSearch(searchQuery)
        setResults(data || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)
  }, [onSearch, debounceMs, minChars])

  React.useEffect(() => {
    handleSearch(query)
  }, [query, handleSearch])

  const handleChange = (e) => {
    setQuery(e.target.value)
    props.onChange?.(e)
  }

  return (
    <div ref={comboboxRef} className={cn("relative w-full", className)}>
      <motion.div className={cn("transition-all duration-300", label && "pt-6")}>
        {label && (
          <motion.label
            className={cn(
              "absolute left-3 pointer-events-none select-none transition-all duration-200",
              "font-medium text-white/60",
              focused || query
                ? "top-1.5 text-[11px] text-[#8B5CF6] transform -translate-y-0"
                : "top-1/2 -translate-y-1/2 text-[14px] text-white/50"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {label}
          </motion.label>
        )}

        <motion.input
          ref={ref}
          id={inputId}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { setFocused(true); setOpen(true) }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 100) }}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white/[0.02] border rounded-xl px-4 py-3 transition-all duration-200",
            "font-mono text-sm text-white placeholder:text-white/30",
            "focus:outline-none focus:ring-0",
            "pr-12",
            focused
              ? "border-[#8B5CF6] bg-white/[0.04] shadow-[0_0_0_1px_rgba(139,92,246,0.3)]"
              : error
              ? "border-[#EF4444]/50 bg-[#EF4444]/05 hover:border-[#EF4444]"
              : "border-white/[0.08] hover:border-white/[0.15]",
            props.className
          )}
          {...props}
        />

        {loading && (
          <motion.div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
          </motion.div>
        )}

        <AnimatePresence>
          {open && results.length > 0 && (
            <motion.ul
              className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#0F0F12] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {results.map((result, i) => (
                <motion.li
                  key={result.value || result.id || i}
                  className="px-3 py-2.5 hover:bg-white/[0.04] cursor-pointer transition-colors first:rounded-t-xl last:rounded-b-xl"
                  onClick={() => { setQuery(result.label); setOpen(false); props.onSelect?.(result) }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <span className="font-mono text-sm text-white">{result.label}</span>
                  {result.description && <span className="font-mono text-[11px] text-white/30 ml-2">{result.description}</span>}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

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
Combobox.displayName = "Combobox"

/**
 * Premium Date Picker
 */
export const DatePicker = React.forwardRef((
  {
    className,
    label,
    error,
    hint,
    mode = "single", // single | range
    placeholder,
    minDate,
    maxDate,
    disabledDates,
    showWeekNumbers = false,
    ...props
  },
  ref
) => {
  // Simplified implementation - in production use react-day-picker or similar
  return (
    <Input
      ref={ref}
      className={className}
      label={label}
      error={error}
      hint={hint}
      placeholder={placeholder || (mode === "range" ? "Select date range" : "Select date")}
      type="date"
      readOnly
      {...props}
    />
  )
})
DatePicker.displayName = "DatePicker"

import { useId, useRef } from "react"