/* ------------------------------------------------------------------ */
/*  Zentraler Daten-Store: lädt ausschließlich echte WM-Daten von der   */
/*  ESPN-API. Kein Mock-/Demo-Fallback – schlägt der Abruf fehl, wird    */
/*  ein ehrlicher Fehlerzustand gezeigt (source: "error"), keine         */
/*  erfundenen Inhalte.                                                  */
/*  - Ein Fetch pro Session (Singleton), 60-s-Polling bei Live-Spielen  */
/*  - useWmData(): Spiele + Tabellen + Quelle                           */
/*  - useMatch(id): Einzelspiel inkl. Detail-Anreicherung               */
/* ------------------------------------------------------------------ */

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  applyGroups,
  type Match,
  type MatchEvent,
  type MatchStatus,
  type NewsItem,
  type PlayAction,
  type StandingRow,
} from "../data/wm";
import {
  fetchMatchDetails,
  fetchMatchEvents,
  fetchMatchPlays,
  fetchMatches,
  fetchNews,
  fetchStandings,
} from "./api";

export type DataSource = "live" | "error";

export interface WmData {
  loading: boolean;
  source: DataSource;
  matches: Match[];
  standings: Record<string, StandingRow[]>;
  /** Kompletter Turnier-Spielplan (lazy geladen, null = noch nicht da). */
  schedule: Match[] | null;
  /** Echte WM-News von ESPN; leer, solange (oder falls) keine verfügbar sind. */
  news: NewsItem[];
}

let store: WmData = {
  loading: true,
  source: "live",
  matches: [],
  standings: {},
  schedule: null,
  news: [],
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
let scheduleRequested = false;

// Letzter Gruppenspieltag der WM 2026 (27. Juni); danach beginnt die K.-o.-Runde.
const GROUP_STAGE_END = new Date("2026-06-27T23:59:59Z");

/**
 * Gruppen-Fallback für Spiele ohne "Group X"-Note: nur setzen, wenn beide
 * Teams derselben Gruppe angehören und das Spiel in der Gruppenphase liegt.
 * Sonst würden K.-o.-Spiele fälschlich eine Gruppe erben.
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
    console.warn("[WM26] ESPN-API nicht erreichbar.", err);
    setStore({ loading: false, source: "error", matches: [], standings: {} });
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
        ? { ...m, stats: old.stats ?? m.stats, lineups: old.lineups ?? m.lineups, referee: old.referee ?? m.referee }
        : m;
    });
    setStore({ matches: merged });
  } catch {
    /* Polling-Fehler still ignorieren – letzter Stand bleibt sichtbar */
  }
}

/**
 * Echte News von ESPN laden – unabhängig vom Kern-Datenload. Schlägt der
 * Abruf fehl, bleibt die Liste leer: lieber keine News als veraltete.
 */
async function loadNews(): Promise<void> {
  try {
    const news = await fetchNews();
    setStore({ news });
  } catch (err) {
    console.warn("[WM26] News konnten nicht geladen werden.", err);
  }
}

let started = false;
function start(): void {
  if (started) return;
  started = true;
  void loadAll();
  void loadNews();
  setInterval(() => {
    if (store.matches.some((m) => m.status === "live")) void refreshScores();
  }, 60_000);
}

/** Erneuter Ladeversuch nach einem API-Fehler. */
export function retry(): void {
  setStore({ loading: true, source: "live", schedule: null });
  scheduleRequested = false;
  void loadAll();
  void loadNews();
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

async function loadSchedule(): Promise<void> {
  if (scheduleRequested) return;
  scheduleRequested = true;
  try {
    const matches = await fetchMatches(TOURNAMENT_START, TOURNAMENT_END);
    applyGroupFallback(matches);
    setStore({ schedule: matches });
  } catch (err) {
    console.warn("[WM26] Spielplan konnte nicht geladen werden.", err);
    scheduleRequested = false;
    setStore({ schedule: [], source: "error" });
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

  if (data.schedule === null) {
    // Noch am Laden (live) bzw. Fehlerfall (error -> leer, kein weiteres Laden)
    return { schedule: [], loading: data.source === "live", source: data.source };
  }
  // Kern-Store gewinnt: Polling hält dort Live-Scores aktuell
  const fresh = new Map(data.matches.map((m) => [m.id, m]));
  const schedule = data.schedule.map((m) => fresh.get(m.id) ?? m);
  return { schedule, loading: false, source: data.source };
}

/* --------------------- Einzelspiel + Details ----------------------- */

const enriched = new Set<string>();

export function useMatch(id: string | undefined): { match: Match | undefined; loading: boolean } {
  const data = useWmData();
  const match = id
    ? (data.matches.find((m) => m.id === id) ?? data.schedule?.find((m) => m.id === id))
    : undefined;

  // Deep-Link auf ein Spiel außerhalb des 3-Tage-Fensters: Spielplan nachladen.
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

/** Bezugszeitpunkt: das echte Jetzt. */
export function effectiveNow(): Date {
  return new Date();
}

/** Spiele eines Tages relativ zu „jetzt" (0 = heute, -1 = gestern). */
export function matchesOn(matches: Match[], dayOffset: number): Match[] {
  const ref = addDays(effectiveNow(), dayOffset);
  return matches.filter((m) => sameLocalDay(m.kickoff, ref));
}

export const liveOf = (matches: Match[]): Match[] =>
  matches.filter((m) => m.status === "live");

/* --------------------- Spielverlauf (Live-Events) ------------------ */

/**
 * Ereignis-Zeitstrahl eines Spiels (Tore, Karten, Wechsel, Fouls) aus dem
 * ESPN-Summary. Bei Live-Spielen alle 60 s aktualisiert. Nur im Live-Modus.
 */
export function useMatchEvents(
  id: string | undefined,
  status: MatchStatus | undefined
): { events: MatchEvent[]; loading: boolean } {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || status === undefined || status === "upcoming" || store.source !== "live") {
      setEvents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = (initial: boolean) => {
      if (initial) setLoading(true);
      fetchMatchEvents(id)
        .then((evs) => {
          if (!cancelled) setEvents(evs);
        })
        .catch(() => {
          if (!cancelled && initial) setEvents([]);
        })
        .finally(() => {
          if (!cancelled && initial) setLoading(false);
        });
    };
    load(true);
    const timer = status === "live" ? setInterval(() => load(false), 60_000) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id, status]);

  return { events, loading };
}

/* --------------------- Attack Momentum (Play-by-Play) -------------- */

/**
 * Echtes Play-by-Play eines Spiels (Schüsse, Ecken, Fouls …) aus dem
 * ESPN-`commentary` – Datenbasis für das Attack Momentum. Bei Live-Spielen
 * alle 60 s aktualisiert. Nur im Live-Modus für laufende/beendete Spiele.
 */
export function useMatchPlays(
  id: string | undefined,
  status: MatchStatus | undefined
): { plays: PlayAction[]; loading: boolean } {
  const [plays, setPlays] = useState<PlayAction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id || status === undefined || status === "upcoming" || store.source !== "live") {
      setPlays([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = (initial: boolean) => {
      if (initial) setLoading(true);
      fetchMatchPlays(id)
        .then((ps) => {
          if (!cancelled) setPlays(ps);
        })
        .catch(() => {
          if (!cancelled && initial) setPlays([]);
        })
        .finally(() => {
          if (!cancelled && initial) setLoading(false);
        });
    };
    load(true);
    const timer = status === "live" ? setInterval(() => load(false), 60_000) : undefined;
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id, status]);

  return { plays, loading };
}
