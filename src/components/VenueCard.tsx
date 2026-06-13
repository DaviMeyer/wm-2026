import { Clock, MapPin, Users } from "lucide-react";
import type { Match } from "../data/wm";
import { venueById } from "../data/wm";
import { kickoffLocal, kickoffUser, userTimeZone, cn } from "../lib/utils";

/**
 * Stadion-Infokarte: Venue, Stadt, Kapazität sowie Anstoßzeit
 * in Ortszeit des Stadions vs. Zeitzone des Nutzers.
 */
export function VenueCard({
  match,
  className,
}: {
  match: Match;
  className?: string;
}) {
  const venue = venueById(match.venueId);
  const local = kickoffLocal(match, venue);
  const flagTone =
    ({
      USA: "text-azure-400",
      Kanada: "text-signal-400",
      Mexiko: "text-volt-400",
    } as Record<string, string>)[venue.country] ?? "text-zinc-400";

  return (
    <div className={cn("card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-extrabold text-zinc-100" title={venue.stadium}>
            {venue.stadium}
          </p>
          <p className={cn("mt-0.5 flex min-w-0 items-center gap-1 text-xs font-medium", flagTone)}>
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {[venue.city, venue.country].filter(Boolean).join(" · ") || "Ort folgt"}
            </span>
          </p>
        </div>
        {venue.capacity > 0 && (
          <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-zinc-500">
            <Users className="h-3 w-3" aria-hidden="true" />
            {venue.capacity.toLocaleString("de-DE")}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
        <div className="min-w-0">
          <p className="label-caps">Ortszeit</p>
          <p className="mt-0.5 flex items-center gap-1.5 font-mono text-sm text-zinc-200">
            <Clock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
            {local ? `${local} Uhr` : "folgt"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="label-caps">Deine Zeit</p>
          <p className="mt-0.5 font-mono text-sm text-zinc-200" title={userTimeZone()}>
            {kickoffUser(match)} Uhr
          </p>
        </div>
      </div>
    </div>
  );
}
