import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, X, Moon, Sun, Laptop, Check } from "lucide-react";
import { useTheme, ACCENTS, type ThemeMode } from "../lib/theme";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/*  Schwebender Theme-Switcher: Modus (Dunkel/Hell/System) + Akzent.    */
/*  Zustand kommt aus useTheme (siehe lib/theme.tsx); diese Komponente  */
/*  ist reine UI.                                                       */
/* ------------------------------------------------------------------ */

const MODES: { id: ThemeMode; label: string; Icon: typeof Moon }[] = [
  { id: "dark", label: "Dunkel", Icon: Moon },
  { id: "light", label: "Hell", Icon: Sun },
  { id: "system", label: "System", Icon: Laptop },
];

export default function ThemeSwitcher() {
  const { mode, setMode, accent, setAccent, resolvedMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Klick außerhalb oder Escape schließt das Panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="card absolute bottom-full right-0 mb-3 w-72 p-4 shadow-2xl"
            role="dialog"
            aria-label="Darstellung und Farbthema"
          >
            {/* Darstellung */}
            <h3 className="label-caps mb-2">Darstellung</h3>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-pitch-800 p-1">
              {MODES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  aria-pressed={mode === id}
                  className={cn(
                    "flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400",
                    mode === id
                      ? "bg-volt-400 text-pitch-950"
                      : "text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {/* Farbthema */}
            <h3 className="label-caps mb-2 mt-5">Farbthema</h3>
            <div className="grid grid-cols-7 gap-2">
              {ACCENTS.map((a) => {
                const color = resolvedMode === "dark" ? a.dark : a.light;
                const active = accent === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccent(a.id)}
                    aria-pressed={active}
                    aria-label={`Akzentfarbe ${a.label}`}
                    title={a.label}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-pitch-900 transition-transform duration-200",
                      "hover:scale-110 focus-visible:outline-none focus-visible:ring-volt-400",
                      active ? "ring-volt-400" : "ring-transparent",
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {active && (
                      <Check
                        className="h-3.5 w-3.5"
                        style={{ color: resolvedMode === "dark" ? "#09090b" : "#ffffff" }}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating-Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Einstellungen schließen" : "Darstellung und Farbthema"}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-volt-400 text-pitch-950 shadow-lg shadow-volt-400/40 transition-colors duration-200 hover:bg-volt-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400 focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-950"
      >
        {open ? <X className="h-5 w-5" /> : <Palette className="h-5 w-5" />}
      </motion.button>
    </div>
  );
}
