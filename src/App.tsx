import { Suspense, lazy } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, LayoutGrid, ListOrdered, Trophy, Radio } from "lucide-react";
import { liveOf, useWmData } from "./lib/useWmData";
import { Skeleton } from "./components/ui";
import { cn } from "./lib/utils";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const MatchCenter = lazy(() => import("./pages/MatchCenter"));
const Standings = lazy(() => import("./pages/Standings"));
const Bracket = lazy(() => import("./pages/Bracket"));
const Simulator = lazy(() => import("./pages/Simulator"));

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/tabellen", label: "Tabellen", icon: ListOrdered },
  { to: "/ko", label: "K.-o.-Baum", icon: Trophy },
  { to: "/simulator", label: "KI-Simulator", icon: BrainCircuit },
];

function Navbar() {
  const { matches } = useWmData();
  const live = liveOf(matches);
  return (
    <header className="fixed inset-x-3 top-3 z-50 sm:inset-x-4 sm:top-4">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-3 py-2 sm:px-5">
        <NavLink to="/" className="flex items-center gap-2.5" aria-label="WM 2026 Startseite">
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
                  "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "bg-white/[0.08] text-zinc-50"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
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
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-volt-400/10 px-3 text-[12px] font-bold uppercase tracking-wider text-volt-400 transition-colors duration-200 hover:bg-volt-400/20"
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

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Inhalt wird geladen">
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  return (
    <div className="min-h-dvh">
      <Navbar />
      <main className="mx-auto max-w-6xl px-3 pb-16 pt-24 sm:px-4 sm:pt-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Suspense fallback={<PageFallback />}>
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/match/:id" element={<MatchCenter />} />
                <Route path="/tabellen" element={<Standings />} />
                <Route path="/ko" element={<Bracket />} />
                <Route path="/simulator" element={<Simulator />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-zinc-600">
        WM 2026 · Spieldaten via ESPN-API, KI-Inhalte &amp; News simuliert · Kein offizielles FIFA-Produkt
      </footer>
    </div>
  );
}
