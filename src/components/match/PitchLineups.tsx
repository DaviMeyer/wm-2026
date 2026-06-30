import { Clock3 } from "lucide-react";
import type { Match, PlayerSlot } from "../../data/wm";
import { teamByCode } from "../../data/wm";
import { Card, Skeleton, TeamCrest } from "../ui";
import { cn } from "../../lib/utils";

/* ---------------------------------------------------------------- */
/*  Taktisches Spielfeld im FotMob-Stil: beide Elfen auf einem       */
/*  vertikalen Rasen – Heimteam unten, Gastteam oben (gespiegelt).   */
/* ---------------------------------------------------------------- */

function PlayerDot({ player, side }: { player: PlayerSlot; side: "home" | "away" }) {
  // Heim spielt von unten nach oben, Gast gespiegelt von oben nach unten.
  const top = side === "home" ? 95.5 - player.y * 0.45 : 3.5 + player.y * 0.45;
  const left = side === "home" ? player.x : 100 - player.x;
  return (
    <div
      className="absolute flex w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center sm:w-16"
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <span
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold shadow-md ring-2 ring-black/30",
          side === "home" ? "bg-volt-400 text-pitch-950" : "bg-azure-400 text-pitch-950"
        )}
      >
        {player.number}
      </span>
      <span
        className="mt-1 max-w-full truncate text-[10px] font-medium text-white/90"
        style={{ textShadow: "0 1px 2px rgb(0 0 0 / 0.8)" }}
      >
        {player.name}
      </span>
    </div>
  );
}

export function PitchLineups({ match, className }: { match: Match; className?: string }) {
  const home = teamByCode(match.homeCode);
  const away = teamByCode(match.awayCode);
  const lineups = match.lineups;

  if (!lineups) {
    const isOver = match.status === "finished";
    return (
      <Card className={cn("p-6 sm:p-8", className)}>
        <div className="text-center">
          <Clock3 className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
          <p className="mt-3 font-display text-sm font-extrabold text-zinc-200">
            {isOver
              ? "Keine Aufstellungen verfügbar"
              : "Aufstellungen folgen ~60 Min. vor Anstoß"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {isOver
              ? "Für diese Partie wurden keine Aufstellungsdaten veröffentlicht."
              : "Sobald beide Teams offiziell gemeldet sind, erscheint hier das taktische Feld."}
          </p>
        </div>
        {!isOver && (
          <div className="mx-auto mt-6 max-w-sm space-y-3" aria-hidden="true">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="aspect-[10/9] w-full" />
            <Skeleton className="h-8 w-1/2" />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn("p-4 sm:p-6", className)}>
      {/* Formationen */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span className="flex min-w-0 items-center gap-2">
          <TeamCrest code={home.code} size="sm" />
          <span className="truncate text-sm font-semibold text-zinc-200">{home.name}</span>
        </span>
        <span className="font-mono text-sm font-bold text-zinc-300">
          {lineups.home.formation} <span className="font-medium text-zinc-600">vs</span>{" "}
          {lineups.away.formation}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-200">{away.name}</span>
          <TeamCrest code={away.code} size="sm" />
        </span>
      </div>

      {/* Spielfeld */}
      <div
        className="relative mx-auto aspect-[10/14] w-full max-w-sm overflow-hidden rounded-2xl ring-1 ring-white/10"
        style={{
          background: "linear-gradient(180deg, #0c2417 0%, #123524 48%, #0c2417 100%)",
        }}
        role="group"
        aria-label={`Aufstellung ${home.name} (${lineups.home.formation}) gegen ${away.name} (${lineups.away.formation})`}
      >
        {/* Rasenstreifen */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgb(255 255 255 / 0.025) 0 7.15%, transparent 7.15% 14.3%)",
          }}
          aria-hidden="true"
        />
        {/* Mittellinie + Mittelkreis */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" aria-hidden="true" />
        <div
          className="absolute left-1/2 top-1/2 h-[22%] w-[31%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"
          aria-hidden="true"
        />
        <div
          className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25"
          aria-hidden="true"
        />
        {/* Strafräume + Fünfmeterräume */}
        <div className="absolute left-1/2 top-0 h-[13%] w-[58%] -translate-x-1/2 border border-t-0 border-white/15" aria-hidden="true" />
        <div className="absolute left-1/2 top-0 h-[5.5%] w-[28%] -translate-x-1/2 border border-t-0 border-white/15" aria-hidden="true" />
        <div className="absolute bottom-0 left-1/2 h-[13%] w-[58%] -translate-x-1/2 border border-b-0 border-white/15" aria-hidden="true" />
        <div className="absolute bottom-0 left-1/2 h-[5.5%] w-[28%] -translate-x-1/2 border border-b-0 border-white/15" aria-hidden="true" />

        {/* Team-Kürzel als Orientierung */}
        <span className="absolute left-2 top-2 rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-azure-400">
          {away.code}
        </span>
        <span className="absolute bottom-2 left-2 rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-volt-400">
          {home.code}
        </span>

        {lineups.away.players.map((p, i) => (
          <PlayerDot key={`a-${i}-${p.number}`} player={p} side="away" />
        ))}
        {lineups.home.players.map((p, i) => (
          <PlayerDot key={`h-${i}-${p.number}`} player={p} side="home" />
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-zinc-500">
        Zahl = Trikotnummer · offizielle Startaufstellung
      </p>
    </Card>
  );
}
