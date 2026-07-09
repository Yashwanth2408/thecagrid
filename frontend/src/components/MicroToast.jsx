import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastCtx = createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setItems((cur) => [...cur, { ...toast, id }]);
    const t = toast.duration ?? 4500;
    setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== id)), t);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto"
              data-testid="micro-toast"
            >
              <div className="flex items-center gap-3 min-w-[320px] rounded-2xl border border-[#8B5CF6]/50 bg-[#0F0F12]/85 backdrop-blur-xl px-5 py-3"
                   style={{ boxShadow: "0 30px 60px -20px rgba(139,92,246,0.4)" }}>
                <span className="relative flex w-2 h-2 flex-none">
                  <span className="absolute inset-0 rounded-full bg-[#B4FF39] animate-ping opacity-70" />
                  <span className="relative w-2 h-2 rounded-full bg-[#B4FF39]" />
                </span>
                <div className="min-w-0">
                  {t.title && (
                    <div className="font-display italic text-[18px] leading-none text-[#F2F2F2]">
                      {t.title}
                    </div>
                  )}
                  {t.subtitle && (
                    <div className="font-mono uppercase tracking-[0.22em] text-[10.5px] text-[#8B8B92] mt-1.5">
                      {t.subtitle}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
