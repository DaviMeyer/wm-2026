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

/**
 * Folgerunde: verknüpft die Sieger zweier Vorrunden-Spiele nach offizieller
 * FIFA-Paarung. Die K.-o.-Runde der WM 2026 ist nicht durchgehend sequenziell
 * verschachtelt – ab dem Achtelfinale werden Spiele „über Kreuz" gepaart –,
 * darum nennt `links` die Quell-Spiele (Index in `prev`) je Folgespiel explizit,
 * statt stur benachbarte Sieger zu kombinieren.
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

  /*
   * Offizielles K.-o.-Schema der WM 2026 (FIFA / Wikipedia), Spielnummern 73–104.
   * 16 Sechzehntelfinals: 4× Zweiter–Zweiter, 8× Sieger–Dritter, 4× Sieger–Zweiter.
   * Jeder Gruppensieger und -zweite kommt genau einmal vor; Sieger und Zweiter
   * derselben Gruppe können sich erst im Finale begegnen.
   * Die acht Dritten-Slots tragen je fünf mögliche Gruppen (FIFA-Annex C);
   * welcher Dritte konkret antritt, steht erst nach der Gruppenphase fest.
   */
  const roundOf32: BracketMatch[] = [
    m(73, projected("A", 1), projected("B", 1)), //  2A – 2B
    m(74, projected("E", 0), third("A/B/C/D/F")), // 1E – 3.
    m(75, projected("F", 0), projected("C", 1)), //  1F – 2C
    m(76, projected("C", 0), projected("F", 1)), //  1C – 2F
    m(77, projected("I", 0), third("C/D/F/G/H")), // 1I – 3.
    m(78, projected("E", 1), projected("I", 1)), //  2E – 2I
    m(79, projected("A", 0), third("C/E/F/H/I")), // 1A – 3.
    m(80, projected("L", 0), third("E/H/I/J/K")), // 1L – 3.
    m(81, projected("D", 0), third("B/E/F/I/J")), // 1D – 3.
    m(82, projected("G", 0), third("A/E/H/I/J")), // 1G – 3.
    m(83, projected("K", 1), projected("L", 1)), //  2K – 2L
    m(84, projected("H", 0), projected("J", 1)), //  1H – 2J
    m(85, projected("B", 0), third("E/F/G/I/J")), // 1B – 3.
    m(86, projected("J", 0), projected("H", 1)), //  1J – 2H
    m(87, projected("K", 0), third("D/E/I/J/L")), // 1K – 3.
    m(88, projected("D", 1), projected("G", 1)), //  2D – 2G
  ];

  // Achtelfinale (89–96): die untere Bracket-Hälfte ist umgeordnet –
  // Spiel 93 nimmt z. B. die Sieger aus 83/84, nicht 81/82.
  const roundOf16 = nextRound(roundOf32, [
    { no: 89, a: 0, b: 1 }, //   Sieger 73 – Sieger 74
    { no: 90, a: 2, b: 3 }, //   Sieger 75 – Sieger 76
    { no: 91, a: 4, b: 5 }, //   Sieger 77 – Sieger 78
    { no: 92, a: 6, b: 7 }, //   Sieger 79 – Sieger 80
    { no: 93, a: 10, b: 11 }, // Sieger 83 – Sieger 84
    { no: 94, a: 8, b: 9 }, //   Sieger 81 – Sieger 82
    { no: 95, a: 13, b: 15 }, // Sieger 86 – Sieger 88
    { no: 96, a: 12, b: 14 }, // Sieger 85 – Sieger 87
  ]);

  // Viertelfinale (97–100): ebenfalls über Kreuz verknüpft.
  const quarter = nextRound(roundOf16, [
    { no: 97, a: 0, b: 1 }, //  Sieger 89 – Sieger 90
    { no: 98, a: 4, b: 5 }, //  Sieger 93 – Sieger 94
    { no: 99, a: 2, b: 3 }, //  Sieger 91 – Sieger 92
    { no: 100, a: 6, b: 7 }, // Sieger 95 – Sieger 96
  ]);

  // Halbfinale (101–102) und Finale (104).
  const semi = nextRound(quarter, [
    { no: 101, a: 0, b: 1 }, // Sieger 97 – Sieger 98
    { no: 102, a: 2, b: 3 }, // Sieger 99 – Sieger 100
  ]);
  const final = nextRound(semi, [
    { no: 104, a: 0, b: 1 }, // Sieger 101 – Sieger 102
  ]);

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
