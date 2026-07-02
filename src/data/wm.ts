/* ------------------------------------------------------------------ */
/*  WM 2026 – Datenmodell + statische Referenzdaten                    */
/*  Typen, Team-Stammdaten (deutsche Namen/Vereinsfarben) und Stadien. */
/*  Alle Live-Spiel-, Tabellen- und Verlaufsdaten stammen aus der      */
/*  ESPN-API (siehe lib/api.ts) – es gibt keine Mock-/Demo-Daten mehr. */
/* ------------------------------------------------------------------ */

export interface Team {
  code: string; // FIFA-Trigramm bzw. eindeutiger Platzhalter-Code
  name: string;
  colors: [string, string]; // Primär-/Sekundärfarbe für TeamCrest
  rating: number; // 0–100, Basis für KI-Prognosen & Simulator
  group: string; // "A" … "L"; leer = nicht qualifiziert/Platzhalter
  form: ("S" | "U" | "N")[]; // Sieg/Unentschieden/Niederlage, letzte 5
  short?: string; // Kurzlabel fürs Crest, falls code zu lang (z. B. "3RD")
  /** Echtes Länder-Wappen (ESPN-Logo-URL); fehlt → Farb-Roundel als Fallback. */
  logo?: string;
  /** true = K.-o.-Platzhalter („Sieger Gruppe A", „Sieger Spiel 5"), kein echtes Team. */
  placeholder?: boolean;
}

export interface Venue {
  id: string;
  stadium: string;
  city: string;
  country: string; // "USA" | "Kanada" | "Mexiko" | unbekannt (API)
  capacity: number; // 0 = unbekannt
  timeZone?: string; // IANA; fehlt bei dynamisch registrierten API-Venues
}

export interface PlayerSlot {
  name: string;
  number: number;
  x: number; // 0–100, Position auf dem Spielfeld (horizontal)
  y: number; // 0–100, 0 = eigenes Tor
}

export interface Lineup {
  formation: string;
  players: PlayerSlot[];
}

/** Einzelne Werte können fehlen – die ESPN-API liefert z. B. kein xG. */
export interface MatchStats {
  possession?: [number, number];
  shots?: [number, number];
  shotsOnTarget?: [number, number];
  blockedShots?: [number, number];
  passes?: [number, number];
  passAccuracy?: [number, number];
  crosses?: [number, number];
  corners?: [number, number];
  offsides?: [number, number];
  tackles?: [number, number];
  interceptions?: [number, number];
  clearances?: [number, number];
  saves?: [number, number];
  fouls?: [number, number];
  yellowCards?: [number, number];
  redCards?: [number, number];
}

export interface MomentumPoint {
  minute: number;
  value: number; // -100 … 100, positiv = Heimteam dominiert
}

export interface GoalEvent {
  minute: number; // Spielminute (für Sortierung)
  clockLabel: string; // Anzeige inkl. Nachspielzeit, z. B. "45+2'"
  team: "home" | "away"; // Seite, der das Tor gutgeschrieben wird
  scorer: string; // Name des Torschützen
  penalty?: boolean; // Elfmeter
  ownGoal?: boolean; // Eigentor
}

/**
 * Einzelaktion aus dem ESPN-Play-by-Play (`commentary`) – Basis für das
 * Attack Momentum. Anders als GoalEvent/MatchEvent deckt PlayAction ALLE
 * momentum-relevanten Aktionen ab (Schüsse, Ecken, Fouls, Offside …), jeweils
 * mit Minute und echter Team-Zuordnung aus der API.
 */
export type PlayActionType =
  | "goal"
  | "shotOnTarget"
  | "shotOffTarget"
  | "corner"
  | "offside"
  | "foul"
  | "card"
  | "other";

export interface PlayAction {
  minute: number; // Spielminute aus play.clock
  type: PlayActionType;
  team: "home" | "away";
}

/** Einzelereignis aus dem Spielverlauf (für den Live-Zeitstrahl). */
export type MatchEventType = "goal" | "yellow" | "red" | "yellowred" | "sub" | "foul";

export interface MatchEvent {
  minute: number; // Spielminute (für Sortierung)
  clockLabel: string; // Anzeige inkl. Nachspielzeit, z. B. "45+2'"
  type: MatchEventType;
  team: "home" | "away";
  player?: string; // Hauptbeteiligter (Schütze, verwarnter/foulender Spieler, einwechselnd)
  playerOut?: string; // bei Wechsel: ausgewechselter Spieler
  detail?: string; // Originaltext der Quelle (Kontext)
}

export interface Prediction {
  home: number; // Siegwahrscheinlichkeit in %
  draw: number;
  away: number;
  confidence: "hoch" | "mittel" | "niedrig";
  keyFactors: string[];
  tacticalSummary: string;
  /** Buchmacher-Markt: erwartete Gesamttore (Over/Under-Linie), z. B. 2.5. */
  overUnder?: number;
  /** Buchmacher-Handicap: bevorzugtes Team + Linie, z. B. "ESP -1.5". */
  spread?: { teamName: string; line: string };
}

export type MatchStatus = "live" | "upcoming" | "finished";

/**
 * Turnierrunde (ESPN-`season.slug`). "group-stage" für die Vorrunde, der Rest
 * für die K.-o.-Phase. Bestimmt im K.-o.-Baum, in welche Spalte ein Spiel gehört.
 */
export type MatchRound =
  | "group-stage"
  | "round-of-32"
  | "round-of-16"
  | "quarterfinals"
  | "semifinals"
  | "3rd-place-match"
  | "final";

export interface Match {
  id: string;
  group: string;
  status: MatchStatus;
  kickoff: string; // ISO, UTC
  minute?: number;
  homeCode: string;
  awayCode: string;
  homeScore?: number;
  awayScore?: number;
  venueId: string;
  referee?: string;
  /** Zuschauerzahl (aus ESPN gameInfo.attendance); 0/undefined = unbekannt. */
  attendance?: number;
  /** Offizielle (Schiedsrichter-Team) aus ESPN gameInfo.officials. */
  officials?: { name: string; role: string }[];
  stats?: MatchStats;
  goals?: GoalEvent[];
  lineups?: { home: Lineup; away: Lineup };
  prediction?: Prediction;
  /** Turnierrunde aus der API; fehlt bei Mock-Daten (dann via Gruppe abgeleitet). */
  round?: MatchRound;
  /** K.-o.: Code des Teams, das weiterkam (auch nach Verlängerung/Elfmeterschießen). */
  advancedCode?: string;
  /** Elfmeterschießen: Tore [Heim, Auswärts]; nur gesetzt, wenn es eins gab. */
  shootout?: [number, number];
  /** Kurzhinweis zur Entscheidung, z. B. "Paraguay i. E. 4:3" oder "n. V.". */
  decisionNote?: string;
}

export interface NewsItem {
  id: string;
  category: "Verletzung" | "Taktik" | "Transfer-Buzz" | "Turnier";
  headline: string;
  summary: string;
  timestamp: string;
  teamCode?: string;
  /** Link zum vollständigen Artikel (echte News von ESPN). */
  url?: string;
}

/* ------------------------------- Teams ---------------------------- */

const t = (
  code: string,
  name: string,
  colors: [string, string],
  rating: number,
  group: string,
  form: Team["form"]
): Team => ({ code, name, colors, rating, group, form });

export const TEAMS: Team[] = [
  // Gruppe A
  t("MEX", "Mexiko", ["#006847", "#ce1126"], 78, "A", ["S", "S", "U", "S", "N"]),
  t("POL", "Polen", ["#dc143c", "#ffffff"], 76, "A", ["U", "S", "N", "S", "S"]),
  t("KOR", "Südkorea", ["#cd2e3a", "#0047a0"], 74, "A", ["S", "N", "S", "U", "S"]),
  t("RSA", "Südafrika", ["#007a4d", "#ffb612"], 68, "A", ["N", "U", "S", "N", "U"]),
  // Gruppe B
  t("CAN", "Kanada", ["#d80621", "#ffffff"], 75, "B", ["S", "U", "S", "S", "N"]),
  t("SUI", "Schweiz", ["#da291c", "#ffffff"], 79, "B", ["S", "S", "U", "N", "S"]),
  t("CIV", "Elfenbeinküste", ["#f77f00", "#009e60"], 73, "B", ["U", "S", "S", "N", "U"]),
  t("QAT", "Katar", ["#8a1538", "#ffffff"], 65, "B", ["N", "N", "U", "S", "N"]),
  // Gruppe C
  t("USA", "USA", ["#002868", "#bf0a30"], 77, "C", ["S", "S", "N", "U", "S"]),
  t("URU", "Uruguay", ["#7ab0d4", "#1c1c21"], 82, "C", ["S", "U", "S", "S", "S"]),
  t("JPN", "Japan", ["#000555", "#ffffff"], 80, "C", ["S", "S", "S", "U", "N"]),
  t("NZL", "Neuseeland", ["#1c1c21", "#ffffff"], 62, "C", ["N", "U", "N", "S", "N"]),
  // Gruppe D
  t("FRA", "Frankreich", ["#0055a4", "#ef4135"], 90, "D", ["S", "S", "S", "U", "S"]),
  t("SEN", "Senegal", ["#00853f", "#fdef42"], 77, "D", ["S", "N", "S", "S", "U"]),
  t("AUS", "Australien", ["#ffcd00", "#00843d"], 70, "D", ["U", "S", "N", "U", "S"]),
  t("PAN", "Panama", ["#da121a", "#072357"], 64, "D", ["N", "S", "U", "N", "N"]),
  // Gruppe E
  t("GER", "Deutschland", ["#1c1c21", "#ffce00"], 87, "E", ["S", "S", "U", "S", "S"]),
  t("BRA", "Brasilien", ["#ffdf00", "#009c3b"], 89, "E", ["S", "U", "S", "S", "N"]),
  t("TUN", "Tunesien", ["#e70013", "#ffffff"], 69, "E", ["U", "N", "S", "U", "S"]),
  t("JOR", "Jordanien", ["#ce1126", "#007a3d"], 60, "E", ["N", "U", "N", "N", "S"]),
  // Gruppe F
  t("ESP", "Spanien", ["#aa151b", "#f1bf00"], 91, "F", ["S", "S", "S", "S", "U"]),
  t("MAR", "Marokko", ["#c1272d", "#006233"], 83, "F", ["S", "S", "U", "S", "S"]),
  t("SRB", "Serbien", ["#c6363c", "#0c4076"], 75, "F", ["N", "S", "U", "S", "N"]),
  t("CRC", "Costa Rica", ["#da291c", "#002b7f"], 66, "F", ["U", "N", "S", "N", "U"]),
  // Gruppe G
  t("ENG", "England", ["#ffffff", "#cf081f"], 88, "G", ["S", "U", "S", "S", "S"]),
  t("COL", "Kolumbien", ["#fcd116", "#003893"], 81, "G", ["S", "S", "N", "U", "S"]),
  t("NOR", "Norwegen", ["#ba0c2f", "#00205b"], 78, "G", ["S", "S", "S", "N", "U"]),
  t("UZB", "Usbekistan", ["#0099b5", "#ffffff"], 63, "G", ["N", "U", "N", "S", "N"]),
  // Gruppe H
  t("ARG", "Argentinien", ["#74acdf", "#ffffff"], 92, "H", ["S", "S", "S", "U", "S"]),
  t("NED", "Niederlande", ["#f36c21", "#21468b"], 86, "H", ["S", "S", "U", "S", "S"]),
  t("EGY", "Ägypten", ["#ce1126", "#1c1c21"], 72, "H", ["U", "S", "N", "U", "S"]),
  t("HON", "Honduras", ["#0073cf", "#ffffff"], 61, "H", ["N", "N", "U", "N", "S"]),
  // Gruppe I
  t("POR", "Portugal", ["#046a38", "#da291c"], 88, "I", ["S", "S", "S", "N", "S"]),
  t("CRO", "Kroatien", ["#ed1c24", "#ffffff"], 81, "I", ["U", "S", "S", "U", "S"]),
  t("GHA", "Ghana", ["#ce1126", "#fcd116"], 71, "I", ["S", "N", "U", "S", "N"]),
  t("CUW", "Curaçao", ["#002b7f", "#f9e814"], 59, "I", ["N", "U", "N", "N", "U"]),
  // Gruppe J
  t("BEL", "Belgien", ["#ed2939", "#fae042"], 84, "J", ["S", "U", "S", "S", "N"]),
  t("ECU", "Ecuador", ["#ffdd00", "#034ea2"], 76, "J", ["S", "S", "U", "N", "S"]),
  t("MLI", "Mali", ["#fcd116", "#14b53a"], 70, "J", ["U", "S", "N", "S", "U"]),
  t("KSA", "Saudi-Arabien", ["#006c35", "#ffffff"], 67, "J", ["N", "S", "U", "N", "S"]),
  // Gruppe K
  t("ITA", "Italien", ["#0064aa", "#ffffff"], 85, "K", ["S", "S", "U", "S", "S"]),
  t("DEN", "Dänemark", ["#c8102e", "#ffffff"], 79, "K", ["S", "N", "S", "U", "S"]),
  t("ALG", "Algerien", ["#006233", "#d21034"], 74, "K", ["S", "S", "N", "U", "N"]),
  t("CPV", "Kap Verde", ["#003893", "#cf2027"], 58, "K", ["N", "N", "S", "N", "U"]),
  // Gruppe L
  t("NGA", "Nigeria", ["#008751", "#ffffff"], 75, "L", ["S", "U", "S", "N", "S"]),
  t("SWE", "Schweden", ["#006aa7", "#fecc00"], 77, "L", ["S", "S", "N", "S", "U"]),
  t("IRN", "Iran", ["#239f40", "#da0000"], 72, "L", ["U", "S", "S", "N", "U"]),
  t("PER", "Peru", ["#d91023", "#ffffff"], 69, "L", ["N", "U", "S", "U", "N"]),
];

/**
 * Team-Lookup mit Auto-Registrierung: Unbekannte Codes (aus der Live-API)
 * erhalten ein neutrales Platzhalter-Team statt eines Fehlers.
 */
export const teamByCode = (code: string): Team => {
  return TEAMS.find((t) => t.code === code) ?? transientTeam(code);
};

function transientTeam(code: string): Team {
  return { code, name: code, colors: ["#3f3f46", "#71717a"], rating: 71, group: "", form: [] };
}

/** Registriert ein Team aus der Live-API oder aktualisiert Gruppen/Namen/Wappen. */
export function registerTeam(partial: {
  code: string;
  name?: string;
  colors?: [string, string];
  rating?: number;
  group?: string;
  form?: Team["form"];
  short?: string;
  logo?: string;
  placeholder?: boolean;
}): Team {
  const existing = TEAMS.find((t) => t.code === partial.code);
  if (existing) {
    if (partial.group !== undefined) existing.group = partial.group;
    if (partial.form !== undefined) existing.form = partial.form;
    if (partial.logo !== undefined && !existing.logo) existing.logo = partial.logo;
    return existing;
  }
  const team: Team = {
    code: partial.code,
    name: partial.name ?? partial.code,
    colors: partial.colors ?? ["#3f3f46", "#71717a"],
    rating: partial.rating ?? 71,
    group: partial.group ?? "",
    form: partial.form ?? [],
    short: partial.short,
    logo: partial.logo,
    placeholder: partial.placeholder,
  };
  TEAMS.push(team);
  return team;
}

/**
 * Übernimmt die echte Gruppenzuordnung aus der Live-API. Teams, die im
 * realen Turnier nicht vorkommen, verlieren ihre (Mock-)Gruppe.
 */
export function applyGroups(groupOfTeam: Record<string, string>): void {
  for (const team of TEAMS) {
    team.group = groupOfTeam[team.code] ?? "";
  }
}

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

/* ------------------------------ Venues ----------------------------- */

export const VENUES: Venue[] = [
  { id: "azteca", stadium: "Estadio Azteca", city: "Mexiko-Stadt", country: "Mexiko", capacity: 87523, timeZone: "America/Mexico_City" },
  { id: "akron", stadium: "Estadio Akron", city: "Guadalajara", country: "Mexiko", capacity: 49850, timeZone: "America/Mexico_City" },
  { id: "bbva", stadium: "Estadio BBVA", city: "Monterrey", country: "Mexiko", capacity: 53500, timeZone: "America/Monterrey" },
  { id: "sofi", stadium: "SoFi Stadium", city: "Los Angeles", country: "USA", capacity: 70240, timeZone: "America/Los_Angeles" },
  { id: "metlife", stadium: "MetLife Stadium", city: "New York / New Jersey", country: "USA", capacity: 82500, timeZone: "America/New_York" },
  { id: "att", stadium: "AT&T Stadium", city: "Dallas", country: "USA", capacity: 80000, timeZone: "America/Chicago" },
  { id: "nrg", stadium: "NRG Stadium", city: "Houston", country: "USA", capacity: 72220, timeZone: "America/Chicago" },
  { id: "mbz", stadium: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA", capacity: 71000, timeZone: "America/New_York" },
  { id: "hardrock", stadium: "Hard Rock Stadium", city: "Miami", country: "USA", capacity: 64767, timeZone: "America/New_York" },
  { id: "lincoln", stadium: "Lincoln Financial Field", city: "Philadelphia", country: "USA", capacity: 69796, timeZone: "America/New_York" },
  { id: "lumen", stadium: "Lumen Field", city: "Seattle", country: "USA", capacity: 69000, timeZone: "America/Los_Angeles" },
  { id: "levis", stadium: "Levi's Stadium", city: "San Francisco Bay Area", country: "USA", capacity: 70909, timeZone: "America/Los_Angeles" },
  { id: "arrowhead", stadium: "Arrowhead Stadium", city: "Kansas City", country: "USA", capacity: 76416, timeZone: "America/Chicago" },
  { id: "gillette", stadium: "Gillette Stadium", city: "Boston", country: "USA", capacity: 65878, timeZone: "America/New_York" },
  { id: "bmo", stadium: "BMO Field", city: "Toronto", country: "Kanada", capacity: 45736, timeZone: "America/Toronto" },
  { id: "bcplace", stadium: "BC Place", city: "Vancouver", country: "Kanada", capacity: 54500, timeZone: "America/Vancouver" },
];

export const venueById = (id: string): Venue => {
  const v = VENUES.find((v) => v.id === id);
  return (
    v ?? {
      id,
      stadium: "Stadion unbekannt",
      city: "",
      country: "",
      capacity: 0,
    }
  );
};

/** Registriert ein Stadion aus der Live-API (falls nicht in der Liste). */
export function registerVenue(venue: Venue): Venue {
  const existing = VENUES.find((v) => v.id === venue.id);
  if (existing) return existing;
  VENUES.push(venue);
  return venue;
}

/* ----------------------------- Standings --------------------------- */

export interface StandingRow {
  teamCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  rank?: number; // offizieller Rang aus der Live-API
  /** Tordifferenz direkt aus ESPN (pointDifferential); sonst selbst berechnet. */
  goalDiff?: number;
  /** Rangänderung ggü. vorherigem Spieltag (>0 = gestiegen, <0 = gefallen). */
  rankChange?: number;
  /** Quali-Farbe aus ESPN note.color (z. B. "#81D6AC" = weiter). */
  qualColor?: string;
  /** Eingedeutschtes Quali-Label aus ESPN note.description. */
  qualLabel?: string;
}

/* --------------------------- Favoriten (Mock) ----------------------- */

export const DEFAULT_FAVORITES = ["GER", "ARG", "ESP", "USA"];
