import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { ArrowLeft, BrainCircuit, Goal, Info, SearchX, UserCheck } from "lucide-react";
import type { GoalEvent, Match, PlayAction } from "../data/wm";
import { teamByCode } from "../data/wm";
import { useMatch, useMatchPlays } from "../lib/useWmData";
import { Card, LiveBadge, Pill, Skeleton, StatBar, TeamCrest } from "../components/ui";
import { VenueCard } from "../components/VenueCard";
import { AIPredictionCard } from "../components/ai/AIPredictionCard";
import { AITacticalSummary } from "../components/ai/AITacticalSummary";
import { MomentumChart } from "../components/match/MomentumChart";
import { PitchLineups } from "../components/match/PitchLineups";
import { MatchStatsPanel } from "../components/match/MatchStatsPanel";
import { MatchTimeline } from "../components/match/MatchTimeline";
import { cn, deriveMomentum, formatDate, kickoffUser } from "../lib/utils";

/* ---------------------------------------------------------------- */
/*  Match Center – Live-Detailseite im FotMob-Stil                   */
/* ---------------------------------------------------------------- */

const TABS = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "verlauf", label: "Verlauf" },
  { id: "aufstellung", label: "Aufstellung" },
  { id: "statistik", label: "Statistik" },
  { id: "ki", label: "Prognose" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const fmtPct = (v: number) => `${v} %`;

function NotFound() {
  return (
    <Card className="mx-auto mt-8 max-w-md p-6 text-center sm:p-8">
      <SearchX className="mx-auto h-10 w-10 text-zinc-600" aria-hidden="true" />
      <h1 className="mt-4 font-display text-xl font-extrabold text-zinc-50">
        Spiel nicht gefunden
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Unter dieser ID ist kein Spiel hinterlegt. Vielleicht ist der Link veraltet –
        alle aktuellen Partien findest du auf dem Dashboard.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-volt-400 px-5 text-sm font-bold text-pitch-950 transition-colors duration-200 hover:bg-volt-300 focus-visible:ring-2 focus-visible:ring-volt-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-950"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Zurück zum Dashboard
      </Link>
    </Card>
  );
}

function TeamSide({ code, side }: { code: string; side: "home" | "away" }) {
  const team = teamByCode(code);
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamCrest code={code} size="lg" className="sm:hidden" />
      <TeamCrest code={code} size="xl" className="max-sm:hidden" />
      <p className="max-w-full truncate font-display text-base font-extrabold tracking-tight text-zinc-50 sm:text-xl">
        {team.name}
      </p>
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          side === "home" ? "text-volt-400" : "text-azure-400"
        )}
      >
        {side === "home" ? "Heim" : "Auswärts"}
      </span>
    </div>
  );
}

/** Torschützen unter dem Spielstand – Heim rechts zur Mitte, Auswärts links. */
function ScorerList({ goals }: { goals: GoalEvent[] }) {
  const home = goals.filter((g) => g.team === "home");
  const away = goals.filter((g) => g.team === "away");

  const tagOf = (g: GoalEvent) => (g.ownGoal ? " (ET)" : g.penalty ? " (Elfm.)" : "");

  return (
    <div className="mt-5 grid grid-cols-2 gap-x-4 border-t border-line pt-4 text-sm sm:gap-x-8">
      <ul className="space-y-1.5">
        {home.map((g, i) => (
          <li key={`h-${i}`} className="flex items-center justify-end gap-1.5">
            <span className="truncate text-zinc-300">
              {g.scorer}
              <span className="text-zinc-500">{tagOf(g)}</span>
            </span>
            <span className="shrink-0 font-mono text-xs text-zinc-500">{g.clockLabel}</span>
            <Goal className="h-3.5 w-3.5 shrink-0 text-volt-400" aria-hidden="true" />
          </li>
        ))}
      </ul>
      <ul className="space-y-1.5">
        {away.map((g, i) => (
          <li key={`a-${i}`} className="flex items-center justify-start gap-1.5">
            <Goal className="h-3.5 w-3.5 shrink-0 text-azure-400" aria-hidden="true" />
            <span className="shrink-0 font-mono text-xs text-zinc-500">{g.clockLabel}</span>
            <span className="truncate text-zinc-300">
              {g.scorer}
              <span className="text-zinc-500">{tagOf(g)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchHeader({ match }: { match: Match }) {
  return (
    <Card className="p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <span className="label-caps">
          {match.group ? `Gruppe ${match.group} · Gruppenphase` : "WM 2026"}
        </span>
        {match.status === "live" && <LiveBadge minute={match.minute} />}
        {match.status === "finished" && <Pill tone="neutral">Endstand</Pill>}
        {match.status === "upcoming" && <Pill tone="azure">Bevorstehend</Pill>}
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
        <TeamSide code={match.homeCode} side="home" />

        <div className="px-1 text-center">
          {match.status === "upcoming" ? (
            <>
              <p className="display-num text-4xl text-zinc-600 sm:text-5xl md:text-7xl" aria-label="Spiel noch nicht gestartet">
                –
              </p>
              <p className="mt-2 font-mono text-sm font-semibold text-zinc-200">
                {kickoffUser(match)} Uhr
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">{formatDate(match.kickoff)}</p>
            </>
          ) : (
            <>
              <p className="display-num text-4xl text-zinc-50 sm:text-6xl md:text-8xl">
                {match.homeScore}
                <span className="mx-1 text-zinc-600 sm:mx-2">:</span>
                {match.awayScore}
              </p>
              {match.status === "finished" && (
                <p className="mt-1 text-xs text-zinc-500">{formatDate(match.kickoff)}</p>
              )}
            </>
          )}
        </div>

        <TeamSide code={match.awayCode} side="away" />
      </div>

      {match.status !== "upcoming" && match.goals && match.goals.length > 0 && (
        <ScorerList goals={match.goals} />
      )}

      {match.referee && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-line pt-4">
          <UserCheck className="h-4 w-4 text-zinc-500" aria-hidden="true" />
          <span className="label-caps">Schiedsrichter</span>
          <span className="font-mono text-sm text-zinc-300">{match.referee}</span>
        </div>
      )}
    </Card>
  );
}

function OverviewTab({ match, plays }: { match: Match; plays: PlayAction[] }) {
  const home = teamByCode(match.homeCode);
  const away = teamByCode(match.awayCode);

  // Attack Momentum aus echtem ESPN-Play-by-Play (Schüsse, Ecken, Fouls …).
  // Solange die Aktionen noch nicht geladen sind, greift der Toren-Fallback.
  const hasPlays = plays.length > 0;
  const momentum = useMemo(() => deriveMomentum(match, plays), [match, plays]);

  if (match.status === "upcoming") {
    return (
      <div className="grid items-start gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {match.prediction ? (
            <AIPredictionCard match={match} />
          ) : (
            <Card className="p-6 text-center sm:p-8">
              <BrainCircuit className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
              <p className="mt-3 text-sm text-zinc-500">
                Für diese Partie liegen noch keine Buchmacherquoten für eine
                Prognose vor.
              </p>
            </Card>
          )}
        </div>
        <Card className="flex items-start gap-3 p-5 lg:col-span-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-azure-400" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-zinc-400">
            Attack Momentum und Live-Statistiken erscheinen hier ab Anstoß. Bis dahin
            liefert die Markt-Prognose den besten Vorgeschmack auf die Partie.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-5">
      <Card className="p-5 lg:col-span-3">
        <MomentumChart
          momentum={momentum}
          homeName={home.name}
          awayName={away.name}
          estimated={!hasPlays}
        />
      </Card>
      <Card className="p-5 lg:col-span-2">
        <p className="mb-5 font-display text-sm font-extrabold tracking-tight text-zinc-100">
          Kurz-Statistik
        </p>
        {match.stats && (match.stats.possession || match.stats.shots) ? (
          <div className="space-y-5">
            {match.stats.possession && (
              <StatBar
                label="Ballbesitz"
                home={match.stats.possession[0]}
                away={match.stats.possession[1]}
                format={fmtPct}
              />
            )}
            {match.stats.shots && (
              <StatBar
                label="Schüsse"
                home={match.stats.shots[0]}
                away={match.stats.shots[1]}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Detailstatistiken liegen für diese Partie nicht vor.
          </p>
        )}
      </Card>
    </div>
  );
}

function AITab({ match }: { match: Match }) {
  if (!match.prediction) {
    return (
      <Card className="mx-auto max-w-lg p-6 text-center sm:p-8">
        <BrainCircuit className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
        <p className="mt-3 font-display text-sm font-extrabold text-zinc-200">
          Keine Markt-Prognose verfügbar
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Für diese Partie liegen keine Buchmacherquoten vor.
        </p>
      </Card>
    );
  }
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <AIPredictionCard match={match} />
      <AITacticalSummary match={match} />
    </div>
  );
}

export default function MatchCenter() {
  const { id } = useParams();
  const [tab, setTab] = useState<TabId>("uebersicht");
  const { match, loading } = useMatch(id);
  const { plays } = useMatchPlays(id, match?.status);

  // Beim Wechsel auf ein anderes Spiel wieder mit der Übersicht starten.
  useEffect(() => setTab("uebersicht"), [id]);

  // Browser-Titel mit der aktuellen Paarung versehen.
  useEffect(() => {
    if (!match) return;
    const home = teamByCode(match.homeCode).name;
    const away = teamByCode(match.awayCode).name;
    document.title = `${home} – ${away} · WM 2026`;
  }, [match]);

  if (!match && loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-label="Spieldetails werden geladen">
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-10 w-80 max-w-full" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!match) return <NotFound />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Header: Spielstand + Stadion */}
      <motion.section variants={fadeUp} className="grid items-start gap-4 lg:grid-cols-[1fr_340px]">
        <MatchHeader match={match} />
        <VenueCard match={match} />
      </motion.section>

      {/* Tab-Navigation */}
      <motion.div variants={fadeUp}>
        <div role="tablist" aria-label="Match-Center-Bereiche" className="flex gap-1 overflow-x-auto overscroll-x-contain border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-t-lg px-3 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-volt-400/60 sm:px-4",
                tab === t.id ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="match-tab-underline"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-volt-400"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab-Inhalt */}
      <motion.div variants={fadeUp}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            id={`panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {tab === "uebersicht" && <OverviewTab match={match} plays={plays} />}
            {tab === "verlauf" && <MatchTimeline match={match} />}
            {tab === "aufstellung" && <PitchLineups match={match} />}
            {tab === "statistik" && (
              <MatchStatsPanel match={match} className="mx-auto max-w-2xl" />
            )}
            {tab === "ki" && <AITab match={match} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
