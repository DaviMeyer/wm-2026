import type { GoalEvent, Match, MomentumPoint, PlayAction, PlayActionType, Venue } from "../data/wm";

/** Klassen-Joiner (leichtgewichtige clsx-Alternative). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Gewicht einer Einzelaktion fürs Momentum. Torgefahr zählt am stärksten,
 * Ballbesitz-/Territoriumssignale (Ecke, Offside) weniger, Fouls/Karten
 * bremsen minimal (Spielunterbrechung, kein Angriffsdruck).
 */
const ACTION_WEIGHT: Record<PlayActionType, number> = {
  goal: 60,
  shotOnTarget: 26,
  shotOffTarget: 14,
  corner: 10,
  offside: 6,
  foul: 3,
  card: 4,
  other: 0,
};

/**
 * Berechnet das "Attack Momentum" aus echtem ESPN-Play-by-Play. Jede reale
 * Aktion (Schuss, Ecke, Tor, Foul …) erzeugt eine zeitlich lokalisierte Welle
 * Richtung ausführendem Team; die gewichtete Summe pro Minute ergibt die Kurve.
 * Kein künstliches Rauschen – die Ausschläge stammen ausschließlich aus echten
 * Ereignissen.
 *
 * Fallback: Liegen (noch) keine Plays vor, wird aus Toren + Ballbesitz
 * geschätzt (grobe Näherung, bis das Play-by-Play geladen ist).
 */
export function deriveMomentum(match: Match, plays?: PlayAction[]): MomentumPoint[] {
  const goals = match.goals ?? [];
  const lastGoal = goals.reduce((mx, g) => Math.max(mx, g.minute), 0);
  const lastPlay = (plays ?? []).reduce((mx, p) => Math.max(mx, p.minute), 0);
  // Live ohne bekannte Minute (z. B. displayClock "HT"): Obergrenze aus den
  // letzten realen Aktionen ableiten, statt fix 90' zu zeichnen (sonst ~45'
  // leere Balken zur Halbzeit). match.minute === 0 bleibt gültig (?? statt ||).
  const baseMinute =
    match.status === "live" ? (match.minute ?? Math.max(lastPlay, lastGoal, 1)) : 90;
  const upTo = Math.min(120, Math.max(baseMinute, lastGoal, lastPlay, 1));

  if (plays && plays.length > 0) return momentumFromPlays(plays, upTo);
  return momentumFromGoals(goals, match, upTo);
}

/** Momentum aus echten Play-by-Play-Aktionen (bevorzugter Pfad). */
function momentumFromPlays(plays: PlayAction[], upTo: number): MomentumPoint[] {
  const points: MomentumPoint[] = [];
  for (let m = 1; m <= upTo; m++) {
    let v = 0;
    for (const p of plays) {
      const w = ACTION_WEIGHT[p.type];
      if (w === 0) continue;
      const sign = p.team === "home" ? 1 : -1;
      const d = m - p.minute;
      // Fouls/Karten bremsen die Seite, die sie begeht; Angriffsaktionen treiben an.
      const dir = p.type === "foul" || p.type === "card" ? -sign : sign;
      v += dir * w * Math.exp(-(d * d) / 18); // schmale Welle (σ≈3')
    }
    points.push({ minute: m, value: Math.max(-95, Math.min(95, Math.round(v))) });
  }
  return points;
}

/** Fallback: grobe Schätzung aus Toren + Ballbesitz (bis Plays geladen sind). */
function momentumFromGoals(goals: GoalEvent[], match: Match, upTo: number): MomentumPoint[] {
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

/**
 * Feste Turnier-Referenzzone (US-Ostküste). Spieltage („Heute", Tages-
 * gruppierung) werden hieran ausgerichtet, damit ein zusammenhängender
 * US-Spieltag – unabhängig von der Zeitzone des Nutzers – als EIN Tag zählt.
 * Anstoßzeiten selbst zeigen wir weiterhin in der Zeitzone des Nutzers.
 */
export const TOURNAMENT_TZ = "America/New_York";

/** Sortierbarer Tages-Schlüssel (YYYY-MM-DD) in der Turnier-Referenzzone. */
export function tournamentDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TOURNAMENT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
