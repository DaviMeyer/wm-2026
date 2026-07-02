import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronRight, Star } from "lucide-react";
import { teamByCode, venueById, DEFAULT_FAVORITES, type Match } from "../data/wm";
import { ErrorState, Pill, Skeleton, TeamCrest } from "../components/ui";
import { effectiveNow, retry, useSchedule } from "../lib/useWmData";
import { cn, kickoffUser, TOURNAMENT_TZ, tournamentDayKey } from "../lib/utils";

/* ------------------------------------------------------------------ */
/*  Spielplan – alle Partien des Turniers, nach Tagen gruppiert        */
/* ------------------------------------------------------------------ */

type Phase = "alle" | "gruppe" | "ko";

const PHASES: { id: Phase; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "gruppe", label: "Gruppenphase" },
  { id: "ko", label: "K.-o.-Runde" },
];

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const dayVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

/** Gruppenphase = Spiel hat eine echte Gruppe; alles andere ist K.-o. */
const isGroupStage = (m: Match) => m.group !== "";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem("wm26-favorites");
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((c) => typeof c === "string")) {
        return parsed;
      }
    }
  } catch {
    /* Fallback */
  }
  return DEFAULT_FAVORITES;
}

// Spieltage werden an der Turnier-Referenzzone (US-Ostküste) ausgerichtet –
// siehe TOURNAMENT_TZ/tournamentDayKey in lib/utils (geteilt mit dem Dashboard),
// damit ein zusammenhängender US-Spieltag genau EINEN Tagesblock bildet.
function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TOURNAMENT_TZ,
  }).format(new Date(iso));
}

const isToday = (iso: string) =>
  tournamentDayKey(new Date(iso)) === tournamentDayKey(effectiveNow());

function ScheduleRow({ match }: { match: Match }) {
  const home = teamByCode(match.homeCode);
  const away = teamByCode(match.awayCode);
  const venue = venueById(match.venueId);
  const isLive = match.status === "live";

  return (
    <Link
      to={`/match/${match.id}`}
      aria-label={`${home.name} gegen ${away.name}, Details öffnen`}
      className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-zinc-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400 sm:gap-3 sm:px-3"
    >
      {/* Status/Zeit */}
      <span className="w-14 shrink-0 sm:w-16">
        {isLive ? (
          <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-volt-400">
            <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-volt-400" />
            {match.minute}′
          </span>
        ) : match.status === "finished" ? (
          <span className="font-mono text-[11px] uppercase text-zinc-600">Ende</span>
        ) : (
          <span className="font-mono text-xs tabular-nums text-zinc-300">
            {kickoffUser(match)}
          </span>
        )}
      </span>

      {/* Heim */}
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-medium text-zinc-200">{home.name}</span>
        <TeamCrest code={home.code} size="sm" />
      </span>

      {/* Ergebnis / vs */}
      {match.status === "upcoming" ? (
        <span className="w-10 shrink-0 text-center font-mono text-[11px] text-zinc-600">
          vs
        </span>
      ) : (
        <span
          className={cn(
            "display-num w-10 shrink-0 rounded-lg py-0.5 text-center text-sm",
            isLive ? "bg-volt-400/10 text-volt-400" : "bg-pitch-800 text-zinc-100"
          )}
        >
          {match.homeScore}:{match.awayScore}
        </span>
      )}

      {/* Auswärts */}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <TeamCrest code={away.code} size="sm" />
        <span className="truncate text-sm font-medium text-zinc-200">{away.name}</span>
      </span>

      <span className="hidden w-28 shrink-0 truncate text-right text-xs text-zinc-500 lg:block">
        {venue.city}
      </span>
      <ChevronRight className="hidden h-4 w-4 shrink-0 text-zinc-600 sm:block" aria-hidden="true" />
    </Link>
  );
}

export default function Schedule() {
  const { schedule, loading, source } = useSchedule();
  const [phase, setPhase] = useState<Phase>("alle");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  // Favoriten aktuell halten: Änderungen aus anderen Tabs (storage-Event) und
  // beim Zurückkehren zur Seite (focus) neu einlesen – statt eines einmaligen
  // Snapshots, der die Auswahl der FavoritesBar verpasst.
  useEffect(() => {
    const sync = () => setFavorites(loadFavorites());
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const days = useMemo(() => {
    const filtered = schedule
      .filter((m) => {
        if (phase === "gruppe" && !isGroupStage(m)) return false;
        if (phase === "ko" && isGroupStage(m)) return false;
        if (onlyFavorites && !favorites.includes(m.homeCode) && !favorites.includes(m.awayCode))
          return false;
        return true;
      })
      // Chronologisch sortieren: Die Tagesblöcke unten entstehen aus
      // zusammenhängenden Läufen – unsortiert gäbe es doppelte Tages-Keys.
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    const grouped: { key: string; label: string; today: boolean; matches: Match[] }[] = [];
    for (const m of filtered) {
      const key = tournamentDayKey(new Date(m.kickoff));
      const last = grouped[grouped.length - 1];
      if (last && last.key === key) last.matches.push(m);
      else grouped.push({ key, label: dayLabel(m.kickoff), today: isToday(m.kickoff), matches: [m] });
    }
    return grouped;
  }, [schedule, phase, onlyFavorites, favorites]);

  // Beim ersten Laden zum heutigen (sonst nächstgelegenen) Spieltag springen,
  // statt am Turnierstart (11. Juni) zu beginnen. Vergangene Tage bleiben
  // weiterhin nach oben scrollbar.
  const targetKey = useMemo(() => {
    if (days.length === 0) return null;
    const todayBlock = days.find((d) => d.today);
    if (todayBlock) return todayBlock.key;
    const now = effectiveNow().getTime();
    const upcoming = days.find((d) => new Date(d.matches[0].kickoff).getTime() >= now);
    return (upcoming ?? days[days.length - 1]).key;
  }, [days]);

  const targetRef = useRef<HTMLElement | null>(null);
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (loading || hasScrolledRef.current || !targetRef.current) return;
    hasScrolledRef.current = true;
    const el = targetRef.current;
    // Nach dem ersten Paint springen (Layout steht), ohne sichtbares Hochscrollen.
    const raf = requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [loading, days]);

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Spielplan wird geladen">
        <Skeleton className="h-10 w-72 max-w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (source === "error") {
    return <ErrorState onRetry={retry} />;
  }

  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-5 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-zinc-50 sm:text-3xl">
            Spielplan
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Alle Partien vom 11. Juni bis zum Finale am 19. Juli – Zeiten in deiner Zeitzone
          </p>
        </div>
        <Pill tone="volt">Live-Daten · ESPN</Pill>
      </motion.header>

      {/* Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
        className="mb-6 flex flex-wrap items-center gap-2"
      >
        <div
          role="group"
          aria-label="Nach Turnierphase filtern"
          className="flex gap-2 overflow-x-auto overscroll-x-contain py-1"
        >
          {PHASES.map((p) => {
            const active = phase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhase(p.id)}
                aria-pressed={active}
                className={cn(
                  "min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-400",
                  active
                    ? "border-volt-400 bg-volt-400 text-pitch-950"
                    : "border-line bg-pitch-900/80 text-zinc-400 hover:border-pitch-700 hover:text-zinc-200"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setOnlyFavorites((v) => !v)}
          aria-pressed={onlyFavorites}
          className={cn(
            "flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-400",
            onlyFavorites
              ? "border-gold-400/60 bg-gold-400/10 text-gold-400"
              : "border-line bg-pitch-900/80 text-zinc-400 hover:border-pitch-700 hover:text-zinc-200"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", onlyFavorites && "fill-current")} aria-hidden="true" />
          Nur Favoriten
        </button>
      </motion.div>

      {/* Tagesblöcke */}
      {days.length === 0 ? (
        <p className="card p-6 text-center text-sm text-zinc-500">
          {onlyFavorites
            ? "Keine Spiele deiner Favoriten für diesen Filter gefunden."
            : phase === "ko"
              ? "Die K.-o.-Paarungen stehen erst nach der Gruppenphase fest."
              : "Keine Spiele für diese Filter gefunden."}
        </p>
      ) : (
        <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-6">
          {days.map((day) => (
            <motion.section
              key={day.key}
              ref={day.key === targetKey ? targetRef : undefined}
              variants={dayVariants}
              aria-label={day.label}
              className="scroll-mt-24 sm:scroll-mt-28"
            >
              <h2
                className={cn(
                  "label-caps sticky top-19 z-10 -mx-2 mb-1 rounded-lg bg-pitch-950/95 px-2 py-2 backdrop-blur-sm sm:top-20",
                  day.today && "text-volt-400"
                )}
              >
                {day.label}
                {day.today && " · Heute"}
              </h2>
              <div className="card divide-y divide-line/60 p-1.5">
                {day.matches.map((m) => (
                  <ScheduleRow key={m.id} match={m} />
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>
      )}

      <p className="mt-5 text-xs text-zinc-600">
        K.-o.-Paarungen zeigen offizielle Platzhalter (z. B. „Sieger Gruppe A“), bis die
        Teams feststehen.
      </p>
    </div>
  );
}
