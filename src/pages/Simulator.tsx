import { useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, LoaderCircle, Medal, Play, Swords, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { teamByCode } from "../data/wm";
import { Card, Pill, SectionHeader, TeamCrest } from "../components/ui";
import { useWmData } from "../lib/useWmData";
import { simulateTournament } from "../lib/simulate";
import type { SimResult } from "../lib/simulate";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/*  Turnier-Simulator: Monte-Carlo-Läufe über das gesamte WM-Feld      */
/* ------------------------------------------------------------------ */

const RUN_OPTIONS = [1000, 10000] as const;

const fmtPct = (v: number) =>
  `${v.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} %`;

function topEntries(rec: Record<string, number>, count: number) {
  return Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);
}

/** Animierte Balkenzeile: Crest + Name + Balken + Prozent. */
function ResultRow({
  code,
  pct,
  max,
  index,
  barClass,
}: {
  code: string;
  pct: number;
  max: number;
  index: number;
  barClass: string;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.05 }}
      className="flex items-center gap-2 sm:gap-3"
    >
      <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500">
        {index + 1}
      </span>
      <TeamCrest code={code} size="sm" />
      <span className="w-20 shrink-0 truncate text-sm font-medium text-zinc-200 sm:w-28">
        {teamByCode(code).name}
      </span>
      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-pitch-800">
        <motion.div
          className={cn("h-full rounded-full", barClass)}
          initial={{ width: 0 }}
          animate={{ width: `${max > 0 ? (pct / max) * 100 : 0}%` }}
          transition={{ duration: 0.55, ease: "easeOut", delay: index * 0.05 + 0.1 }}
        />
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-zinc-200 sm:w-16 sm:text-sm">
        {fmtPct(pct)}
      </span>
    </motion.li>
  );
}

/** Kleinere Nebenkarte (Finalteilnahme / Halbfinale, Top 5). */
function SideCard({
  title,
  icon: Icon,
  iconClass,
  data,
  barClass,
}: {
  title: string;
  icon: LucideIcon;
  iconClass: string;
  data: Record<string, number>;
  barClass: string;
}) {
  const rows = topEntries(data, 5);
  const max = rows.length > 0 ? rows[0][1] : 0;
  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wider text-zinc-100">
        <Icon className={cn("h-4 w-4", iconClass)} aria-hidden="true" />
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {rows.map(([code, pct], i) => (
          <ResultRow
            key={code}
            code={code}
            pct={pct}
            max={max}
            index={i}
            barClass={barClass}
          />
        ))}
      </ul>
    </Card>
  );
}

export default function Simulator() {
  // Lädt Gruppen/Teams aus der Live-API, damit die Simulation auf der
  // echten Gruppenauslosung rechnet (Fallback: Demo-Auslosung).
  const { source, loading } = useWmData();
  const [runs, setRuns] = useState<number>(10000);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [simId, setSimId] = useState(0);

  const start = () => {
    if (running) return;
    setRunning(true);
    // Simulation aus dem Render-Tick lösen, damit der Spinner sichtbar wird
    window.setTimeout(() => {
      const res = simulateTournament(runs);
      setResult(res);
      setSimId((id) => id + 1);
      setRunning(false);
    }, 80);
  };

  const champions = result ? topEntries(result.championPct, 10) : [];
  const championMax = champions.length > 0 ? champions[0][1] : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <p className="label-caps">KI-Simulator</p>
          {!loading && (
            <Pill tone={source === "live" ? "volt" : "neutral"}>
              {source === "live" ? "Echte Gruppenauslosung" : "Demo-Auslosung"}
            </Pill>
          )}
        </div>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-zinc-50 sm:text-4xl">
          Turnier-Simulator
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Der Monte-Carlo-Simulator spielt die komplette WM 2026 tausendfach
          durch – von der Gruppenphase bis zum Finale. Aus den Team-Ratings
          entstehen Wahrscheinlichkeiten für Titel, Finale und Halbfinale.
        </p>
      </motion.div>

      {/* Steuerung */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
      >
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <p className="label-caps mb-2">Simulationsläufe</p>
            <div
              className="flex rounded-xl border border-line bg-pitch-850 p-1 sm:inline-flex"
              role="group"
              aria-label="Anzahl der Simulationsläufe"
            >
              {RUN_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={running}
                  onClick={() => setRuns(option)}
                  aria-pressed={runs === option}
                  className={cn(
                    "min-h-11 flex-1 cursor-pointer rounded-lg px-5 font-mono text-sm tabular-nums transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-400 disabled:cursor-not-allowed sm:flex-none",
                    runs === option
                      ? "bg-pitch-700 font-semibold text-zinc-50"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  {option.toLocaleString("de-DE")}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={start}
            disabled={running || loading}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-volt-400 px-6 font-display text-sm font-extrabold uppercase tracking-wider text-pitch-950 transition-colors duration-200 hover:bg-volt-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Simuliere …
              </>
            ) : (
              <>
                <Play className="h-4 w-4" aria-hidden="true" />
                Simulation starten
              </>
            )}
          </button>
        </Card>
      </motion.div>

      {/* Ergebnis bzw. Empty-State */}
      {result ? (
        <div key={simId} className="space-y-6">
          <section>
            <SectionHeader
              title="Titelwahrscheinlichkeit"
              hint={`Top 10 nach ${result.runs.toLocaleString("de-DE")} simulierten Turnieren`}
            />
            <Card className="p-4 sm:p-5">
              <ul className="space-y-3">
                {champions.map(([code, pct], i) => (
                  <ResultRow
                    key={code}
                    code={code}
                    pct={pct}
                    max={championMax}
                    index={i}
                    barClass="bg-gradient-to-r from-volt-600 to-volt-400"
                  />
                ))}
              </ul>
            </Card>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <SideCard
              title="Finalteilnahme %"
              icon={Trophy}
              iconClass="text-gold-400"
              data={result.finalistPct}
              barClass="bg-gradient-to-r from-azure-500 to-azure-400"
            />
            <SideCard
              title="Halbfinale %"
              icon={Medal}
              iconClass="text-azure-400"
              data={result.semifinalPct}
              barClass="bg-gradient-to-r from-zinc-600 to-zinc-400"
            />
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.16 }}
        >
          <Card className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center sm:px-6 sm:py-16">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-volt-400/10">
              <BrainCircuit className="h-7 w-7 text-volt-400" aria-hidden="true" />
            </span>
            <p className="font-display text-base font-extrabold text-zinc-100">
              Noch keine Simulation gestartet
            </p>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              Wähle die Anzahl der Läufe und starte die Monte-Carlo-Simulation,
              um Titelchancen für alle 48 Teams zu berechnen.
            </p>
            <span className="mt-1 flex items-center gap-1.5 text-xs text-zinc-600">
              <Swords className="h-3.5 w-3.5" aria-hidden="true" />
              103 Spiele pro Turnierlauf
            </span>
          </Card>
        </motion.div>
      )}

      <p className="text-center text-xs text-zinc-600">
        Statistisches Modell auf Basis simulierter Team-Ratings
      </p>
    </div>
  );
}
