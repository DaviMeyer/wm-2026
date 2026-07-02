import { Suspense, lazy, useEffect, useLayoutEffect } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Compass, LayoutGrid, ListOrdered, Trophy, Radio } from "lucide-react";
import { liveOf, useWmData } from "./lib/useWmData";
import { Skeleton } from "./components/ui";
import ThemeSwitcher from "./components/ThemeSwitcher";
import { cn } from "./lib/utils";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MatchCenter = lazy(() => import("./pages/MatchCenter"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Standings = lazy(() => import("./pages/Standings"));
const Bracket = lazy(() => import("./pages/Bracket"));

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/spielplan", label: "Spielplan", icon: CalendarDays },
  { to: "/tabellen", label: "Tabellen", icon: ListOrdered },
  { to: "/ko", label: "K.-o.-Baum", icon: Trophy },
];

/** Browser-Tab-Titel pro Route – hilft bei Verlauf, Tabs und Vorlese-Tools. */
const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard · WM 2026",
  "/spielplan": "Spielplan · WM 2026",
  "/tabellen": "Gruppentabellen · WM 2026",
  "/ko": "K.-o.-Baum · WM 2026",
};

function Navbar() {
  const { matches } = useWmData();
  const live = liveOf(matches);
  return (
    <header className="fixed inset-x-3 top-3 z-50 sm:inset-x-4 sm:top-4">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-3 py-2 sm:px-5">
        <NavLink to="/" className="flex min-h-11 shrink-0 items-center gap-2.5" aria-label="WM 2026 Startseite">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-volt-400 font-display text-[13px] font-black tracking-tighter text-pitch-950">
            26
          </span>
          <span className="hidden font-display text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-100 sm:block">
            WM&nbsp;2026
          </span>
        </NavLink>

        <div className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-medium transition-colors duration-200 sm:px-3",
                  isActive
                    ? "bg-zinc-500/15 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-500/10 hover:text-zinc-200"
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:block">{label}</span>
            </NavLink>
          ))}
        </div>

        {live.length > 0 ? (
          <NavLink
            to={`/match/${live[0].id}`}
            className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-volt-400/10 px-2.5 text-[12px] font-bold uppercase tracking-wider text-volt-400 transition-colors duration-200 hover:bg-volt-400/20 sm:px-3"
          >
            <Radio className="h-3.5 w-3.5 animate-pulse-live rounded-full" aria-hidden="true" />
            <span className="hidden sm:block">{live.length} Live</span>
          </NavLink>
        ) : (
          <span className="w-11" />
        )}
      </nav>
    </header>
  );
}

/**
 * Setzt den Scroll bei jedem Routenwechsel nach oben. Ohne dies öffnete eine
 * Detailseite mitten im Dokument (Scroll der Vorseite blieb erhalten), was sich
 * wie eine „hängende" Navigation anfühlte. Läuft vor dem Paint (kein Springen).
 * Der Spielplan überschreibt das danach bewusst mit seinem „Heute"-Sprung.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Auffangroute für unbekannte URLs (statt leerem Bildschirm). */
function NotFound() {
  return (
    <div className="card mx-auto mt-8 max-w-md p-6 text-center sm:p-8">
      <Compass className="mx-auto h-10 w-10 text-zinc-600" aria-hidden="true" />
      <h1 className="mt-4 font-display text-xl font-extrabold text-zinc-50">Seite nicht gefunden</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Diese Adresse gibt es nicht (mehr). Alle Bereiche erreichst du über die Navigation.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-volt-400 px-5 text-sm font-bold text-pitch-950 transition-colors duration-200 hover:bg-volt-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-950"
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        Zum Dashboard
      </Link>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-3 sm:space-y-4" aria-busy="true" aria-label="Inhalt wird geladen">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
        <Skeleton className="h-56 max-lg:hidden" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function App() {
  const location = useLocation();

  // Browser-Titel an die aktuelle Route anpassen (Detailseiten setzen ihn selbst).
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname];
    if (title) document.title = title;
    else if (!location.pathname.startsWith("/match/"))
      document.title = "WM 2026 · Live-Daten & KI-Insights";
  }, [location.pathname]);

  return (
    <div className="min-h-dvh">
      <ScrollToTop />
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-volt-400 px-4 py-2 text-sm font-bold text-pitch-950 focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:outline-none focus:ring-2 focus:ring-volt-400 focus:ring-offset-2 focus:ring-offset-pitch-950"
      >
        Zum Inhalt springen
      </a>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-6xl px-3 pb-16 pt-24 sm:px-4 sm:pt-28">
        {/* Suspense bewusst AUSSERHALB der gekeyten motion.div: so kann ein noch
            nicht geladener Lazy-Chunk die Exit-Animation nicht blockieren
            (verhindert das gelegentliche „Einfrieren" beim Zurück-Navigieren). */}
        <Suspense fallback={<PageFallback />}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/spielplan" element={<Schedule />} />
                <Route path="/match/:id" element={<MatchCenter />} />
                <Route path="/tabellen" element={<Standings />} />
                <Route path="/ko" element={<Bracket />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      <footer className="border-t border-line px-4 py-6 text-center text-xs text-zinc-600">
        WM 2026 · Alle Daten live via ESPN-API · Kein offizielles FIFA-Produkt
      </footer>
      <ThemeSwitcher />
    </div>
  );
}
