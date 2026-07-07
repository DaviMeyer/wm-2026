import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Trophy } from "lucide-react";
import { teamByCode } from "../data/wm";
import type { Match, MatchRound, MatchStatus, StandingRow } from "../data/wm";
import { ErrorState, Pill, Skeleton, TeamCrest } from "../components/ui";
import { Confetti } from "../components/fx/Confetti";
import { retry, useSchedule, useWmData } from "../lib/useWmData";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/*  K.-o.-Baum                                                         */
/*  Primär aus den echten ESPN-K.-o.-Spielen (Teams, Ergebnisse, wer  */
/*  weiterkam). Nur wenn noch keine K.-o.-Partien angesetzt sind       */
/*  (Demo-Modus / sehr früh im Turnier) wird aus den Gruppentabellen   */
/*  projiziert.                                                        */
/* ------------------------------------------------------------------ */

type Slot =
  | { kind: "team"; code: string; score?: number; advanced?: boolean }
  | { kind: "tbd"; label: string };

interface BracketMatch {
  key: string;
  id?: string; // echte Match-ID → klickbar; fehlt bei Projektion
  no?: number; // FIFA-Spielnummer (nur Projektion)
  home: Slot;
  away: Slot;
  status?: MatchStatus;
  minute?: number;
  kickoff?: string;
  decisionNote?: string;
}

interface Round {
  title: string;
  dates: string;
  matches: BracketMatch[];
}

/* ----------------------- Echte Spiele → Baum ----------------------- */

const KO_ROUNDS: { slug: MatchRound; title: string }[] = [
  { slug: "round-of-32", title: "Sechzehntelfinale" },
  { slug: "round-of-16", title: "Achtelfinale" },
  { slug: "quarterfinals", title: "Viertelfinale" },
  { slug: "semifinals", title: "Halbfinale" },
  { slug: "3rd-place-match", title: "Spiel um Platz 3" },
  { slug: "final", title: "Finale" },
];

/** Ein Team-Code wird zum Platzhalter-Slot, sobald das Team noch nicht feststeht. */
function slotFromCode(code: string, score: number | undefined, advancedCode?: string): Slot {
  const team = teamByCode(code);
  if (team.placeholder) return { kind: "tbd", label: team.name };
  return { kind: "team", code, score, advanced: advancedCode === code };
}

function matchToBracket(m: Match): BracketMatch {
  return {
    key: m.id,
    id: m.id,
    home: slotFromCode(m.homeCode, m.homeScore, m.advancedCode),
    away: slotFromCode(m.awayCode, m.awayScore, m.advancedCode),
    status: m.status,
    minute: m.minute,
    kickoff: m.kickoff,
    decisionNote: m.decisionNote,
  };
}

function dateRange(games: Match[]): string {
  const fmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" });
  const first = fmt.format(new Date(games[0].kickoff));
  const last = fmt.format(new Date(games[games.length - 1].kickoff));
  return first === last ? first : `${first} – ${last}`;
}

/** Runden aus den echten K.-o.-Spielen des Spielplans (leer = noch keine). */
function buildRoundsFromSchedule(schedule: Match[]): Round[] {
  const rounds: Round[] = [];
  for (const { slug, title } of KO_ROUNDS) {
    const games = schedule
      .filter((m) => m.round === slug)
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    if (games.length === 0) continue;
    rounds.push({ title, dates: dateRange(games), matches: games.map(matchToBracket) });
  }
  return rounds;
}

/* ----------------- Fallback: Projektion aus Tabellen --------------- */

const m = (no: number, home: Slot, away: Slot): BracketMatch => ({
  key: `proj-${no}`,
  no,
  home,
  away,
});

const third = (groups: string): Slot => ({ kind: "tbd", label: `3. Gruppe ${groups}` });

/**
 * Folgerunde: verknüpft die Sieger zweier Vorrunden-Spiele nach offizieller
 * FIFA-Paarung. Ab dem Achtelfinale wird „über Kreuz" gepaart, darum nennt
 * `links` die Quell-Spiele (Index in `prev`) je Folgespiel explizit.
 */
function nextRound(
  prev: BracketMatch[],
  links: { no: number; a: number; b: number }[]
): BracketMatch[] {
  return links.map(({ no, a, b }) =>
    m(
      no,
      { kind: "tbd", label: `Sieger Spiel ${prev[a].no}` },
      { kind: "tbd", label: `Sieger Spiel ${prev[b].no}` }
    )
  );
}

/** Alle Runden, projiziert aus den aktuellen (Live-)Tabellen. */
function buildProjectedRounds(standings: Record<string, StandingRow[]>): Round[] {
  const projected = (group: string, pos: 0 | 1): Slot => {
    const rows = [...(standings[group] ?? [])].sort(
      (a, b) =>
        (a.rank ?? 99) - (b.rank ?? 99) ||
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor
    );
    const row = rows[pos];
    return row
      ? { kind: "team", code: row.teamCode }
      : { kind: "tbd", label: `${pos === 0 ? "Sieger" : "2."} Gruppe ${group}` };
  };

  const roundOf32: BracketMatch[] = [
    m(73, projected("A", 1), projected("B", 1)),
    m(74, projected("E", 0), third("A/B/C/D/F")),
    m(75, projected("F", 0), projected("C", 1)),
    m(76, projected("C", 0), projected("F", 1)),
    m(77, projected("I", 0), third("C/D/F/G/H")),
    m(78, projected("E", 1), projected("I", 1)),
    m(79, projected("A", 0), third("C/E/F/H/I")),
    m(80, projected("L", 0), third("E/H/I/J/K")),
    m(81, projected("D", 0), third("B/E/F/I/J")),
    m(82, projected("G", 0), third("A/E/H/I/J")),
    m(83, projected("K", 1), projected("L", 1)),
    m(84, projected("H", 0), projected("J", 1)),
    m(85, projected("B", 0), third("E/F/G/I/J")),
    m(86, projected("J", 0), projected("H", 1)),
    m(87, projected("K", 0), third("D/E/I/J/L")),
    m(88, projected("D", 1), projected("G", 1)),
  ];

  const roundOf16 = nextRound(roundOf32, [
    { no: 89, a: 0, b: 1 },
    { no: 90, a: 2, b: 3 },
    { no: 91, a: 4, b: 5 },
    { no: 92, a: 6, b: 7 },
    { no: 93, a: 10, b: 11 },
    { no: 94, a: 8, b: 9 },
    { no: 95, a: 13, b: 15 },
    { no: 96, a: 12, b: 14 },
  ]);

  const quarter = nextRound(roundOf16, [
    { no: 97, a: 0, b: 1 },
    { no: 98, a: 4, b: 5 },
    { no: 99, a: 2, b: 3 },
    { no: 100, a: 6, b: 7 },
  ]);

  const semi = nextRound(quarter, [
    { no: 101, a: 0, b: 1 },
    { no: 102, a: 2, b: 3 },
  ]);
  const final = nextRound(semi, [{ no: 104, a: 0, b: 1 }]);

  return [
    { title: "Sechzehntelfinale", dates: "28. Juni – 3. Juli", matches: roundOf32 },
    { title: "Achtelfinale", dates: "4. – 7. Juli", matches: roundOf16 },
    { title: "Viertelfinale", dates: "9. – 11. Juli", matches: quarter },
    { title: "Halbfinale", dates: "14. – 15. Juli", matches: semi },
    { title: "Finale", dates: "19. Juli", matches: final },
  ];
}

/* ----------------------------- Render ------------------------------ */

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(iso));

function SlotLine({
  slot,
  accent,
  decided,
}: {
  slot: Slot;
  accent: "volt" | "azure";
  decided: boolean;
}) {
  if (slot.kind === "team") {
    const team = teamByCode(slot.code);
    const out = decided && !slot.advanced; // entschieden & ausgeschieden → dezent
    return (
      <div className="flex min-h-6 items-center gap-2">
        <TeamCrest code={slot.code} size="sm" />
        <span
          className={cn(
            "truncate text-sm font-semibold",
            out ? "text-zinc-500" : "text-zinc-100"
          )}
        >
          {team.name}
        </span>
        {slot.score !== undefined ? (
          <span
            className={cn(
              "display-num ml-auto shrink-0 text-sm tabular-nums",
              slot.advanced ? "text-volt-400" : out ? "text-zinc-600" : "text-zinc-100"
            )}
          >
            {slot.score}
          </span>
        ) : (
          <span
            className={cn(
              "ml-auto shrink-0 font-mono text-[10px] tabular-nums",
              accent === "volt" ? "text-volt-400" : "text-azure-400"
            )}
          >
            {slot.code}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-6 items-center gap-2">
      <span
        className="inline-flex h-6 w-6 shrink-0 rounded-full border border-dashed border-pitch-700"
        aria-hidden="true"
      />
      <span className="truncate text-sm italic text-zinc-600">{slot.label}</span>
    </div>
  );
}

function MatchCard({ match, isFinal = false }: { match: BracketMatch; isFinal?: boolean }) {
  const decided = match.status === "finished";
  const isLive = match.status === "live";

  // Weltmeister-Krönung: Konfetti im entschiedenen Finale (Farben des Siegers).
  const winnerSlot =
    match.home.kind === "team" && match.home.advanced
      ? match.home
      : match.away.kind === "team" && match.away.advanced
        ? match.away
        : null;
  const championColors =
    isFinal && decided && winnerSlot?.kind === "team"
      ? teamByCode(winnerSlot.code).colors
      : null;

  // Statuszeile oben links: Live-Minute, „Beendet", Anstoßdatum oder Spielnummer
  const label = isLive
    ? `${match.minute ?? ""}′`.trim() || "Live"
    : decided
      ? "Beendet"
      : match.kickoff
        ? shortDate(match.kickoff)
        : match.no
          ? `Spiel ${match.no}`
          : "";

  const inner = (
    <>
      {championColors && (
        <Confetti burstKey="champion" colors={[championColors[0], championColors[1], "#fbbf24"]} />
      )}
      <div className="mb-2 flex items-center justify-between">
        {isLive ? (
          <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-volt-400">
            <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-volt-400" />
            {label}
          </span>
        ) : (
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-wider",
              isFinal ? "font-bold text-gold-400" : "text-zinc-600"
            )}
          >
            {isFinal ? "Finale" : label}
          </span>
        )}
        {isFinal && <Trophy className="h-4 w-4 text-gold-400" aria-hidden="true" />}
      </div>
      <SlotLine slot={match.home} accent="volt" decided={decided} />
      <div className="my-2 h-px bg-line" aria-hidden="true" />
      <SlotLine slot={match.away} accent="azure" decided={decided} />
      {match.decisionNote && (
        <p className="mt-2 truncate font-mono text-[11px] text-zinc-500">{match.decisionNote}</p>
      )}
      {isFinal && !match.id && (
        <p className="mt-3 border-t border-gold-400/20 pt-2.5 font-mono text-[11px] text-gold-400/90">
          19. Juli 2026 · MetLife Stadium
        </p>
      )}
    </>
  );

  const className = cn(
    "card relative flex h-full flex-col overflow-hidden p-3 transition-colors duration-200",
    isFinal
      ? "border-gold-400/40 bg-gradient-to-b from-gold-400/10 to-transparent hover:border-gold-400/70"
      : "hover:border-pitch-700",
    match.id &&
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400"
  );

  return match.id ? (
    <Link to={`/match/${match.id}`} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export default function Bracket() {
  const { schedule, loading, source } = useSchedule();
  const { standings } = useWmData();

  const { rounds, projected } = useMemo(() => {
    const real = buildRoundsFromSchedule(schedule);
    return real.length > 0
      ? { rounds: real, projected: false }
      : { rounds: buildProjectedRounds(standings), projected: true };
  }, [schedule, standings]);

  // Aktiv gewählte Runde. Standard: die früheste Runde, in der noch/gerade
  // gespielt wird (live oder anstehend) – sonst die erste Runde.
  const defaultRound = useMemo(() => {
    const idx = rounds.findIndex((r) =>
      r.matches.some((mm) => mm.status === "live" || mm.status === "upcoming")
    );
    return idx >= 0 ? idx : 0;
  }, [rounds]);

  const [active, setActive] = useState(defaultRound);
  // Sinnvolle Vorauswahl übernehmen, sobald die Daten (Runden) geladen sind.
  useEffect(() => setActive(defaultRound), [defaultRound]);

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Turnierbaum wird geladen">
        <Skeleton className="mb-6 h-9 w-56" />
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (source === "error") {
    return <ErrorState onRetry={retry} />;
  }

  const activeRound = rounds[Math.min(active, rounds.length - 1)];
  const isFinalRound = activeRound === rounds[rounds.length - 1];

  return (
    <div>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mb-6 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-zinc-50 sm:text-3xl">
            K.-o.-Baum
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Der Weg zum Titel – von der 32er-Runde bis zum Finale.
          </p>
        </div>
        <Pill tone={projected ? "azure" : "volt"}>
          {projected ? "Projektion · Live-Tabellen" : "Live-Stand · ESPN"}
        </Pill>
      </motion.header>

      {/* Runden-Auswahl: nur die gewählte Runde wird gezeigt – kein Endlos-Scroll */}
      <div
        role="tablist"
        aria-label="K.-o.-Runde wählen"
        className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {rounds.map((round, ri) => {
          const selected = ri === Math.min(active, rounds.length - 1);
          const finalTab = ri === rounds.length - 1;
          const liveHere = round.matches.some((mm) => mm.status === "live");
          return (
            <button
              key={round.title}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(ri)}
              className={cn(
                "relative inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400/60",
                selected
                  ? finalTab
                    ? "border-gold-400/60 bg-gold-400/15 text-gold-400"
                    : "border-volt-400/60 bg-volt-400/15 text-volt-400"
                  : "border-line bg-pitch-900/60 text-zinc-400 hover:border-pitch-700 hover:text-zinc-200"
              )}
            >
              {finalTab && <Trophy className="h-3.5 w-3.5" aria-hidden="true" />}
              {round.title}
              {liveHere && (
                <span
                  className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-volt-400"
                  aria-label="Läuft gerade"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Gewählte Runde als kompaktes, responsives Grid */}
      <AnimatePresence mode="wait">
        <motion.section
          key={activeRound.title}
          role="tabpanel"
          aria-label={activeRound.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-4 font-mono text-[11px] text-zinc-600">
            {activeRound.dates} 2026 · {activeRound.matches.length}{" "}
            {activeRound.matches.length === 1 ? "Spiel" : "Spiele"}
          </p>
          <motion.div
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className={cn(
              "grid gap-3",
              isFinalRound
                ? "mx-auto max-w-md grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {activeRound.matches.map((match) => (
              <motion.div key={match.key} variants={cardVariants}>
                <MatchCard match={match} isFinal={isFinalRound} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      </AnimatePresence>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-6 text-xs text-zinc-600"
      >
        {projected
          ? "Projizierte Paarungen auf Basis der aktuellen Gruppentabellen. Die acht besten Gruppendritten werden nach dem 3. Spieltag zugelost."
          : "Echte K.-o.-Paarungen und Ergebnisse von ESPN. Noch nicht feststehende Gegner erscheinen als Platzhalter, sobald das Vorspiel entschieden ist."}
      </motion.p>
    </div>
  );
}
