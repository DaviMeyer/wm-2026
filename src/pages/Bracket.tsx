import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronsLeftRight, Trophy } from "lucide-react";
import { teamByCode } from "../data/wm";
import type { StandingRow } from "../data/wm";
import { Pill, Skeleton, TeamCrest } from "../components/ui";
import { useWmData } from "../lib/useWmData";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/*  K.-o.-Baum – projizierte Paarungen aus den aktuellen Tabellen      */
/*  (Gruppensieger & -zweite nach 1. Spieltag, Rest Platzhalter)       */
/* ------------------------------------------------------------------ */

type Slot = { kind: "team"; code: string } | { kind: "tbd"; label: string };

interface BracketMatch {
  no: number;
  home: Slot;
  away: Slot;
}

interface Round {
  title: string;
  dates: string;
  matches: BracketMatch[];
}

const m = (no: number, home: Slot, away: Slot): BracketMatch => ({ no, home, away });

const third = (groups: string): Slot => ({
  kind: "tbd",
  label: `3. Gruppe ${groups}`,
});

/** Folgerunde: paart die Sieger der jeweils benachbarten Spiele. */
function nextRound(prev: BracketMatch[], startNo: number): BracketMatch[] {
  return Array.from({ length: prev.length / 2 }, (_, i) =>
    m(
      startNo + i,
      { kind: "tbd", label: `Sieger Spiel ${prev[2 * i].no}` },
      { kind: "tbd", label: `Sieger Spiel ${prev[2 * i + 1].no}` }
    )
  );
}

/** Alle Runden, projiziert aus den aktuellen (Live-)Tabellen. */
function buildRounds(standings: Record<string, StandingRow[]>): Round[] {
  /** Gruppensieger (pos 0) bzw. -zweiter (pos 1) nach Rang/Punkten/Diff. */
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

  /* 32er-Runde: 12 Sieger, 12 Zweite, 8 beste Dritte (Platzhalter). */
  const roundOf32: BracketMatch[] = [
    // Obere Hälfte
    m(1, projected("A", 0), third("C/E/F")),
    m(2, projected("K", 0), projected("F", 1)),
    m(3, projected("E", 0), third("A/B/D")),
    m(4, projected("G", 1), projected("I", 1)),
    m(5, projected("C", 0), third("E/H/I")),
    m(6, projected("A", 1), projected("B", 1)),
    m(7, projected("I", 0), projected("D", 1)),
    m(8, projected("G", 0), third("J/K/L")),
    // Untere Hälfte
    m(9, projected("B", 0), third("D/G/I")),
    m(10, projected("E", 1), projected("H", 1)),
    m(11, projected("F", 0), third("A/C/H")),
    m(12, projected("J", 1), projected("K", 1)),
    m(13, projected("D", 0), third("B/F/K")),
    m(14, projected("J", 0), projected("L", 1)),
    m(15, projected("H", 0), third("E/G/L")),
    m(16, projected("L", 0), projected("C", 1)),
  ];

  const roundOf16 = nextRound(roundOf32, 17);
  const quarter = nextRound(roundOf16, 25);
  const semi = nextRound(quarter, 29);
  const final: BracketMatch[] = [
    m(31, { kind: "tbd", label: "Sieger HF 1" }, { kind: "tbd", label: "Sieger HF 2" }),
  ];

  return [
    { title: "Sechzehntelfinale", dates: "28. Juni – 3. Juli", matches: roundOf32 },
    { title: "Achtelfinale", dates: "4. – 7. Juli", matches: roundOf16 },
    { title: "Viertelfinale", dates: "9. – 11. Juli", matches: quarter },
    { title: "Halbfinale", dates: "14. – 15. Juli", matches: semi },
    { title: "Finale", dates: "19. Juli", matches: final },
  ];
}

const columnVariants: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function SlotLine({ slot, accent }: { slot: Slot; accent: "volt" | "azure" }) {
  if (slot.kind === "team") {
    const team = teamByCode(slot.code);
    return (
      <div className="flex min-h-6 items-center gap-2">
        <TeamCrest code={slot.code} size="sm" />
        <span className="truncate text-sm font-semibold text-zinc-200">
          {team.name}
        </span>
        <span
          className={cn(
            "ml-auto shrink-0 font-mono text-[10px] tabular-nums",
            accent === "volt" ? "text-volt-400" : "text-azure-400"
          )}
        >
          {slot.code}
        </span>
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
  return (
    <div
      className={cn(
        "card p-3 transition-colors duration-200",
        isFinal
          ? "border-gold-400/40 bg-gradient-to-b from-gold-400/10 to-transparent hover:border-gold-400/70"
          : "hover:border-pitch-700"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "font-mono text-[10px] uppercase tracking-wider",
            isFinal ? "font-bold text-gold-400" : "text-zinc-600"
          )}
        >
          {isFinal ? "Finale" : `Spiel ${match.no}`}
        </span>
        {isFinal && (
          <Trophy className="h-4 w-4 text-gold-400" aria-hidden="true" />
        )}
      </div>
      <SlotLine slot={match.home} accent="volt" />
      <div className="my-2 h-px bg-line" aria-hidden="true" />
      <SlotLine slot={match.away} accent="azure" />
      {isFinal && (
        <p className="mt-3 border-t border-gold-400/20 pt-2.5 font-mono text-[11px] text-gold-400/90">
          19. Juli 2026 · MetLife Stadium
        </p>
      )}
    </div>
  );
}

export default function Bracket() {
  const { standings, source, loading } = useWmData();
  const rounds = useMemo(() => buildRounds(standings), [standings]);

  if (loading) {
    return (
      <div className="flex gap-5 overflow-hidden" aria-busy="true" aria-label="Turnierbaum wird geladen">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[60vh] w-56 shrink-0 sm:w-60" />
        ))}
      </div>
    );
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
        <Pill tone={source === "live" ? "volt" : "azure"}>
          {source === "live" ? "Projektion · Live-Tabellen" : "Projektion · Demo-Daten"}
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
                    <MatchCard key={match.no} match={match} isFinal={isFinalRound} />
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
        Projizierte Paarungen auf Basis der aktuellen Gruppentabellen. Die acht
        besten Gruppendritten werden nach dem 3. Spieltag zugelost.
      </motion.p>
    </div>
  );
}
