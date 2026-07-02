import { motion } from "framer-motion";
import { Activity, Sparkles, TrendingUp, Zap } from "lucide-react";
import type { Match } from "../../data/wm";
import { teamByCode } from "../../data/wm";
import { Pill, TeamCrest } from "../ui";
import { CountUp } from "../../lib/useCountUp";
import { cn } from "../../lib/utils";

/* ---------------------------------------------------------------- */
/*  KI-Prognose-Karte: Siegwahrscheinlichkeiten + Schlüsselfaktoren  */
/* ---------------------------------------------------------------- */

const FACTOR_ICONS = [TrendingUp, Activity, Zap] as const;

const CONFIDENCE_TONE = {
  hoch: "volt",
  mittel: "gold",
  niedrig: "signal",
} as const;

export function AIPredictionCard({
  match,
  className,
}: {
  match: Match;
  className?: string;
}) {
  const prediction = match.prediction;
  if (!prediction) return null;

  const home = teamByCode(match.homeCode);
  const away = teamByCode(match.awayCode);

  return (
    <div
      className={cn(
        "rounded-2xl bg-gradient-to-br from-volt-400/40 via-white/[0.07] to-azure-400/40 p-px shadow-[0_0_32px_-12px_rgb(205_245_66/0.25)]",
        className
      )}
    >
      <div className="rounded-[calc(1rem-1px)] bg-pitch-900 p-5">
        {/* Kopfzeile */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wider text-zinc-100">
            <Sparkles className="h-4 w-4 text-volt-400" aria-hidden="true" />
            Markt-Prognose
            {match.status !== "upcoming" && (
              <span className="font-sans text-[10px] font-medium normal-case tracking-normal text-zinc-500">
                · vor Anstoß
              </span>
            )}
          </h3>
          <Pill tone={CONFIDENCE_TONE[prediction.confidence]}>
            Konfidenz: {prediction.confidence}
          </Pill>
        </div>

        {/* Wahrscheinlichkeiten */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <TeamCrest code={home.code} size="sm" />
              <span className="truncate text-xs font-medium text-zinc-300">
                {home.name}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs font-medium text-zinc-300">
                {away.name}
              </span>
              <TeamCrest code={away.code} size="sm" />
            </span>
          </div>

          {/* Remis-Label sitzt über dem grauen Balkensegment (geklemmt,
              damit es nicht mit den Rand-Prozenten kollidiert) */}
          <div className="relative mt-2.5 h-6 font-mono text-sm tabular-nums">
            <span className="absolute left-0 top-0 font-semibold text-volt-400">
              <CountUp value={prediction.home} />&nbsp;%
            </span>
            <span
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-zinc-400"
              style={{
                left: `clamp(5.5rem, ${prediction.home + prediction.draw / 2}%, calc(100% - 5.5rem))`,
              }}
            >
              <span className="label-caps mr-1.5">Remis</span>
              <CountUp value={prediction.draw} />&nbsp;%
            </span>
            <span className="absolute right-0 top-0 font-semibold text-azure-400">
              <CountUp value={prediction.away} />&nbsp;%
            </span>
          </div>

          <div
            className="mt-1.5 flex h-2.5 gap-1 overflow-hidden rounded-full"
            role="img"
            aria-label={`Siegwahrscheinlichkeit: ${home.name} ${prediction.home} Prozent, Remis ${prediction.draw} Prozent, ${away.name} ${prediction.away} Prozent`}
          >
            <motion.div
              className="rounded-full bg-volt-400"
              initial={{ width: 0 }}
              animate={{ width: `${prediction.home}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            />
            <motion.div
              className="rounded-full bg-zinc-600"
              initial={{ width: 0 }}
              animate={{ width: `${prediction.draw}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            />
            <motion.div
              className="rounded-full bg-azure-400"
              initial={{ width: 0 }}
              animate={{ width: `${prediction.away}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            />
          </div>
        </div>

        {/* Zusatzmärkte aus den Buchmacherquoten (falls vorhanden) */}
        {(prediction.overUnder !== undefined || prediction.spread) && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {prediction.overUnder !== undefined && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-pitch-800 px-2.5 py-1 text-xs">
                <span className="label-caps">Ø Tore</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {prediction.overUnder.toLocaleString("de-DE")}
                </span>
              </span>
            )}
            {prediction.spread && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-pitch-800 px-2.5 py-1 text-xs">
                <span className="label-caps">Handicap</span>
                <span className="font-mono font-semibold text-zinc-100">
                  {prediction.spread.teamName} {prediction.spread.line.replace(".", ",")}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Schlüsselfaktoren */}
        <ul className="mt-5 space-y-2.5 border-t border-line pt-4">
          {prediction.keyFactors.map((factor, i) => {
            const Icon = FACTOR_ICONS[i % FACTOR_ICONS.length];
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.35 + i * 0.08 }}
                className="flex items-start gap-2.5 text-sm leading-snug text-zinc-400"
              >
                <Icon
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt-400/80"
                  aria-hidden="true"
                />
                {factor}
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
