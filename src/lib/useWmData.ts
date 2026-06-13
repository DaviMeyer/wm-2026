/* ------------------------------------------------------------------ */
/*  Zentraler Daten-Store: lädt echte WM-Daten von der ESPN-API und    */
/*  fällt bei Fehlern transparent auf die Mock-Daten zurück.           */
/*  - Ein Fetch pro Session (Singleton), 60-s-Polling bei Live-Spielen */
/*  - useWmData(): Spiele + Tabellen + Quelle                          */
/*  - useMatch(id): Einzelspiel inkl. Detail-Anreicherung (Summary)    */
/* ------------------------------------------------------------------ */

import { useEffect, useSyncExternalStore } from "react";
import { applyGroups, MATCHES, STANDINGS, type Match, type StandingRow } from "../data/wm";
import { fetchMatchDetails, fetchMatches, fetchStandings } from "./api";

export type DataSource = "live" | "mock";

export interface WmData {
  loading: boolean;
  source: DataSource;
  matches: Match[];
  standings: Record<string, StandingRow[]>;
  /** Kompletter Turnier-Spielplan (lazy geladen, null = noch nicht da). */
  schedule: Match[] | null;
}

let store: WmData = {
  loading: true,
  source: "mock",
  matches: MATCHES,
  standings: STANDINGS,
  schedule: null,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setStore(next: Partial<WmData>) {
  store = { ...store, ...next };
  emit();
}

const addDays = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

let groupOf: Record<string, string> = {};

// Letzter Gruppenspieltag der WM 2026 (27. Juni); danach beginnt die K.-o.-Runde.
const GROUP_STAGE_END = new Date("2026-06-27T23:59:59Z");

/**
 * Gruppen-Fallback für Spiele ohne "Group X"-Note: nur setzen, wenn beide
 * Teams derselben Gruppe angehören. Sonst würden K.-o.-Spiele, sobald die
 * Paarung feststeht, fälschlich die Gruppe des Heimteams erben (und z. B.
 * im Spielplan-Filter als Gruppenphase auftauchen). Spiele nach dem letzten
 * Gruppenspieltag erhalten nie eine Gruppe – auch wenn zwei Teams derselben
 * Gruppe (z. B. im Finale) erneut aufeinandertreffen.
 */
function applyGroupFallback(matches: Match[]): void {
  for (const m of matches) {
    if (m.group) continue;
    if (new Date(m.kickoff) > GROUP_STAGE_END) continue;
    const g = groupOf[m.homeCode];
    if (g && groupOf[m.awayCode] === g) m.group = g;
  }
}

async function loadAll(): Promise<void> {
  try {
    const standings = await fetchStandings();
    groupOf = standings.groupOfTeam;
    applyGroups(groupOf);

    const now = new Date();
    const matches = await fetchMatches(addDays(now, -1), addDays(now, 1));
    applyGroupFallback(matches);
    setStore({ loading: false, source: "live", matches, standings: standings.table });
  } catch (err) {
    console.warn("[WM26] ESPN-API nicht erreichbar – Demo-Daten aktiv.", err);
    setStore({ loading: false, source: "mock" });
  }
}

/** Nur Spielstände auffrischen; angereicherte Details bleiben erhalten. */
async function refreshScores(): Promise<void> {
  if (store.source !== "live") return;
  try {
    const now = new Date();
    const fresh = await fetchMatches(addDays(now, -1), addDays(now, 1));
    applyGroupFallback(fresh);
    const prev = new Map(store.matches.map((m) => [m.id, m]));
    const merged = fresh.map((m) => {
      const old = prev.get(m.id);
      return old
        ? { ...m, stats: old.stats ?? m.stats, lineups: old.lineups ?? m.lineups, momentum: old.momentum, referee: old.referee ?? m.referee }
        : m;
    });
    setStore({ matches: merged });
  } catch {
    /* Polling-Fehler still ignorieren – letzter Stand bleibt sichtbar */
  }
}

let started = false;
function start(): void {
  if (started) return;
  started = true;
  void loadAll();
  setInterval(() => {
    if (store.matches.some((m) => m.status === "live")) void refreshScores();
  }, 60_000);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => store;

/** Globale WM-Daten (löst beim ersten Aufruf den API-Load aus). */
export function useWmData(): WmData {
  useEffect(start, []);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/* ------------------------- Spielplan ------------------------------- */

// Feste Turnierdaten (lokale Zeit): 11. Juni bis 19. Juli 2026
const TOURNAMENT_START = new Date(2026, 5, 11);
const TOURNAMENT_END = new Date(2026, 6, 19);

let scheduleRequested = false;

async function loadSchedule(): Promise<void> {
  if (scheduleRequested) return;
  scheduleRequested = true;
  try {
    const matches = await fetchMatches(TOURNAMENT_START, TOURNAMENT_END);
    applyGroupFallback(matches);
    setStore({ schedule: matches });
  } catch (err) {
    console.warn("[WM26] Spielplan konnte nicht geladen werden.", err);
    // Fallback: wenigstens das 3-Tage-Fenster des Kern-Stores zeigen
    setStore({ schedule: [...store.matches] });
  }
}

/** Kompletter Turnier-Spielplan; Live-Spielstände überlagern die Plandaten. */
export function useSchedule(): { schedule: Match[]; loading: boolean; source: DataSource } {
  const data = useWmData();

  useEffect(() => {
    if (!data.loading && data.source === "live" && data.schedule === null) {
      void loadSchedule();
    }
  }, [data.loading, data.source, data.schedule]);

  const base =
    data.schedule ?? (data.source === "mock" && !data.loading ? data.matches : null);
  if (base === null) {
    return { schedule: [], loading: true, source: data.source };
  }
  // Kern-Store gewinnt: Polling hält dort Live-Scores aktuell
  const fresh = new Map(data.matches.map((m) => [m.id, m]));
  const schedule = base.map((m) => fresh.get(m.id) ?? m);
  return { schedule, loading: false, source: data.source };
}

/* --------------------- Einzelspiel + Details ----------------------- */

const enriched = new Set<string>();

export function useMatch(id: string | undefined): { match: Match | undefined; loading: boolean } {
  const data = useWmData();
  const match = id
    ? (data.matches.find((m) => m.id === id) ?? data.schedule?.find((m) => m.id === id))
    : undefined;

  // Deep-Link auf ein Spiel außerhalb des 3-Tage-Fensters (z. B. Reload auf
  // einer Spielplan-Partie): Spielplan nachladen, statt "nicht gefunden".
  const needSchedule =
    id !== undefined &&
    !data.loading &&
    data.source === "live" &&
    match === undefined &&
    data.schedule === null;
  useEffect(() => {
    if (needSchedule) void loadSchedule();
  }, [needSchedule]);

  const wantDetails =
    data.source === "live" &&
    match !== undefined &&
    match.status !== "upcoming" &&
    !enriched.has(match.id);

  useEffect(() => {
    if (!wantDetails || !match) return;
    enriched.add(match.id);
    fetchMatchDetails(match.id)
      .then((details) => {
        const apply = (m: Match): Match =>
          m.id === match.id
            ? {
                ...m,
                stats: details.stats ?? m.stats,
                lineups: details.lineups ?? m.lineups,
                referee: details.referee ?? m.referee,
              }
            : m;
        setStore({
          matches: store.matches.map(apply),
          schedule: store.schedule ? store.schedule.map(apply) : store.schedule,
        });
      })
      .catch(() => enriched.delete(match.id));
  }, [wantDetails, match]);

  return { match, loading: data.loading || needSchedule };
}

/* ------------------------- Selektoren ------------------------------ */

const sameLocalDay = (iso: string, ref: Date) =>
  new Date(iso).toDateString() === ref.toDateString();

// Bezugstag der Mock-Daten (12. Juni 2026, lokal). Im Demo-Modus laufen die
// "Heute"/"Gestern"-Selektoren gegen diesen Tag, sonst wären sie außerhalb des
// fixen Mock-Fensters (11.–13. Juni) immer leer.
const MOCK_NOW = new Date(2026, 5, 12, 12, 0, 0);

/** Bezugszeitpunkt: echter Takt im Live-Modus, fixer Mock-Tag im Demo-Modus. */
export function effectiveNow(): Date {
  return store.source === "mock" ? new Date(MOCK_NOW) : new Date();
}

/** Spiele eines Tages relativ zu „jetzt" (0 = heute, -1 = gestern). */
export function matchesOn(matches: Match[], dayOffset: number): Match[] {
  const ref = addDays(effectiveNow(), dayOffset);
  return matches.filter((m) => sameLocalDay(m.kickoff, ref));
}

export const liveOf = (matches: Match[]): Match[] =>
  matches.filter((m) => m.status === "live");
