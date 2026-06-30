/* ------------------------------------------------------------------ */
/*  Theme-Store: Modus (Dunkel/Hell/System) + Farbthema (Akzent).       */
/*  Schaltet ausschließlich CSS-Variablen über html.classList und       */
/*  html[data-accent] um (siehe index.css). Wahl wird in localStorage   */
/*  gemerkt; ein Inline-Script in index.html setzt den Startzustand     */
/*  bereits vor dem ersten Paint (kein Hell/Dunkel-Aufblitzen).         */
/* ------------------------------------------------------------------ */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type ThemeMode = "dark" | "light" | "system";

/** Auswählbare Akzentfarben. dark/light = Vorschau-Farbe je Modus (Swatch). */
export const ACCENTS = [
  { id: "volt", label: "Volt", dark: "#cdf542", light: "#4d7c0f" },
  { id: "blue", label: "Blau", dark: "#38bdf8", light: "#0369a1" },
  { id: "green", label: "Grün", dark: "#34d399", light: "#047857" },
  { id: "purple", label: "Lila", dark: "#a78bfa", light: "#6d28d9" },
  { id: "orange", label: "Orange", dark: "#fb923c", light: "#c2410c" },
  { id: "pink", label: "Pink", dark: "#f472b6", light: "#be185d" },
  { id: "teal", label: "Teal", dark: "#2dd4bf", light: "#0f766e" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: AccentId;
  setAccent: (accent: AccentId) => void;
  /** Tatsächlich aktiver Modus (System bereits aufgelöst). */
  resolvedMode: "dark" | "light";
}

const MODE_KEY = "wm26-theme-mode";
const ACCENT_KEY = "wm26-theme-accent";

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  setMode: () => {},
  accent: "volt",
  setAccent: () => {},
  resolvedMode: "dark",
});

function readMode(): ThemeMode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === "dark" || v === "light" || v === "system") return v;
  } catch {
    /* localStorage nicht verfügbar */
  }
  return "dark";
}

function readAccent(): AccentId {
  try {
    const v = localStorage.getItem(ACCENT_KEY);
    if (v && ACCENTS.some((a) => a.id === v)) return v as AccentId;
  } catch {
    /* localStorage nicht verfügbar */
  }
  return "volt";
}

/** html-Klasse + Tab-Farbe an den aufgelösten Modus angleichen. */
function applyMode(resolved: "dark" | "light"): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#09090b" : "#f4f5f7");
}

const subscribeSystemDark = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode);
  const [accent, setAccentState] = useState<AccentId>(readAccent);

  const systemDark = useSyncExternalStore(
    subscribeSystemDark,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => true, // Server-Snapshot: Standard dunkel
  );
  const resolvedMode: "dark" | "light" =
    mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    applyMode(resolvedMode);
  }, [resolvedMode]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignorieren */
    }
  };

  const setAccent = (a: AccentId) => {
    setAccentState(a);
    try {
      localStorage.setItem(ACCENT_KEY, a);
    } catch {
      /* ignorieren */
    }
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
