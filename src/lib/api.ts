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
  type GoalEvent,
  type Lineup,
  type Match,
  type MatchEvent,
  type MatchRound,
  type MatchStats,
  type MatchStatus,
  type NewsItem,
  type PlayAction,
  type PlayActionType,
  type PlayerSlot,
  type Prediction,
  type StandingRow,
} from "../data/wm";

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
const NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news";

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

/** Deutsche Rundennamen + kurzes Crest-Label für K.-o.-Platzhalter. */
const KO_ROUND: Record<string, { long: string; short: string }> = {
  "round of 32": { long: "Sechzehntelfinale", short: "Sf" },
  "round of 16": { long: "Achtelfinale", short: "Af" },
  quarterfinal: { long: "Viertelfinale", short: "Vf" },
  semifinal: { long: "Halbfinale", short: "Hf" },
};

/**
 * K.-o.-Platzhalter aus der ESPN-API erkennen und eindeutschen. ESPN benennt
 * noch nicht feststehende Teilnehmer über das Ziel-/Quellspiel, z. B.
 * "Round of 32 5 Winner", "Round of 16 2 Winner", "Quarterfinal 1 Winner",
 * "Semifinal 1 Winner", "Semifinal 1 Loser" (Spiel um Platz 3) – außerdem die
 * frühen Gruppen-Platzhalter "Group A Winner"/"Group A 2nd Place"/"Third Place
 * Group …". Pro Slot ein eindeutiger Code (kein Kollabieren auf "???"), ein
 * kurzes Crest-Label und keine Gruppe (damit Favoriten/Simulator sie ignorieren).
 */
function placeholderTeam(apiTeam: Json): { code: string; short: string; name: string } | null {
  const dn = String(apiTeam?.displayName ?? "").trim();

  // K.-o.-Folgespiele: "<Runde> <Nr> <Winner|Loser>"
  let m = dn.match(/^(Round of 32|Round of 16|Quarterfinal|Semifinal)\s+(\d+)\s+(Winner|Loser)$/i);
  if (m) {
    const round = KO_ROUND[m[1].toLowerCase()];
    const num = m[2];
    const isWinner = m[3].toLowerCase() === "winner";
    const key = m[1].toLowerCase().replace(/[^a-z0-9]/g, "");
    return {
      code: `${key}-${isWinner ? "W" : "L"}${num}`,
      short: `${round.short}${num}`,
      name: `${isWinner ? "Sieger" : "Verlierer"} ${round.long} ${num}`,
    };
  }

  m = dn.match(/^Group ([A-L]) Winner$/i);
  if (m) {
    const g = m[1].toUpperCase();
    return { code: `1${g}`, short: `1${g}`, name: `Sieger Gruppe ${g}` };
  }
  m = dn.match(/^Group ([A-L]) (?:2nd|Second) Place$/i);
  if (m) {
    const g = m[1].toUpperCase();
    return { code: `2${g}`, short: `2${g}`, name: `2. Gruppe ${g}` };
  }
  m = dn.match(/Third Place[,]? Group[s]? ([A-Z/ ]+)/i);
  if (m) {
    const letters = m[1].replace(/[^A-Za-z]/g, "").toUpperCase();
    return {
      code: `3RD${letters}`,
      short: "3RD",
      name: `Dritter ${m[1].trim().replace(/\s/g, "")}`,
    };
  }
  // Ältere/alternative ESPN-Formate: "Winner Match 74", "Loser of Game 101"
  m = dn.match(/^(Winner|Loser) (?:of )?(?:Match|Game) ?(\d+)/i);
  if (m) {
    const winner = m[1].toLowerCase() === "winner";
    const code = `${winner ? "W" : "L"}${m[2]}`;
    return { code, short: code, name: `${winner ? "Sieger" : "Verlierer"} Spiel ${m[2]}` };
  }
  return null;
}

/** Echtes Länder-Wappen aus ESPN: scoreboard `team.logo` oder standings `team.logos[0].href`. */
function logoUrl(apiTeam: Json): string | undefined {
  const direct = typeof apiTeam?.logo === "string" ? apiTeam.logo : undefined;
  const fromArr = typeof apiTeam?.logos?.[0]?.href === "string" ? apiTeam.logos[0].href : undefined;
  return direct ?? fromArr;
}

function ensureTeam(apiTeam: Json): string {
  const placeholder = placeholderTeam(apiTeam);
  if (placeholder) {
    registerTeam({
      code: placeholder.code,
      name: placeholder.name,
      short: placeholder.short,
      colors: ["#27272e", "#3f3f46"],
      placeholder: true,
    });
    return placeholder.code;
  }
  const code: string = String(apiTeam?.abbreviation ?? "???").toUpperCase();
  const c1 = normalizeColor(apiTeam?.color);
  const c2 = normalizeColor(apiTeam?.alternateColor);
  registerTeam({
    code,
    name: GERMAN_NAMES[code] ?? apiTeam?.displayName ?? code,
    colors: c1 ? [c1, c2 ?? "#27272e"] : undefined,
    rating: RATING_HINTS[code],
    logo: logoUrl(apiTeam),
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

/** Gültige Runden-Slugs der ESPN-`season.slug` → unser MatchRound-Typ. */
const ROUND_SLUGS = new Set<MatchRound>([
  "group-stage",
  "round-of-32",
  "round-of-16",
  "quarterfinals",
  "semifinals",
  "3rd-place-match",
  "final",
]);

function mapRound(slug: unknown): MatchRound | undefined {
  const s = String(slug ?? "");
  return ROUND_SLUGS.has(s as MatchRound) ? (s as MatchRound) : undefined;
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
/** Über/Unter-Linie (erwartete Gesamttore) aus den ESPN-Quoten. */
function overUnderFromOdds(odds: Json): number | undefined {
  const v = Number(odds?.overUnder ?? odds?.total?.over?.close?.line ?? odds?.total?.over?.open?.line);
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

/** Handicap: das Team mit negativer Spread-Linie ist der Buchmacher-Favorit. */
function spreadFromOdds(odds: Json, homeName: string, awayName: string): Prediction["spread"] {
  const line = (side: "home" | "away") =>
    odds?.pointSpread?.[side]?.close?.line ?? odds?.pointSpread?.[side]?.open?.line;
  const homeLine = line("home");
  const awayLine = line("away");
  const hl = parseFloat(String(homeLine));
  const al = parseFloat(String(awayLine));
  if (Number.isFinite(hl) && hl < 0) return { teamName: homeName, line: String(homeLine) };
  if (Number.isFinite(al) && al < 0) return { teamName: awayName, line: String(awayLine) };
  return undefined;
}

function predictionFromOdds(odds: Json, homeName: string, awayName: string): Prediction | undefined {
  const h = sideProb(odds, "home");
  const d = sideProb(odds, "draw");
  const a = sideProb(odds, "away");
  if (h === undefined || a === undefined) return undefined;
  const dd = d ?? Math.max(0.05, 1 - h - a);
  const sum = h + dd + a;
  let home = Math.round((h / sum) * 100);
  let away = Math.round((a / sum) * 100);
  let draw = Math.round((dd / sum) * 100);
  // Rundungsrest auf den größten Posten legen, damit die Summe exakt 100 ergibt
  // (sonst kann draw als reiner Rest stark verzerren).
  const rest = 100 - (home + draw + away);
  if (rest !== 0) {
    const mx = Math.max(home, draw, away);
    if (mx === home) home += rest;
    else if (mx === away) away += rest;
    else draw += rest;
  }
  const tie = home === away;
  const fav = home > away ? homeName : awayName;
  const favPct = Math.max(home, away);
  const overUnder = overUnderFromOdds(odds);
  const spread = spreadFromOdds(odds, homeName, awayName);
  return {
    home,
    draw,
    away,
    confidence: favPct >= 60 ? "hoch" : favPct >= 45 ? "mittel" : "niedrig",
    overUnder,
    spread,
    keyFactors: [
      `Marktbasiertes Modell: Quoten von ${odds?.provider?.name ?? "Buchmachern"} in Wahrscheinlichkeiten umgerechnet`,
      tie
        ? `Ausgeglichenes Duell – beide Teams bei ${favPct} %`
        : `${fav} wird mit ${favPct} % als Favorit eingestuft`,
      `Remis-Wahrscheinlichkeit: ${draw} %`,
    ],
    tacticalSummary: tie
      ? `Der Markt sieht ein offenes Duell (je ${favPct} %). ` +
        `Die Remis-Wahrscheinlichkeit liegt bei ${draw} %; Standards und Umschaltmomente dürften den Ausschlag geben.`
      : `Das Modell sieht ${fav} vorn (${favPct} %). ` +
        `Je länger die Partie torlos bleibt, desto stärker steigt der Remis-Anteil von aktuell ${draw} % – ` +
        `der Außenseiter wird tief verteidigen und auf Standards sowie Umschaltmomente setzen.`,
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

/**
 * Tore aus den Scoreboard-„details" ziehen (Minute, Torschütze, Seite,
 * Elfmeter/Eigentor). ESPN markiert Tore mit scoringPlay bzw. type.text
 * „Goal …"; Elfmeterschießen wird ausgeklammert (separater Modus).
 */
function mapGoals(comp: Json, homeId: string, awayId: string): GoalEvent[] {
  const details: Json[] = comp?.details ?? [];
  const goals: GoalEvent[] = [];
  for (const d of details) {
    const typeText = String(d?.type?.text ?? "");
    const isGoal = d?.scoringPlay === true || /goal/i.test(typeText);
    if (!isGoal) continue;
    if (d?.shootout === true || /shootout/i.test(typeText)) continue;

    const teamId = String(d?.team?.id ?? "");
    const team: "home" | "away" | null =
      teamId === homeId ? "home" : teamId === awayId ? "away" : null;
    if (!team) continue;

    const athlete = (d?.athletesInvolved ?? [])[0];
    const scorer = String(athlete?.shortName ?? athlete?.displayName ?? "—");
    const clockLabel = String(d?.clock?.displayValue ?? "").trim();
    const minute = parseInt(clockLabel, 10);

    goals.push({
      minute: Number.isFinite(minute) ? minute : 0,
      clockLabel: clockLabel || (Number.isFinite(minute) ? `${minute}'` : ""),
      team,
      penalty: d?.penaltyKick === true || /penalty/i.test(typeText),
      ownGoal: d?.ownGoal === true || /own goal/i.test(typeText),
      scorer,
    });
  }
  // Nachspielzeit als Zweitschlüssel: 45' vor 45+3', 90' vor 90+2'. Beide tragen
  // dieselbe Basisminute, sonst stünde das spätere Tor evtl. zuerst.
  const stoppage = (label: string) => Number(label.match(/\+(\d+)/)?.[1] ?? 0);
  return goals.sort((a, b) => a.minute - b.minute || stoppage(a.clockLabel) - stoppage(b.clockLabel));
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

  const round = mapRound(ev.season?.slug);

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
    round,
  };

  if (status !== "upcoming") {
    const goals = mapGoals(comp, String(home.team?.id ?? ""), String(away.team?.id ?? ""));
    if (goals.length > 0) match.goals = goals;
  }

  // K.-o.-Entscheidung: wer kam weiter, und wie? `advance` markiert den
  // Aufsteiger (auch nach Elfmeterschießen), `shootoutScore` liefert die
  // Elfmeter-Tore, `detail` ("AET") verrät eine Verlängerung ohne Elfmeter.
  const isKnockout = round !== undefined && round !== "group-stage";
  if (isKnockout && status === "finished") {
    const homeSo = num(home.shootoutScore);
    const awaySo = num(away.shootoutScore);
    const hasShootout = homeSo > 0 || awaySo > 0;
    if (hasShootout) match.shootout = [homeSo, awaySo];

    if (home.advance === true || home.winner === true) match.advancedCode = homeCode;
    else if (away.advance === true || away.winner === true) match.advancedCode = awayCode;

    const detail = String(comp.status?.type?.detail ?? "");
    if (hasShootout && match.advancedCode) {
      const winnerName = teamByCode(match.advancedCode).name;
      match.decisionNote = `${winnerName} i. E. ${Math.max(homeSo, awaySo)}:${Math.min(homeSo, awaySo)}`;
    } else if (/aet|a\.e\.t|extra.?time/i.test(detail)) {
      match.decisionNote = "n. V.";
    }
  }

  // Prognose ausschließlich aus echten Buchmacherquoten (ESPN/DraftKings).
  // Für Platzhalter-Paarungen ("Sieger Gruppe A" etc.) gibt es keine Quoten/Prognose.
  const hasPlaceholder =
    placeholderTeam(home.team) !== null || placeholderTeam(away.team) !== null;

  if (status === "upcoming" && !hasPlaceholder && comp.odds?.[0]) {
    // Namen aus der Registry: dort steht der deutsche Name (z. B. "Kanada")
    match.prediction = predictionFromOdds(
      comp.odds[0],
      teamByCode(homeCode).name,
      teamByCode(awayCode).name
    );
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

/** ESPN-note.description (Qualifikationsstatus) eindeutschen. */
function germanizeQual(desc: unknown): string | undefined {
  const s = String(desc ?? "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("eliminat")) return "Ausgeschieden";
  if (s.includes("best") && s.includes("advance")) return "Bester Gruppendritter (mögl.)";
  if (s.includes("advance") || s.includes("qualif")) return "Weiter in die K.-o.-Runde";
  return String(desc);
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
      const statObj = (name: string) => (entry.stats ?? []).find((s: Json) => s?.name === name);
      const stat = (name: string) => num(statObj(name)?.value);
      registerTeam({ code, group });
      groupOfTeam[code] = group;
      const pd = statObj("pointDifferential");
      const rc = statObj("rankChange");
      const note = entry.note;
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
        goalDiff: pd ? num(pd.value ?? pd.displayValue) : undefined,
        rankChange: rc ? num(rc.value) : undefined,
        qualColor: typeof note?.color === "string" ? note.color : undefined,
        qualLabel: germanizeQual(note?.description),
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
  attendance?: number;
  officials?: { name: string; role: string }[];
  /**
   * Vor-Anstoß-Markt-Prognose aus dem Summary (pickcenter/odds). Anders als das
   * Scoreboard liefert der Summary-Endpoint die Quoten auch nach Anstoß noch,
   * sodass die Prognose bei laufenden/beendeten Spielen erhalten bleibt.
   */
  prediction?: Prediction;
}

/** ESPN-Offiziellen-Rolle eindeutschen. „Assistant" vor „Referee" prüfen. */
function germanRole(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("var") || r.includes("video")) return "Video-Assistent";
  if (r.includes("fourth") || r.includes("4th")) return "Vierter Offizieller";
  if (r.includes("assistant")) return "Assistent";
  if (r.includes("referee")) return "Schiedsrichter";
  return role || "Offizieller";
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
  // Passquote aus genauen/gesamten Pässen ableiten (ESPN liefert sie nicht direkt).
  const passAccuracy = (): [number, number] | undefined => {
    const ratio = (team: Json): number | undefined => {
      const acc = read(team, "accuratePasses");
      const tot = read(team, "totalPasses");
      return acc !== undefined && tot ? Math.round((acc / tot) * 100) : undefined;
    };
    const h = ratio(homeTeam);
    const a = ratio(awayTeam);
    return h === undefined || a === undefined ? undefined : [h, a];
  };
  const stats: MatchStats = {
    possession: pair("possessionPct"),
    shots: pair("totalShots"),
    shotsOnTarget: pair("shotsOnTarget"),
    blockedShots: pair("blockedShots"),
    passes: pair("totalPasses"),
    passAccuracy: passAccuracy(),
    crosses: pair("totalCrosses"),
    corners: pair("wonCorners"),
    offsides: pair("offsides"),
    tackles: pair("totalTackles"),
    interceptions: pair("interceptions"),
    clearances: pair("totalClearance"),
    saves: pair("saves"),
    fouls: pair("foulsCommitted"),
    yellowCards: pair("yellowCards"),
    redCards: pair("redCards"),
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

  // Fallback-Nummern (fehlendes Jersey) müssen über die gesamte Elf eindeutig
  // bleiben – sonst kollidieren zwei „1" und React-Keys/Anzeige werden doppelt.
  let fallbackNo = 0;
  const players: PlayerSlot[] = rows.flatMap((row) =>
    row.players.map((p, i) => ({
      name: String(p?.athlete?.shortName ?? p?.athlete?.displayName ?? "—"),
      number: num(p?.jersey) || ++fallbackNo,
      x: ((i + 1) / (row.players.length + 1)) * 100,
      y: row.y,
    }))
  );

  // Nur die echte ESPN-Formation übernehmen. Aus (evtl. fehlerhaft
  // gebucketeten) Positionsgruppen eine Formation zu „raten" führte zu
  // erfundenen Angaben wie „3-6-1" – lieber leer lassen (UI zeigt Fallback).
  const formation = String(rosterEntry?.formation ?? "").trim();

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

  const officialsRaw: Json[] = data?.gameInfo?.officials ?? [];
  const roleText = (o: Json) => String(o?.position?.displayName ?? o?.position?.name ?? "");
  const ref = officialsRaw.find((o) => /referee/i.test(roleText(o)) && !/assistant/i.test(roleText(o)))
    ?? officialsRaw.find((o) => /referee/i.test(roleText(o)))
    ?? officialsRaw[0];
  const officials = officialsRaw
    .map((o) => ({ name: String(o?.displayName ?? o?.fullName ?? ""), role: germanRole(roleText(o)) }))
    .filter((o) => o.name);

  const attendance = num(data?.gameInfo?.attendance) || undefined;

  // Vor-Anstoß-Prognose aus den (auch nachträglich verfügbaren) Summary-Quoten
  // rekonstruieren – DraftKings-Struktur in pickcenter[0]/odds[0] entspricht der
  // Scoreboard-Struktur, daher greift predictionFromOdds unverändert.
  const oddsObj = data?.pickcenter?.[0] ?? data?.odds?.[0];
  let prediction: Prediction | undefined;
  if (oddsObj) {
    const nameOf = (box: Json) =>
      teamByCode(String(box?.team?.abbreviation ?? "").toUpperCase()).name;
    prediction = predictionFromOdds(oddsObj, nameOf(homeBox), nameOf(awayBox));
  }

  return {
    stats: homeBox && awayBox ? mapStats(homeBox, awayBox) : undefined,
    lineups: homeLineup && awayLineup ? { home: homeLineup, away: awayLineup } : undefined,
    referee: ref?.displayName ?? ref?.fullName ?? undefined,
    attendance,
    officials: officials.length > 0 ? officials : undefined,
    prediction,
  };
}

/* ----------------------- Spielverlauf (Events) --------------------- */

/**
 * Ereignis-Zeitstrahl eines Spiels aus dem ESPN-Summary:
 * Tore/Karten/Wechsel aus `keyEvents` (mit Spieluhr) und Fouls aus dem
 * `commentary` ("Foul by Spieler (Team)."). Beide tragen eine Minute und
 * werden einer Seite (Heim/Auswärts) zugeordnet.
 */
export async function fetchMatchEvents(eventId: string): Promise<MatchEvent[]> {
  const data: Json = await getJson(`${SCOREBOARD}/summary?event=${eventId}`);
  const comps: Json[] = data?.header?.competitions?.[0]?.competitors ?? [];
  const home = comps.find((c) => c?.homeAway === "home");
  const away = comps.find((c) => c?.homeAway === "away");
  const homeId = String(home?.team?.id ?? home?.id ?? "");
  const awayId = String(away?.team?.id ?? away?.id ?? "");

  const names: { side: "home" | "away"; name: string }[] = [];
  for (const [side, c] of [["home", home], ["away", away]] as const) {
    for (const n of [c?.team?.displayName, c?.team?.name, c?.team?.shortDisplayName]) {
      if (n) names.push({ side, name: String(n).toLowerCase() });
    }
  }
  const sideById = (id: string): "home" | "away" | null =>
    id && id === homeId ? "home" : id && id === awayId ? "away" : null;
  const sideByName = (raw: string): "home" | "away" | null =>
    names.find((x) => x.name === raw.trim().toLowerCase())?.side ?? null;
  const minuteOf = (label: string): number => {
    const mm = label.match(/(\d+)/);
    return mm ? parseInt(mm[1], 10) : 0;
  };

  const events: MatchEvent[] = [];

  for (const e of (data?.keyEvents ?? []) as Json[]) {
    const typeText = String(e?.type?.text ?? "").toLowerCase();
    let type: MatchEvent["type"] | null = null;
    if (/goal/.test(typeText)) type = "goal";
    else if (/yellow.?red|second yellow/.test(typeText)) type = "yellowred";
    else if (/red card/.test(typeText)) type = "red";
    else if (/yellow card/.test(typeText)) type = "yellow";
    else if (/substitution/.test(typeText)) type = "sub";
    if (!type) continue;

    const side =
      sideById(String(e?.team?.id ?? "")) ?? sideByName(String(e?.team?.displayName ?? ""));
    if (!side) continue;

    const clockLabel = String(e?.clock?.displayValue ?? "").trim();
    const players = ((e?.participants ?? e?.athletesInvolved ?? []) as Json[])
      .map((a) => a?.athlete?.displayName ?? a?.displayName)
      .filter(Boolean)
      .map(String);

    events.push({
      minute: minuteOf(clockLabel),
      clockLabel: clockLabel || "—",
      type,
      team: side,
      player: players[0],
      playerOut: type === "sub" ? players[1] : undefined,
      detail: String(e?.text ?? ""),
    });
  }

  for (const c of (data?.commentary ?? []) as Json[]) {
    const text = String(c?.text ?? "");
    const fm = text.match(/^Foul by (.+?) \((.+?)\)\.?$/i);
    if (!fm) continue;
    const side = sideByName(fm[2]);
    if (!side) continue;
    const clockLabel = String(c?.time?.displayValue ?? "").trim();
    events.push({
      minute: minuteOf(clockLabel),
      clockLabel: clockLabel || "—",
      type: "foul",
      team: side,
      player: fm[1],
      detail: text,
    });
  }

  // Chronologisch; bei gleicher Minute Tore/Karten/Wechsel vor Fouls.
  const rank = (type: MatchEvent["type"]) => (type === "foul" ? 1 : 0);
  return events.sort((a, b) => a.minute - b.minute || rank(a.type) - rank(b.type));
}

/* ------------------- Play-by-Play (Momentum) ----------------------- */

/** ESPN-`play.type.text` → unsere momentum-relevante Aktionskategorie. */
function mapPlayType(typeText: string): PlayActionType | null {
  const s = typeText.toLowerCase();
  if (/goal/.test(s) && !/overturned|no goal|cancelled|disallow/.test(s)) return "goal";
  if (/shot on target|save|scored/.test(s)) return "shotOnTarget";
  if (/shot off target|missed|hit the (bar|post|woodwork)|blocked shot/.test(s))
    return "shotOffTarget";
  if (/corner/.test(s)) return "corner";
  if (/offside/.test(s)) return "offside";
  if (/foul/.test(s)) return "foul";
  if (/card/.test(s)) return "card";
  return null;
}

/**
 * Play-by-Play eines Spiels als momentum-relevante Aktionen aus dem
 * ESPN-`commentary`. Jede Aktion trägt Minute, Typ und – über `play.team`
 * bzw. den Freistoß-Text – eine echte Team-Zuordnung (Heim/Auswärts).
 * Das ist die reale Datenbasis für `deriveMomentum` (statt Toren + Rauschen).
 */
export async function fetchMatchPlays(eventId: string): Promise<PlayAction[]> {
  const data: Json = await getJson(`${SCOREBOARD}/summary?event=${eventId}`);
  const comps: Json[] = data?.header?.competitions?.[0]?.competitors ?? [];
  const home = comps.find((c) => c?.homeAway === "home");
  const away = comps.find((c) => c?.homeAway === "away");
  const homeId = String(home?.team?.id ?? home?.id ?? "");
  const awayId = String(away?.team?.id ?? away?.id ?? "");

  const names: { side: "home" | "away"; name: string }[] = [];
  for (const [side, c] of [["home", home], ["away", away]] as const) {
    for (const n of [c?.team?.displayName, c?.team?.name, c?.team?.shortDisplayName]) {
      if (n) names.push({ side, name: String(n).toLowerCase() });
    }
  }
  const sideById = (id: string): "home" | "away" | null =>
    id && id === homeId ? "home" : id && id === awayId ? "away" : null;
  const sideByName = (raw: string): "home" | "away" | null =>
    names.find((x) => x.name === raw.trim().toLowerCase())?.side ?? null;

  const plays: PlayAction[] = [];
  for (const c of (data?.commentary ?? []) as Json[]) {
    const play = c?.play;
    const type = mapPlayType(String(play?.type?.text ?? ""));
    if (!type) continue;

    const side =
      sideById(String(play?.team?.id ?? "")) ??
      sideByName(String(play?.team?.displayName ?? ""));
    if (!side) continue;

    const clockValue = Number(play?.clock?.value);
    const minute = Number.isFinite(clockValue)
      ? Math.max(1, Math.round(clockValue / 60))
      : parseInt(String(play?.clock?.displayValue ?? c?.time?.displayValue ?? ""), 10);
    if (!Number.isFinite(minute) || minute <= 0) continue;

    plays.push({ minute, type, team: side });
  }
  return plays.sort((a, b) => a.minute - b.minute);
}

/* --------------------------- News ---------------------------------- */

/**
 * Englische ESPN-Teamnamen → unsere Team-Codes. Nur damit kann eine News
 * dem richtigen Wappen zugeordnet werden (ESPN liefert in den News keine
 * Abkürzung, nur den englischen Namen). Unbekannte Namen → kein Wappen.
 */
const ESPN_TEAM_CODE: Record<string, string> = {
  Mexico: "MEX", Poland: "POL", "South Korea": "KOR", "Korea Republic": "KOR",
  "South Africa": "RSA", Canada: "CAN", Switzerland: "SUI", "Ivory Coast": "CIV",
  "Côte d'Ivoire": "CIV", Qatar: "QAT", "United States": "USA", USA: "USA",
  Uruguay: "URU", Japan: "JPN", "New Zealand": "NZL", France: "FRA", Senegal: "SEN",
  Australia: "AUS", Panama: "PAN", Germany: "GER", Brazil: "BRA", Tunisia: "TUN",
  Jordan: "JOR", Spain: "ESP", Morocco: "MAR", Serbia: "SRB", "Costa Rica": "CRC",
  England: "ENG", Colombia: "COL", Norway: "NOR", Uzbekistan: "UZB",
  Argentina: "ARG", Netherlands: "NED", Egypt: "EGY", Honduras: "HON",
  Portugal: "POR", Croatia: "CRO", Ghana: "GHA", Curacao: "CUW", "Curaçao": "CUW",
  Belgium: "BEL", Ecuador: "ECU", Mali: "MLI", "Saudi Arabia": "KSA", Italy: "ITA",
  Denmark: "DEN", Algeria: "ALG", "Cape Verde": "CPV", "Cabo Verde": "CPV",
  Nigeria: "NGA", Sweden: "SWE", Iran: "IRN", "IR Iran": "IRN", Peru: "PER",
  // Weitere mögliche Qualifikanten (werden zur Laufzeit via Standings registriert)
  Austria: "AUT", Ukraine: "UKR", Paraguay: "PAR", Scotland: "SCO", Wales: "WAL",
  Turkey: "TUR", "Türkiye": "TUR", Romania: "ROU", Greece: "GRE", Cameroon: "CMR",
  Jamaica: "JAM", Hungary: "HUN", Chile: "CHI", Venezuela: "VEN",
  "Czechia": "CZE", "Czech Republic": "CZE", "Republic of Ireland": "IRL",
  Ireland: "IRL", Iceland: "ISL", "North Macedonia": "MKD", Slovakia: "SVK",
  Slovenia: "SVN", Albania: "ALB", "Bosnia and Herzegovina": "BIH",
  Iraq: "IRQ", "United Arab Emirates": "UAE", Oman: "OMA",
};

/** Grobe deutsche Rubrik aus Schlagzeile/Text ableiten (ESPN liefert keine). */
function categorizeNews(text: string): NewsItem["category"] {
  const s = text.toLowerCase();
  if (/injur|fitness|doubt|strain|knock|hamstring|sidelined|ruled out|miss(?:es|ed)? training|recover|surgery/.test(s))
    return "Verletzung";
  if (/transfer|signing|signed|\bsign\b|deal|linked|\bmove\b|\bbid\b|\bloan\b|contract/.test(s))
    return "Transfer-Buzz";
  if (/tactic|formation|line-?up|starting xi|\bsystem\b|coach|manager|\bbench\b|rotat|set-?piece/.test(s))
    return "Taktik";
  return "Turnier";
}

/** Echte WM-News von ESPN (kostenlos, ohne Key) auf unser Modell mappen. */
export async function fetchNews(limit = 9): Promise<NewsItem[]> {
  const data: Json = await getJson(`${NEWS_URL}?limit=${limit}`);
  const articles: Json[] = data?.articles ?? [];
  const items: NewsItem[] = [];

  for (const a of articles) {
    const headline = String(a?.headline ?? "").trim();
    const published = String(a?.published ?? "");
    if (!headline || !published) continue;
    const summary = String(a?.description ?? "").trim();
    const url = a?.links?.web?.href ? String(a.links.web.href) : undefined;

    // Wappen nur, wenn die News genau EIN Team betrifft. ESPN listet die Teams
    // alphabetisch – bei Spielberichten (2+ Teams) wäre die Auswahl willkürlich.
    const teamCodes: string[] = [];
    for (const c of (a?.categories ?? []) as Json[]) {
      if (c?.type !== "team") continue;
      const code = ESPN_TEAM_CODE[String(c?.team?.description ?? c?.description ?? "")];
      if (code && !teamCodes.includes(code)) teamCodes.push(code);
    }

    items.push({
      id: String(a?.id ?? url ?? headline),
      category: categorizeNews(`${headline} ${summary}`),
      headline,
      summary,
      timestamp: published,
      teamCode: teamCodes.length === 1 ? teamCodes[0] : undefined,
      url,
    });
  }

  return items;
}
