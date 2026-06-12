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
}

let store: WmData = {
  loading: true,
  source: "mock",
  matches: MATCHES,
  standings: STANDINGS,
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

async function loadAll(): Promise<void> {
  try {
    const standings = await fetchStandings();
    groupOf = standings.groupOfTeam;
    applyGroups(groupOf);

    const now = new Date();
    const matches = await fetchMatches(addDays(now, -1), addDays(now, 1));
    for (const m of matches) {
      if (!m.group) m.group = groupOf[m.homeCode] ?? "";
    }
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
    const prev = new Map(store.matches.map((m) => [m.id, m]));
    const merged = fresh.map((m) => {
      const old = prev.get(m.id);
      if (!m.group) m.group = groupOf[m.homeCode] ?? "";
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

/* --------------------- Einzelspiel + Details ----------------------- */

const enriched = new Set<string>();

export function useMatch(id: string | undefined): { match: Match | undefined; loading: boolean } {
  const data = useWmData();
  const match = id ? data.matches.find((m) => m.id === id) : undefined;
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
        setStore({
          matches: store.matches.map((m) =>
            m.id === match.id
              ? {
                  ...m,
                  stats: details.stats ?? m.stats,
                  lineups: details.lineups ?? m.lineups,
                  referee: details.referee ?? m.referee,
                }
              : m
          ),
        });
      })
      .catch(() => enriched.delete(match.id));
  }, [wantDetails, match]);

  return { match, loading: data.loading };
}

/* ------------------------- Selektoren ------------------------------ */

const sameLocalDay = (iso: string, ref: Date) =>
  new Date(iso).toDateString() === ref.toDateString();

/** Spiele eines Tages relativ zu heute (0 = heute, -1 = gestern). */
export function matchesOn(matches: Match[], dayOffset: number): Match[] {
  const ref = addDays(new Date(), dayOffset);
  return matches.filter((m) => sameLocalDay(m.kickoff, ref));
}

export const liveOf = (matches: Match[]): Match[] =>
  matches.filter((m) => m.status === "live");
