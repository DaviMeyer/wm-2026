import type { GoalEvent, Match, MomentumPoint, Venue } from "../data/wm";

/** Klassen-Joiner (leichtgewichtige clsx-Alternative). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Schätzt ein "Attack Momentum" aus echten Spieldaten – die ESPN-API liefert
 * keine fertige Momentum-Kurve. Tore erzeugen zeitlich lokalisierte Wellen
 * Richtung erzielendem Team, der Ballbesitz gibt eine konstante Grundtendenz,
 * dezentes deterministisches Rauschen macht die Kurve lebendig. Das Ergebnis
 * ist bewusst eine Schätzung (im Chart als solche gekennzeichnet).
 */
export function deriveMomentum(goals: GoalEvent[], match: Match): MomentumPoint[] {
  const lastGoal = goals.reduce((mx, g) => Math.max(mx, g.minute), 0);
  const baseMinute = match.status === "live" && match.minute ? match.minute : 90;
  const upTo = Math.min(120, Math.max(baseMinute, lastGoal, 1));

  const poss = match.stats?.possession;
  const baseline = poss ? (poss[0] - poss[1]) * 0.4 : 0; // >0 = Heim am Ball

  const points: MomentumPoint[] = [];
  for (let m = 1; m <= upTo; m++) {
    let v = baseline;
    for (const g of goals) {
      const sign = g.team === "home" ? 1 : -1;
      const d = m - g.minute;
      v += sign * 78 * Math.exp(-(d * d) / 98); // Welle um die Tor-Minute (σ≈7')
    }
    v += (((m * 7919) % 23) - 11) * 0.55; // deterministisches Rauschen
    points.push({ minute: m, value: Math.max(-95, Math.min(95, Math.round(v))) });
  }
  return points;
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
export function timeAgo(iso: string, now = new Date()): string {
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
