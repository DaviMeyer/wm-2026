/* ------------------------------------------------------------------ */
/*  WM 2026 – zentrales Mock-Datenmodell                               */
/*  Alle Daten sind Dummy-Daten zur Demonstration der UI.              */
/* ------------------------------------------------------------------ */

export interface Team {
  code: string; // FIFA-Trigramm bzw. eindeutiger Platzhalter-Code
  name: string;
  colors: [string, string]; // Primär-/Sekundärfarbe für TeamCrest
  rating: number; // 0–100, Basis für KI-Prognosen & Simulator
  group: string; // "A" … "L"; leer = nicht qualifiziert/Platzhalter
  form: ("S" | "U" | "N")[]; // Sieg/Unentschieden/Niederlage, letzte 5
  short?: string; // Kurzlabel fürs Crest, falls code zu lang (z. B. "3RD")
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
  rating?: number; // Live-Spielerbewertung; fehlt bei API-Daten
  x: number; // 0–100, Position auf dem Spielfeld (horizontal)
  y: number; // 0–100, 0 = eigenes Tor
}

export interface Lineup {
  formation: string;
  players: PlayerSlot[];
}

/** Einzelne Werte können fehlen – die ESPN-API liefert z. B. kein xG. */
export interface MatchStats {
  xg?: [number, number];
  possession?: [number, number];
  shots?: [number, number];
  shotsOnTarget?: [number, number];
  passes?: [number, number];
  passAccuracy?: [number, number];
  corners?: [number, number];
  fouls?: [number, number];
  yellowCards?: [number, number];
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

export interface Prediction {
  home: number; // Siegwahrscheinlichkeit in %
  draw: number;
  away: number;
  confidence: "hoch" | "mittel" | "niedrig";
  keyFactors: string[];
  tacticalSummary: string;
}

export type MatchStatus = "live" | "upcoming" | "finished";

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
  stats?: MatchStats;
  momentum?: MomentumPoint[];
  goals?: GoalEvent[];
  lineups?: { home: Lineup; away: Lineup };
  prediction?: Prediction;
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
  const team = TEAMS.find((t) => t.code === code);
  return team ?? registerTeam({ code });
};

/** Registriert ein Team aus der Live-API oder aktualisiert Gruppen/Namen. */
export function registerTeam(partial: {
  code: string;
  name?: string;
  colors?: [string, string];
  rating?: number;
  group?: string;
  form?: Team["form"];
  short?: string;
}): Team {
  const existing = TEAMS.find((t) => t.code === partial.code);
  if (existing) {
    if (partial.group !== undefined) existing.group = partial.group;
    if (partial.form !== undefined) existing.form = partial.form;
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

/* --------------------------- Featured Match ------------------------ */

const lineupGER: Lineup = {
  formation: "4-2-3-1",
  players: [
    { name: "ter Stegen", number: 1, rating: 7.4, x: 50, y: 5 },
    { name: "Kimmich", number: 6, rating: 7.8, x: 85, y: 22 },
    { name: "Rüdiger", number: 2, rating: 7.1, x: 63, y: 18 },
    { name: "Tah", number: 4, rating: 6.9, x: 37, y: 18 },
    { name: "Raum", number: 18, rating: 7.0, x: 15, y: 22 },
    { name: "Andrich", number: 23, rating: 6.8, x: 38, y: 38 },
    { name: "Groß", number: 8, rating: 7.2, x: 62, y: 38 },
    { name: "Sané", number: 19, rating: 7.6, x: 82, y: 58 },
    { name: "Musiala", number: 10, rating: 8.7, x: 50, y: 62 },
    { name: "Wirtz", number: 17, rating: 8.2, x: 18, y: 58 },
    { name: "Füllkrug", number: 9, rating: 7.5, x: 50, y: 82 },
  ],
};

const lineupBRA: Lineup = {
  formation: "4-3-3",
  players: [
    { name: "Alisson", number: 1, rating: 6.8, x: 50, y: 5 },
    { name: "Danilo", number: 2, rating: 6.5, x: 84, y: 22 },
    { name: "Marquinhos", number: 4, rating: 7.0, x: 62, y: 18 },
    { name: "Magalhães", number: 3, rating: 6.7, x: 38, y: 18 },
    { name: "Wendell", number: 16, rating: 6.4, x: 16, y: 22 },
    { name: "Casemiro", number: 5, rating: 6.6, x: 50, y: 36 },
    { name: "Guimarães", number: 8, rating: 7.1, x: 68, y: 48 },
    { name: "Paquetá", number: 7, rating: 7.3, x: 32, y: 48 },
    { name: "Raphinha", number: 11, rating: 7.7, x: 82, y: 72 },
    { name: "Endrick", number: 9, rating: 7.9, x: 50, y: 80 },
    { name: "Vinícius Jr.", number: 10, rating: 8.1, x: 18, y: 72 },
  ],
};

const momentumLive: MomentumPoint[] = Array.from({ length: 67 }, (_, i) => {
  const minute = i + 1;
  // Drehbuch: BRA startet stark, GER übernimmt ab ~25', BRA-Druckphase ~55'
  let base: number;
  if (minute < 15) base = -35 + minute;
  else if (minute < 25) base = -10 + (minute - 15) * 2;
  else if (minute < 45) base = 15 + Math.sin(minute / 3) * 18;
  else if (minute < 58) base = -20 - Math.sin(minute / 2) * 15;
  else base = 25 + Math.sin(minute / 2.5) * 20;
  const wobble = ((minute * 7919) % 23) - 11; // deterministisches Rauschen
  return { minute, value: Math.max(-95, Math.min(95, Math.round(base + wobble * 0.6))) };
});

/* ------------------------------ Matches ---------------------------- */
/* Bezugsdatum: 12. Juni 2026 ("heute" im Mock-Universum)              */

export const MATCHES: Match[] = [
  // Gestern (11. Juni) – Resultate
  {
    id: "m-a1",
    group: "A",
    status: "finished",
    kickoff: "2026-06-11T19:00:00-06:00",
    homeCode: "MEX",
    awayCode: "RSA",
    homeScore: 2,
    awayScore: 0,
    venueId: "azteca",
    referee: "F. Letexier (FRA)",
    goals: [
      { minute: 23, clockLabel: "23'", team: "home", scorer: "S. Giménez" },
      { minute: 67, clockLabel: "67'", team: "home", scorer: "R. Jiménez" },
    ],
  },
  {
    id: "m-a2",
    group: "A",
    status: "finished",
    kickoff: "2026-06-11T16:00:00-06:00",
    homeCode: "POL",
    awayCode: "KOR",
    homeScore: 1,
    awayScore: 1,
    venueId: "akron",
    referee: "J. Maguette N'Diaye (SEN)",
    goals: [
      { minute: 41, clockLabel: "41'", team: "home", scorer: "R. Lewandowski", penalty: true },
      { minute: 78, clockLabel: "78'", team: "away", scorer: "Son Heung-min" },
    ],
  },
  {
    id: "m-b1",
    group: "B",
    status: "finished",
    kickoff: "2026-06-11T19:00:00-07:00",
    homeCode: "CAN",
    awayCode: "QAT",
    homeScore: 3,
    awayScore: 1,
    venueId: "bcplace",
    referee: "C. Ramos (MEX)",
    goals: [
      { minute: 12, clockLabel: "12'", team: "home", scorer: "J. David" },
      { minute: 55, clockLabel: "55'", team: "home", scorer: "J. David", penalty: true },
      { minute: 70, clockLabel: "70'", team: "home", scorer: "A. Davies" },
      { minute: 80, clockLabel: "80'", team: "away", scorer: "A. Hassan" },
    ],
  },

  // Heute (12. Juni) – Featured Live-Match
  {
    id: "m-e1",
    group: "E",
    status: "live",
    kickoff: "2026-06-12T15:00:00-04:00",
    minute: 67,
    homeCode: "GER",
    awayCode: "BRA",
    homeScore: 2,
    awayScore: 1,
    venueId: "metlife",
    referee: "S. Marciniak (POL)",
    goals: [
      { minute: 18, clockLabel: "18'", team: "away", scorer: "Vinícius Jr." },
      { minute: 34, clockLabel: "34'", team: "home", scorer: "J. Musiala" },
      { minute: 61, clockLabel: "61'", team: "home", scorer: "N. Füllkrug" },
    ],
    stats: {
      xg: [2.34, 1.87],
      possession: [44, 56],
      shots: [13, 16],
      shotsOnTarget: [6, 4],
      passes: [387, 489],
      passAccuracy: [86, 91],
      corners: [5, 7],
      fouls: [11, 9],
      yellowCards: [2, 3],
    },
    momentum: momentumLive,
    lineups: { home: lineupGER, away: lineupBRA },
    prediction: {
      home: 38,
      draw: 27,
      away: 35,
      confidence: "mittel",
      keyFactors: [
        "Deutschlands Pressing-Effizienz: 8,2 Ballgewinne im letzten Drittel pro Spiel",
        "Brasiliens Flügeltempo: 2,1 xG aus Konterangriffen in der Qualifikation",
        "Musiala in Topform: 4 Scorerpunkte in den letzten 3 Länderspielen",
      ],
      tacticalSummary:
        "Das Duell entscheidet sich im Mittelfeld: Deutschlands aggressives Gegenpressing um Musiala und Wirtz trifft auf Brasiliens vertikales Umschaltspiel über Vinícius Jr. und Raphinha. Gewinnt die DFB-Elf die zweiten Bälle, kontrolliert sie das Spiel – verliert sie sie, wird Brasiliens Flügeltempo zur permanenten Gefahr.",
    },
  },
  {
    id: "m-e2",
    group: "E",
    status: "upcoming",
    kickoff: "2026-06-12T19:00:00-05:00",
    homeCode: "TUN",
    awayCode: "JOR",
    venueId: "nrg",
    referee: "I. Elfath (USA)",
    prediction: {
      home: 52,
      draw: 28,
      away: 20,
      confidence: "hoch",
      keyFactors: [
        "Tunesien mit stabiler Fünferkette: nur 0,7 Gegentore pro Spiel",
        "Jordaniens Standardstärke: 40 % der Tore nach ruhenden Bällen",
      ],
      tacticalSummary:
        "Tunesien wird das Spiel machen, Jordanien lauert auf Standards und Konter. Der Schlüssel liegt bei Tuniesiens Halbraum-Überladungen gegen Jordaniens tiefen 5-4-1-Block.",
    },
  },
  {
    id: "m-c1",
    group: "C",
    status: "upcoming",
    kickoff: "2026-06-12T18:00:00-07:00",
    homeCode: "USA",
    awayCode: "NZL",
    venueId: "sofi",
    referee: "D. Massa (ITA)",
    prediction: {
      home: 64,
      draw: 22,
      away: 14,
      confidence: "hoch",
      keyFactors: [
        "Heimvorteil: USA in LA mit 9 Siegen aus 10 Heimspielen",
        "Neuseelands Defensive anfällig bei hohem Pressing",
      ],
      tacticalSummary:
        "Die USA setzen vor Heimkulisse auf frühes Anlaufen und schnelle Flügelwechsel. Neuseeland braucht einen perfekten Defensivtag, um einen Punkt zu entführen.",
    },
  },
  {
    id: "m-f1",
    group: "F",
    status: "upcoming",
    kickoff: "2026-06-12T20:00:00-04:00",
    homeCode: "ESP",
    awayCode: "CRC",
    venueId: "hardrock",
    referee: "A. Taylor (ENG)",
    prediction: {
      home: 78,
      draw: 14,
      away: 8,
      confidence: "hoch",
      keyFactors: [
        "Spanien mit 71 % Ballbesitz-Schnitt in der Qualifikation",
        "Costa Rica seit 6 Pflichtspielen ohne Sieg gegen Top-10-Nationen",
      ],
      tacticalSummary:
        "Spaniens Positionsspiel gegen Costa Ricas tiefen Block – ein Geduldsspiel. Entscheidend wird, wie früh Spanien das erste Tor erzielt und ob Costa Rica überhaupt Entlastungsangriffe setzen kann.",
    },
  },

  // Morgen (13. Juni)
  {
    id: "m-h1",
    group: "H",
    status: "upcoming",
    kickoff: "2026-06-13T15:00:00-05:00",
    homeCode: "ARG",
    awayCode: "EGY",
    venueId: "att",
    referee: "F. Zwayer (GER)",
    prediction: {
      home: 71,
      draw: 18,
      away: 11,
      confidence: "hoch",
      keyFactors: [
        "Argentinien seit 14 Pflichtspielen ungeschlagen",
        "Ägypten ohne gesperrten Abwehrchef",
      ],
      tacticalSummary:
        "Der Weltmeister kontrolliert über das Zentrum, Ägypten setzt alles auf Salah-Konter über rechts. Argentiniens linke Abwehrseite wird der meistgeprüfte Raum des Spiels.",
    },
  },
  {
    id: "m-g1",
    group: "G",
    status: "upcoming",
    kickoff: "2026-06-13T17:00:00-04:00",
    homeCode: "ENG",
    awayCode: "UZB",
    venueId: "gillette",
    referee: "W. Gomes (BRA)",
  },
  {
    id: "m-k1",
    group: "K",
    status: "upcoming",
    kickoff: "2026-06-13T16:00:00-04:00",
    homeCode: "ITA",
    awayCode: "CPV",
    venueId: "bmo",
    referee: "M. Oliver (ENG)",
  },
];

export const matchById = (id: string): Match | undefined =>
  MATCHES.find((m) => m.id === id);

export const liveMatches = () => MATCHES.filter((m) => m.status === "live");
export const todaysMatches = () =>
  MATCHES.filter((m) => m.kickoff.startsWith("2026-06-12"));
export const yesterdaysResults = () =>
  MATCHES.filter((m) => m.kickoff.startsWith("2026-06-11"));
export const upcomingMatches = () =>
  MATCHES.filter((m) => m.status === "upcoming");

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
}

/** Tabellen nach Spieltag 1 (Mock). */
export const STANDINGS: Record<string, StandingRow[]> = Object.fromEntries(
  GROUPS.map((g) => {
    const teams = TEAMS.filter((t) => t.group === g);
    // Spieltag-1-Drehbuch: Stärkeres Team gewinnt 2:0 / 2:1, zweites Duell remis o. knapp
    const sorted = [...teams].sort((a, b) => b.rating - a.rating);
    const rows: StandingRow[] = [
      { teamCode: sorted[0].code, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, points: 3 },
      { teamCode: sorted[1].code, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, points: 3 },
      { teamCode: sorted[2].code, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 2, points: 0 },
      { teamCode: sorted[3].code, played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 2, points: 0 },
    ];
    return [g, rows];
  })
);

/* --------------------------- Favoriten (Mock) ----------------------- */

export const DEFAULT_FAVORITES = ["GER", "ARG", "ESP", "USA"];
