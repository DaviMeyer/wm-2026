import { useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronsLeftRight } from "lucide-react";
import { GROUPS, teamByCode } from "../data/wm";
import type { StandingRow } from "../data/wm";
import { FormDots, Pill, Skeleton, TeamCrest } from "../components/ui";
import { useWmData } from "../lib/useWmData";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/*  Tabellen – alle 12 Gruppen mit Filter, Quali-Markierung & Form     */
/* ------------------------------------------------------------------ */

const gridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

/** Sortierung: offizieller API-Rang, sonst Punkte, Tordifferenz, Tore. */
function sortRows(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort(
    (a, b) =>
      (a.rank ?? 99) - (b.rank ?? 99) ||
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor
  );
}

function diffLabel(row: StandingRow): string {
  const d = row.goalsFor - row.goalsAgainst;
  return d > 0 ? `+${d}` : String(d);
}

/** Farbmarker je Tabellenplatz: 1–2 volt (weiter), 3 gold (mögl. Dritter), 4 neutral. */
const POS_MARKER = ["bg-volt-400", "bg-volt-400", "bg-gold-400", "bg-pitch-700"];

function GroupTable({ group, allRows }: { group: string; allRows: StandingRow[] }) {
  const rows = sortRows(allRows);
  return (
    <motion.section
      variants={cardVariants}
      className="card min-w-0 overflow-hidden"
      aria-label={`Tabelle Gruppe ${group}`}
    >
      <header className="flex items-baseline justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-base font-extrabold tracking-tight text-zinc-50">
          Gruppe {group}
        </h2>
        <span className="font-mono text-[11px] text-zinc-600">Gruppenphase</span>
      </header>

      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="label-caps py-2.5 pl-4 pr-1 text-left">
                Pos
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-left">
                Team
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-right">
                Sp
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-right">
                S
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-right">
                U
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-right">
                N
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-right">
                Tore
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-right">
                Diff
              </th>
              <th scope="col" className="label-caps px-2 py-2.5 text-right">
                Pkt
              </th>
              <th scope="col" className="label-caps py-2.5 pl-2 pr-4 text-right">
                Form
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const team = teamByCode(row.teamCode);
              return (
                <tr
                  key={row.teamCode}
                  className={cn(
                    "transition-colors duration-200 hover:bg-pitch-850",
                    i < rows.length - 1 && "border-b border-line/60"
                  )}
                >
                  <td className="py-2.5 pl-4 pr-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn("h-5 w-1 shrink-0 rounded-full", POS_MARKER[i])}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-xs tabular-nums text-zinc-500">
                        {i + 1}
                      </span>
                    </span>
                  </td>
                  <th scope="row" className="px-2 py-2.5 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <TeamCrest code={team.code} size="sm" />
                      <span
                        className={cn(
                          "truncate text-sm font-semibold",
                          i < 2 ? "text-zinc-100" : "text-zinc-400"
                        )}
                      >
                        {team.name}
                      </span>
                    </span>
                  </th>
                  <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-400">
                    {row.played}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-400">
                    {row.won}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-400">
                    {row.drawn}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-400">
                    {row.lost}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-zinc-400">
                    {row.goalsFor}:{row.goalsAgainst}
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 text-right font-mono text-xs tabular-nums",
                      row.goalsFor - row.goalsAgainst > 0
                        ? "text-volt-400"
                        : row.goalsFor - row.goalsAgainst < 0
                          ? "text-signal-400"
                          : "text-zinc-400"
                    )}
                  >
                    {diffLabel(row)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-zinc-50">
                    {row.points}
                  </td>
                  <td className="py-2.5 pl-2 pr-4 text-right">
                    <FormDots form={team.form} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

export default function Standings() {
  const [filter, setFilter] = useState<string>("Alle");
  const { standings, source, loading } = useWmData();
  const visibleGroups = (filter === "Alle" ? GROUPS : [filter]).filter(
    (g) => (standings[g] ?? []).length > 0
  );

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Tabellen werden geladen">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-64" />
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
            Gruppentabellen
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Alle 12 Gruppen der WM 2026</p>
        </div>
        <Pill tone={source === "live" ? "volt" : "neutral"}>
          {source === "live" ? "Live-Daten · ESPN" : "Demo-Daten"}
        </Pill>
      </motion.header>

      {/* Gruppen-Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.08, ease: "easeOut" }}
        className="mb-6 flex gap-2 overflow-x-auto overscroll-x-contain py-1 sm:flex-wrap sm:overflow-x-visible sm:py-0"
        role="group"
        aria-label="Gruppen filtern"
      >
        {["Alle", ...GROUPS].map((g) => {
          const active = filter === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setFilter(g)}
              aria-pressed={active}
              className={cn(
                "min-h-11 min-w-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm font-semibold transition-colors duration-200",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-400",
                active
                  ? "border-volt-400 bg-volt-400 text-pitch-950"
                  : "border-line bg-pitch-900/80 text-zinc-400 hover:border-pitch-700 hover:text-zinc-200"
              )}
            >
              {g}
            </button>
          );
        })}
      </motion.div>

      {/* Hinweis auf horizontale Scrollbarkeit der Tabellen (nur schmale Screens) */}
      {visibleGroups.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="mb-3 flex items-center gap-1.5 text-xs text-zinc-600 sm:hidden"
        >
          <ChevronsLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
          Tabelle horizontal scrollen für alle Spalten
        </motion.p>
      )}

      {/* Gruppen-Grid mit gestaffelten Reveals */}
      <motion.div
        key={filter}
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 lg:grid-cols-2"
      >
        {visibleGroups.map((g) => (
          <GroupTable key={g} group={g} allRows={standings[g]} />
        ))}
      </motion.div>

      {/* Legende */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mt-5 flex flex-col gap-2 text-xs text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2"
      >
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-volt-400" aria-hidden="true" />
          Platz 1–2: direkt in der K.-o.-Runde (32er-Runde)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-gold-400" aria-hidden="true" />
          Platz 3: möglicher bester Gruppendritter
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-pitch-700" aria-hidden="true" />
          Platz 4: Ausscheiden droht
        </span>
      </motion.div>
    </div>
  );
}
