import { BarChart3 } from "lucide-react";
import type { Match } from "../../data/wm";
import { Card, StatBar, TeamCrest } from "../ui";
import { cn } from "../../lib/utils";

/* ---------------------------------------------------------------- */
/*  Vollständige Spielstatistik als StatBar-Liste                    */
/* ---------------------------------------------------------------- */

const fmtPct = (v: number) => `${v} %`;

export function MatchStatsPanel({ match, className }: { match: Match; className?: string }) {
  const stats = match.stats;

  if (!stats) {
    return (
      <Card className={cn("p-6 text-center sm:p-8", className)}>
        <BarChart3 className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
        <p className="mt-3 font-display text-sm font-extrabold text-zinc-200">
          Noch keine Statistiken
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Detaillierte Spielstatistiken sind ab Anstoß verfügbar.
        </p>
      </Card>
    );
  }

  // Nur verfügbare Werte anzeigen – die Live-API liefert z. B. kein xG.
  const rows = (
    [
      { label: "Ballbesitz", values: stats.possession, format: fmtPct },
      { label: "Schüsse", values: stats.shots },
      { label: "Schüsse aufs Tor", values: stats.shotsOnTarget },
      { label: "Geblockte Schüsse", values: stats.blockedShots },
      { label: "Ecken", values: stats.corners },
      { label: "Flanken", values: stats.crosses },
      { label: "Abseits", values: stats.offsides },
      { label: "Pässe", values: stats.passes },
      { label: "Passquote", values: stats.passAccuracy, format: fmtPct },
      { label: "Zweikämpfe", values: stats.tackles },
      { label: "Abgefangene Bälle", values: stats.interceptions },
      { label: "Klärungen", values: stats.clearances },
      { label: "Paraden", values: stats.saves },
      { label: "Fouls", values: stats.fouls },
      { label: "Gelbe Karten", values: stats.yellowCards },
      { label: "Rote Karten", values: stats.redCards },
    ] as { label: string; values?: [number, number]; format?: (v: number) => string }[]
  ).filter((r): r is { label: string; values: [number, number]; format?: (v: number) => string } =>
    r.values !== undefined
  );

  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <TeamCrest code={match.homeCode} size="sm" decorative={false} />
        <p className="font-display text-sm font-extrabold tracking-tight text-zinc-100">
          Spielstatistik
        </p>
        <TeamCrest code={match.awayCode} size="sm" decorative={false} />
      </div>
      <div className="space-y-4 sm:space-y-5">
        {rows.map((row) => (
          <StatBar
            key={row.label}
            label={row.label}
            home={row.values[0]}
            away={row.values[1]}
            format={row.format}
          />
        ))}
      </div>
    </Card>
  );
}
