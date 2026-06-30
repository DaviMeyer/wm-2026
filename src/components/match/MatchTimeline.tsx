import { useMemo, useState } from "react";
import { ArrowLeftRight, Clock3, Goal } from "lucide-react";
import type { Match, MatchEvent, MatchEventType } from "../../data/wm";
import { teamByCode } from "../../data/wm";
import { Card, Skeleton, TeamCrest } from "../ui";
import { useMatchEvents } from "../../lib/useWmData";
import { cn } from "../../lib/utils";

/* ---------------------------------------------------------------- */
/*  Spielverlauf – Ereignis-Zeitstrahl (Tore, Karten, Wechsel,       */
/*  Fouls) mit Minute. Heim links, Auswärts rechts an einer          */
/*  gemeinsamen Zeitachse. Alle Daten live aus der ESPN-API.         */
/* ---------------------------------------------------------------- */

type Filter = "alle" | "hoehepunkte" | "fouls";

const HIGHLIGHT: MatchEventType[] = ["goal", "yellow", "red", "yellowred", "sub"];

const TYPE_LABEL: Record<MatchEventType, string> = {
  goal: "Tor",
  yellow: "Gelbe Karte",
  red: "Rote Karte",
  yellowred: "Gelb-Rote Karte",
  sub: "Wechsel",
  foul: "Foul",
};

/** Symbol je Ereignistyp; Karten als farbige Rechtecke in Kartenoptik. */
function EventGlyph({ type, side }: { type: MatchEventType; side: "home" | "away" }) {
  const accent = side === "home" ? "text-volt-400" : "text-azure-400";
  if (type === "goal") return <Goal className={cn("h-4 w-4 shrink-0", accent)} aria-hidden="true" />;
  if (type === "sub")
    return <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />;
  if (type === "foul")
    return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" aria-hidden="true" />;
  const cards =
    type === "yellowred"
      ? ["bg-gold-400", "bg-signal-400"]
      : type === "red"
        ? ["bg-signal-400"]
        : ["bg-gold-400"];
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
      {cards.map((c, i) => (
        <span key={i} className={cn("h-3.5 w-2.5 rounded-[2px]", c)} />
      ))}
    </span>
  );
}

function EventRow({ event }: { event: MatchEvent }) {
  const isHome = event.team === "home";
  const subline =
    event.type === "sub" && event.playerOut
      ? `für ${event.playerOut}`
      : event.type === "goal" || event.type === "foul"
        ? TYPE_LABEL[event.type]
        : null;

  const chip = (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        isHome ? "flex-row-reverse text-right" : "text-left"
      )}
    >
      <EventGlyph type={event.type} side={event.team} />
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">{event.player ?? TYPE_LABEL[event.type]}</p>
        {subline && <p className="truncate text-[11px] text-zinc-500">{subline}</p>}
      </div>
    </div>
  );

  return (
    <li className="grid grid-cols-[1fr_3rem_1fr] items-center gap-2">
      <div className="flex min-w-0 justify-end">{isHome && chip}</div>
      <div className="flex justify-center">
        <span className="rounded-full bg-pitch-850 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-zinc-400 ring-1 ring-line">
          {event.clockLabel}
        </span>
      </div>
      <div className="flex min-w-0 justify-start">{!isHome && chip}</div>
    </li>
  );
}

/** Kompakte Team-Bilanz: Tore · Karten · Fouls. */
function Tally({
  code,
  side,
  events,
  align,
}: {
  code: string;
  side: "home" | "away";
  events: MatchEvent[];
  align: "start" | "end";
}) {
  const team = teamByCode(code);
  const n = (types: MatchEventType[]) =>
    events.filter((e) => e.team === side && types.includes(e.type)).length;
  const goals = n(["goal"]);
  const cards = n(["yellow", "red", "yellowred"]);
  const fouls = n(["foul"]);
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", align === "end" ? "items-end" : "items-start")}>
      <span className={cn("flex items-center gap-2", align === "end" && "flex-row-reverse")}>
        <TeamCrest code={code} size="sm" />
        <span className="truncate text-sm font-semibold text-zinc-100">{team.name}</span>
      </span>
      <span className="font-mono text-[11px] tabular-nums text-zinc-500">
        {goals} Tore · {cards} Karten · {fouls} Fouls
      </span>
    </div>
  );
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "hoehepunkte", label: "Höhepunkte" },
  { id: "fouls", label: "Fouls" },
];

export function MatchTimeline({ match }: { match: Match }) {
  const { events, loading } = useMatchEvents(match.id, match.status);
  const [filter, setFilter] = useState<Filter>("alle");

  const filtered = useMemo(() => {
    if (filter === "fouls") return events.filter((e) => e.type === "foul");
    if (filter === "hoehepunkte") return events.filter((e) => HIGHLIGHT.includes(e.type));
    return events;
  }, [events, filter]);

  if (match.status === "upcoming") {
    return (
      <Card className="mx-auto max-w-md p-6 text-center sm:p-8">
        <Clock3 className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
        <p className="mt-3 font-display text-sm font-extrabold text-zinc-200">
          Spielverlauf folgt ab Anstoß
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Tore, Karten und Fouls erscheinen hier live mit Spielminute.
        </p>
      </Card>
    );
  }

  if (loading && events.length === 0) {
    return (
      <Card className="mx-auto max-w-2xl space-y-3 p-5 sm:p-6" >
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="mx-auto max-w-md p-6 text-center sm:p-8">
        <Clock3 className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
        <p className="mt-3 font-display text-sm font-extrabold text-zinc-200">
          Keine Verlaufsdaten verfügbar
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Für diese Partie liefert die Datenquelle keinen Ereignis-Verlauf.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl p-5 sm:p-6">
      {/* Team-Bilanz */}
      <div className="grid grid-cols-2 items-start gap-3 border-b border-line pb-5">
        <Tally code={match.homeCode} side="home" events={events} align="start" />
        <Tally code={match.awayCode} side="away" events={events} align="end" />
      </div>

      {/* Filter */}
      <div role="group" aria-label="Ereignisse filtern" className="my-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={cn(
                "min-h-9 cursor-pointer rounded-full border px-3.5 text-xs font-semibold transition-colors duration-200",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt-400",
                active
                  ? "border-volt-400 bg-volt-400 text-pitch-950"
                  : "border-line bg-pitch-900/80 text-zinc-400 hover:border-pitch-700 hover:text-zinc-200"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Zeitstrahl mit Mittelachse */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          Keine Ereignisse in dieser Auswahl.
        </p>
      ) : (
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-line"
            aria-hidden="true"
          />
          <ul className="relative space-y-2.5">
            {filtered.map((e, i) => (
              <EventRow key={`${e.minute}-${e.type}-${e.team}-${i}`} event={e} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
