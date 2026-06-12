import type { Match, Venue } from "../data/wm";

/** Klassen-Joiner (leichtgewichtige clsx-Alternative). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Anstoßzeit in der Zeitzone des Stadions (null, wenn Zeitzone unbekannt). */
export function kickoffLocal(match: Match, venue: Venue): string | null {
  if (!venue.timeZone) return null;
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: venue.timeZone,
  }).format(new Date(match.kickoff));
}

/** Anstoßzeit in der Zeitzone des Nutzers. */
export function kickoffUser(match: Match): string {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(match.kickoff));
}

/** Datum kompakt, z. B. "Fr., 12. Juni". */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

/** Relative Zeit für News, z. B. "vor 2 Std.". */
export function timeAgo(iso: string, now = new Date("2026-06-12T20:00:00Z")): string {
  const diffMin = Math.max(1, Math.round((now.getTime() - new Date(iso).getTime()) / 60000));
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const h = Math.round(diffMin / 60);
  if (h < 24) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} Tagen`;
}

/** Nutzer-Zeitzone (Anzeige). */
export function userTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
}
