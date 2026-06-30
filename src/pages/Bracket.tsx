import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronsLeftRight, Trophy } from "lucide-react";
import { teamByCode } from "../data/wm";
import type { Match, MatchRound, MatchStatus, StandingRow } from "../data/wm";
import { ErrorState, Pill, Skeleton, TeamCrest } from "../components/ui";
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

const columnVariants: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" } },
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
    "card block p-3 transition-colors duration-200",
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

  if (loading) {
    return (
      <div className="flex gap-5 overflow-hidden" aria-busy="true" aria-label="Turnierbaum wird geladen">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[60vh] w-56 shrink-0 sm:w-60" />
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

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mb-4 flex items-center gap-1.5 text-xs text-zinc-600"
      >
        <ChevronsLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
        Horizontal scrollen oder mit den Pfeiltasten navigieren, um alle Runden zu sehen
      </motion.p>

      <div
        className="overflow-x-auto overscroll-x-contain rounded-2xl pb-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-400"
        role="region"
        aria-label="Turnierbaum, horizontal scrollbar"
        tabIndex={0}
      >
        <div className="flex min-w-max items-stretch">
          {rounds.map((round, ri) => {
            const isFinalRound = ri === rounds.length - 1;
            return (
              <motion.section
                key={round.title}
                variants={columnVariants}
                initial="hidden"
                animate="show"
                transition={{ delay: ri * 0.09 }}
                aria-label={round.title}
                className={cn(
                  "flex w-56 shrink-0 flex-col sm:w-60",
                  ri > 0 && "ml-4 border-l border-line/70 pl-4 sm:ml-5 sm:pl-5"
                )}
              >
                <header className="mb-4">
                  <p className={cn("label-caps", isFinalRound && "text-gold-400")}>
                    {round.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
                    {round.dates} 2026
                  </p>
                </header>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {round.matches.map((match) => (
                    <MatchCard key={match.key} match={match} isFinal={isFinalRound} />
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="mt-2 text-xs text-zinc-600"
      >
        {projected
          ? "Projizierte Paarungen auf Basis der aktuellen Gruppentabellen. Die acht besten Gruppendritten werden nach dem 3. Spieltag zugelost."
          : "Echte K.-o.-Paarungen und Ergebnisse von ESPN. Noch nicht feststehende Gegner erscheinen als Platzhalter, sobald das Vorspiel entschieden ist."}
      </motion.p>
    </div>
  );
}
