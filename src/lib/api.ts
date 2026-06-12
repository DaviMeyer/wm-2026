/* ------------------------------------------------------------------ */
/*  ESPN-API-Client – echte WM-2026-Daten (kostenlos, ohne API-Key).   */
/*  Alle Antworten werden defensiv auf unser Datenmodell gemappt;      */
/*  fehlende Felder bleiben undefined und die UI zeigt Fallbacks.      */
/* ------------------------------------------------------------------ */

import {
  registerTeam,
  registerVenue,
  teamByCode,
  VENUES,
  type Lineup,
  type Match,
  type MatchStats,
  type MatchStatus,
  type PlayerSlot,
  type Prediction,
  type StandingRow,
} from "../data/wm";

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";

/** Deutsche Namen für Teams, die nicht im Basis-Datensatz stehen. */
const GERMAN_NAMES: Record<string, string> = {
  BIH: "Bosnien-Herzegowina",
  CZE: "Tschechien",
  PAR: "Paraguay",
  SCO: "Schottland",
  AUT: "Österreich",
  TUR: "Türkei",
  UKR: "Ukraine",
  WAL: "Wales",
  ROU: "Rumänien",
  GRE: "Griechenland",
  SVK: "Slowakei",
  SVN: "Slowenien",
  ALB: "Albanien",
  MKD: "Nordmazedonien",
  IRL: "Irland",
  ISL: "Island",
  CHI: "Chile",
  VEN: "Venezuela",
  BOL: "Bolivien",
  JAM: "Jamaika",
  CUR: "Curaçao",
  HAI: "Haiti",
  CMR: "Kamerun",
  COD: "DR Kongo",
  BFA: "Burkina Faso",
  ZAM: "Sambia",
  GAB: "Gabun",
  GUI: "Guinea",
  UGA: "Uganda",
  LBY: "Libyen",
  IRQ: "Irak",
  UAE: "VAE",
  OMA: "Oman",
  BHR: "Bahrain",
  PRK: "Nordkorea",
  IDN: "Indonesien",
  NCL: "Neukaledonien",
};

/** Rating-Anhaltspunkte für Teams außerhalb des Basis-Datensatzes. */
const RATING_HINTS: Record<string, number> = {
  CZE: 75, AUT: 78, TUR: 77, UKR: 76, SCO: 74, PAR: 73, BIH: 70,
  CHI: 72, VEN: 70, JAM: 68, WAL: 72, GRE: 73, SVK: 72, ROU: 72,
};

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`ESPN-API: HTTP ${res.status}`);
  return res.json();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function normalizeColor(c?: string): string | undefined {
  if (!c || typeof c !== "string") return undefined;
  const hex = c.replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex}` : undefined;
}

function ensureTeam(apiTeam: Json): string {
  const code: string = String(apiTeam?.abbreviation ?? "???").toUpperCase();
  const c1 = normalizeColor(apiTeam?.color);
  const c2 = normalizeColor(apiTeam?.alternateColor);
  registerTeam({
    code,
    name: GERMAN_NAMES[code] ?? apiTeam?.displayName ?? code,
    colors: c1 ? [c1, c2 ?? "#27272e"] : undefined,
    rating: RATING_HINTS[code],
  });
  return code;
}

/* --------------------------- Venues -------------------------------- */

const normalize = (s: string) =>
  s.toLowerCase().replace(/stadium|estadio|field|stade/g, "").replace(/[^a-z]/g, "");

function ensureVenue(apiVenue: Json): string {
  if (!apiVenue?.fullName) return "metlife"; // neutraler Fallback
  const wanted = normalize(String(apiVenue.fullName));
  const known = VENUES.find(
    (v) => wanted && (normalize(v.stadium) === wanted || normalize(v.stadium).includes(wanted) || wanted.includes(normalize(v.stadium)))
  );
  if (known) return known.id;
  const id = `espn-v-${apiVenue.id ?? wanted}`;
  registerVenue({
    id,
    stadium: String(apiVenue.fullName),
    city: String(apiVenue?.address?.city ?? ""),
    country: String(apiVenue?.address?.country ?? ""),
    capacity: 0,
  });
  return id;
}

/* ------------------------- Scoreboard ------------------------------ */

function mapStatus(state?: string): MatchStatus {
  if (state === "in") return "live";
  if (state === "post") return "finished";
  return "upcoming";
}

/** Implizite Wahrscheinlichkeit aus US-Moneyline-Quote ("-120", "+380", "EVEN", Zahl). */
function americanToProb(ml: unknown): number | undefined {
  if (typeof ml === "string" && /even/i.test(ml)) return 0.5;
  const v = Number(ml);
  if (!Number.isFinite(v) || v === 0) return undefined;
  return v < 0 ? -v / (-v + 100) : 100 / (v + 100);
}

/**
 * Moneyline einer Seite aus den verschiedenen ESPN-Formaten ziehen:
 * neu: odds.moneyline.{home|away|draw}.{close|open}.odds (Strings),
 * alt: odds.{home|away}TeamOdds.moneyLine bzw. drawOdds.moneyLine (Zahlen).
 */
function sideProb(odds: Json, side: "home" | "away" | "draw"): number | undefined {
  const nested = odds?.moneyline?.[side];
  const fromNested = americanToProb(nested?.close?.odds ?? nested?.open?.odds);
  if (fromNested !== undefined) return fromNested;
  const legacy =
    side === "draw" ? odds?.drawOdds?.moneyLine : odds?.[`${side}TeamOdds`]?.moneyLine;
  return americanToProb(legacy);
}

/** Prognose aus echten Buchmacher-Quoten (DraftKings via ESPN). */
function predictionFromOdds(odds: Json, homeName: string, awayName: string): Prediction | undefined {
  const h = sideProb(odds, "home");
  const d = sideProb(odds, "draw");
  const a = sideProb(odds, "away");
  if (h === undefined || a === undefined) return undefined;
  const dd = d ?? Math.max(0.05, 1 - h - a);
  const sum = h + dd + a;
  const home = Math.round((h / sum) * 100);
  const away = Math.round((a / sum) * 100);
  const draw = Math.max(0, 100 - home - away);
  const fav = home >= away ? homeName : awayName;
  const favPct = Math.max(home, away);
  return {
    home,
    draw,
    away,
    confidence: favPct >= 60 ? "hoch" : favPct >= 45 ? "mittel" : "niedrig",
    keyFactors: [
      `Marktbasiertes Modell: Quoten von ${odds?.provider?.name ?? "Buchmachern"} in Wahrscheinlichkeiten umgerechnet`,
      `${fav} wird mit ${favPct} % als Favorit eingestuft`,
      `Remis-Wahrscheinlichkeit: ${draw} %`,
    ],
    tacticalSummary:
      `Das Modell sieht ${fav} vorn (${favPct} %). ` +
      `Je länger die Partie torlos bleibt, desto stärker steigt der Remis-Anteil von aktuell ${draw} % – ` +
      `der Außenseiter wird tief verteidigen und auf Standards sowie Umschaltmomente setzen.`,
  };
}

/**
 * Fallback-Prognose aus den Team-Ratings (logistisches Modell) –
 * greift, wenn ESPN keine verwertbaren Quoten liefert.
 */
function predictionFromRatings(homeCode: string, awayCode: string): Prediction {
  const home = teamByCode(homeCode);
  const away = teamByCode(awayCode);
  const pHomeRaw = 1 / (1 + Math.pow(10, (away.rating - home.rating) / 25));
  // Je enger die Teams beieinander liegen, desto wahrscheinlicher das Remis
  const closeness = Math.max(0, 1 - Math.abs(home.rating - away.rating) / 25);
  const drawShare = 0.2 + 0.08 * closeness;
  const homePct = Math.round(pHomeRaw * (1 - drawShare) * 100);
  const awayPct = Math.round((1 - pHomeRaw) * (1 - drawShare) * 100);
  const drawPct = Math.max(0, 100 - homePct - awayPct);
  const fav = homePct >= awayPct ? home : away;
  const other = fav === home ? away : home;
  const favPct = Math.max(homePct, awayPct);
  const wins = (form: typeof home.form) => form.filter((f) => f === "S").length;
  return {
    home: homePct,
    draw: drawPct,
    away: awayPct,
    confidence: favPct >= 60 ? "hoch" : favPct >= 45 ? "mittel" : "niedrig",
    keyFactors: [
      `Modellbasiert: Team-Stärke ${home.name} ${home.rating} vs. ${away.name} ${away.rating}`,
      home.form.length > 0 && away.form.length > 0
        ? `Form (letzte 5): ${home.name} ${wins(home.form)} Siege, ${away.name} ${wins(away.form)} Siege`
        : `${fav.name} geht als Favorit in die Partie (${favPct} %)`,
      `Remis-Wahrscheinlichkeit: ${drawPct} %`,
    ],
    tacticalSummary:
      `Das Stärkemodell sieht ${fav.name} mit ${favPct} % vorn. ${other.name} dürfte kompakt ` +
      `verteidigen und auf Umschaltmomente sowie Standards setzen – je länger das Spiel torlos ` +
      `bleibt, desto realistischer wird das Remis (${drawPct} %).`,
  };
}

/** ESPN-Formstring ("WWDLW") → unser Format. */
function mapForm(form: unknown): ("S" | "U" | "N")[] | undefined {
  if (typeof form !== "string" || form.length === 0) return undefined;
  const result: ("S" | "U" | "N")[] = [];
  for (const ch of form.toUpperCase().slice(0, 5)) {
    if (ch === "W") result.push("S");
    else if (ch === "D") result.push("U");
    else if (ch === "L") result.push("N");
  }
  return result.length > 0 ? result : undefined;
}

function mapEvent(ev: Json): Match | null {
  const comp = ev?.competitions?.[0];
  if (!comp) return null;
  const competitors: Json[] = comp.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;

  const homeCode = ensureTeam(home.team);
  const awayCode = ensureTeam(away.team);
  const homeForm = mapForm(home.form);
  const awayForm = mapForm(away.form);
  if (homeForm) registerTeam({ code: homeCode, form: homeForm });
  if (awayForm) registerTeam({ code: awayCode, form: awayForm });
  const status = mapStatus(comp.status?.type?.state);
  const minute = parseInt(String(comp.status?.displayClock ?? ""), 10);
  const groupNote: string | undefined = (comp.notes ?? [])
    .map((n: Json) => String(n?.headline ?? ""))
    .find((h: string) => /group\s+[a-l]/i.test(h));

  const match: Match = {
    id: String(ev.id),
    group: groupNote ? groupNote.match(/group\s+([a-l])/i)![1].toUpperCase() : "",
    status,
    kickoff: String(ev.date ?? comp.date),
    minute: status === "live" && Number.isFinite(minute) ? minute : undefined,
    homeCode,
    awayCode,
    homeScore: status === "upcoming" ? undefined : num(home.score),
    awayScore: status === "upcoming" ? undefined : num(away.score),
    venueId: ensureVenue(comp.venue),
  };

  if (status === "upcoming") {
    if (comp.odds?.[0]) {
      match.prediction = predictionFromOdds(
        comp.odds[0],
        GERMAN_NAMES[homeCode] ?? home.team.displayName,
        GERMAN_NAMES[awayCode] ?? away.team.displayName
      );
    }
    // Fallback: ohne (parsebare) Quoten rechnet das Ratings-Modell
    match.prediction ??= predictionFromRatings(homeCode, awayCode);
  }
  return match;
}

const fmtDate = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

/** Spiele im Datumsbereich [from, to] (lokale Tage). */
export async function fetchMatches(from: Date, to: Date): Promise<Match[]> {
  const data: Json = await getJson(
    `${SCOREBOARD}/scoreboard?dates=${fmtDate(from)}-${fmtDate(to)}&limit=200`
  );
  const events: Json[] = data?.events ?? [];
  return events
    .map(mapEvent)
    .filter((m): m is Match => m !== null)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
}

/* ------------------------- Standings ------------------------------- */

export interface LiveStandings {
  table: Record<string, StandingRow[]>;
  groupOfTeam: Record<string, string>;
}

export async function fetchStandings(): Promise<LiveStandings> {
  const data: Json = await getJson(`${STANDINGS_URL}?season=2026`);
  const table: Record<string, StandingRow[]> = {};
  const groupOfTeam: Record<string, string> = {};

  for (const child of data?.children ?? []) {
    const groupMatch = String(child?.name ?? "").match(/group\s+([a-l])/i);
    if (!groupMatch) continue;
    const group = groupMatch[1].toUpperCase();
    const rows: StandingRow[] = [];

    for (const entry of child?.standings?.entries ?? []) {
      const code = ensureTeam(entry.team);
      const stat = (name: string) =>
        num((entry.stats ?? []).find((s: Json) => s?.name === name)?.value);
      registerTeam({ code, group });
      groupOfTeam[code] = group;
      rows.push({
        teamCode: code,
        played: stat("gamesPlayed"),
        won: stat("wins"),
        drawn: stat("ties"),
        lost: stat("losses"),
        goalsFor: stat("pointsFor"),
        goalsAgainst: stat("pointsAgainst"),
        points: stat("points"),
        rank: stat("rank") || undefined,
      });
    }
    rows.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
    table[group] = rows;
  }

  if (Object.keys(table).length === 0) throw new Error("ESPN-API: keine Tabellen erhalten");
  return { table, groupOfTeam };
}

/* ----------------------- Match-Details ----------------------------- */

export interface MatchDetails {
  stats?: MatchStats;
  lineups?: { home: Lineup; away: Lineup };
  referee?: string;
}

/** Statistik-Namen der ESPN-Boxscore → unser Modell. */
function mapStats(homeTeam: Json, awayTeam: Json): MatchStats | undefined {
  const read = (team: Json, name: string): number | undefined => {
    const s = (team?.statistics ?? []).find((x: Json) => x?.name === name);
    return s ? num(s.displayValue ?? s.value) : undefined;
  };
  const pair = (name: string): [number, number] | undefined => {
    const h = read(homeTeam, name);
    const a = read(awayTeam, name);
    return h === undefined || a === undefined ? undefined : [h, a];
  };
  const stats: MatchStats = {
    possession: pair("possessionPct"),
    shots: pair("totalShots"),
    shotsOnTarget: pair("shotsOnTarget"),
    corners: pair("wonCorners"),
    fouls: pair("foulsCommitted"),
    yellowCards: pair("yellowCards"),
  };
  return Object.values(stats).some((v) => v !== undefined) ? stats : undefined;
}

/** Verteilt eine Startelf nach Positionsgruppen auf Spielfeld-Koordinaten. */
function buildLineup(rosterEntry: Json): Lineup | undefined {
  const starters: Json[] = (rosterEntry?.roster ?? []).filter((p: Json) => p?.starter);
  if (starters.length < 11) return undefined;

  const bucket = (p: Json): "G" | "D" | "M" | "F" => {
    const pos = String(p?.position?.abbreviation ?? p?.position?.name ?? "").toUpperCase();
    if (pos.startsWith("G")) return "G";
    if (/^(D|LB|RB|CB|LWB|RWB)/.test(pos)) return "D";
    if (/^(F|ST|CF|LW|RW|A)/.test(pos)) return "F";
    return "M";
  };

  const groups: Record<"G" | "D" | "M" | "F", Json[]> = { G: [], D: [], M: [], F: [] };
  for (const p of starters.slice(0, 11)) groups[bucket(p)].push(p);
  // Sicherheitsnetz: ohne erkennbaren Keeper rückt der erste Spieler ins Tor
  if (groups.G.length === 0 && starters.length > 0) {
    const first = groups.D.shift() ?? groups.M.shift() ?? groups.F.shift();
    if (first) groups.G.push(first);
  }

  const rows: { y: number; players: Json[] }[] = [
    { y: 5, players: groups.G },
    { y: 20, players: groups.D },
    { y: 50, players: groups.M },
    { y: 78, players: groups.F },
  ].filter((r) => r.players.length > 0);

  const players: PlayerSlot[] = rows.flatMap((row) =>
    row.players.map((p, i) => ({
      name: String(p?.athlete?.shortName ?? p?.athlete?.displayName ?? "—"),
      number: num(p?.jersey) || i + 1,
      x: ((i + 1) / (row.players.length + 1)) * 100,
      y: row.y,
    }))
  );

  const formation =
    String(rosterEntry?.formation ?? "") ||
    [groups.D.length, groups.M.length, groups.F.length].filter(Boolean).join("-");

  return { formation, players };
}

export async function fetchMatchDetails(eventId: string): Promise<MatchDetails> {
  const data: Json = await getJson(`${SCOREBOARD}/summary?event=${eventId}`);

  const teams: Json[] = data?.boxscore?.teams ?? [];
  const homeBox = teams.find((t) => t?.homeAway === "home") ?? teams[1];
  const awayBox = teams.find((t) => t?.homeAway === "away") ?? teams[0];

  const rosters: Json[] = data?.rosters ?? [];
  const homeRoster = rosters.find((r) => r?.homeAway === "home");
  const awayRoster = rosters.find((r) => r?.homeAway === "away");
  const homeLineup = homeRoster ? buildLineup(homeRoster) : undefined;
  const awayLineup = awayRoster ? buildLineup(awayRoster) : undefined;

  const officials: Json[] = data?.gameInfo?.officials ?? [];
  const ref = officials.find((o) =>
    String(o?.position?.name ?? o?.position?.displayName ?? "").toLowerCase().includes("referee")
  ) ?? officials[0];

  return {
    stats: homeBox && awayBox ? mapStats(homeBox, awayBox) : undefined,
    lineups: homeLineup && awayLineup ? { home: homeLineup, away: awayLineup } : undefined,
    referee: ref?.displayName ?? ref?.fullName ?? undefined,
  };
}
