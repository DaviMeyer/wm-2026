import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Plus, Star } from "lucide-react";
import { DEFAULT_FAVORITES, TEAMS, teamByCode } from "../../data/wm";
import { TeamCrest } from "../ui";
import { useWmData } from "../../lib/useWmData";
import { cn } from "../../lib/utils";

const STORAGE_KEY = "wm26-favorites";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((c) => typeof c === "string")) {
        return parsed;
      }
    }
  } catch {
    /* localStorage nicht verfügbar oder korrupt – Fallback */
  }
  return DEFAULT_FAVORITES;
}

/**
 * Horizontale Favoriten-Leiste mit Schnellzugriff:
 * Chips mit TeamCrest + Formkurve, Stern zum Entfernen,
 * aufklappbare Liste zum Hinzufügen weiterer Teams.
 */
export function FavoritesBar({
  className,
  trailing,
}: {
  className?: string;
  /** Rechtsbündiges Extra (z. B. Datenquellen-Pill) – außerhalb des Scrollers. */
  trailing?: ReactNode;
}) {
  // Abonniert den Daten-Store: Nach dem Live-Sync verlieren nicht
  // qualifizierte Teams ihre Gruppe und fallen aus der Auswahl.
  const data = useWmData();
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* Speichern optional */
    }
  }, [favorites]);

  // Nach dem Live-Sync nicht qualifizierte Teams dauerhaft aus den Favoriten
  // entfernen, damit sie nicht unsichtbar in localStorage hängen bleiben.
  useEffect(() => {
    if (data.loading) return;
    setFavorites((prev) => {
      const cleaned = prev.filter((code) => teamByCode(code).group);
      return cleaned.length === prev.length ? prev : cleaned;
    });
  }, [data.loading]);

  const remove = (code: string) =>
    setFavorites((prev) => prev.filter((c) => c !== code));
  const add = (code: string) =>
    setFavorites((prev) => (prev.includes(code) ? prev : [...prev, code]));

  // Nur echte WM-Teilnehmer (Teams mit Gruppe) anzeigen
  const visibleFavorites = favorites.filter((code) => teamByCode(code).group);
  const available = TEAMS.filter((t) => t.group && !favorites.includes(t.code)).sort(
    (a, b) => a.name.localeCompare(b.name, "de")
  );

  // Picker schließen, sobald keine Teams mehr zur Auswahl stehen.
  useEffect(() => {
    if (pickerOpen && available.length === 0) setPickerOpen(false);
  }, [available.length, pickerOpen]);

  // Picker per Klick außerhalb oder Escape schließen.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  return (
    <div ref={rootRef} className={className}>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain pb-1">
          <span className="label-caps mr-1 shrink-0">Favoriten</span>

        {visibleFavorites.length === 0 && (
          <span className="shrink-0 text-xs italic text-zinc-500">
            Noch keine ausgewählt
          </span>
        )}

        {visibleFavorites.map((code) => {
          const team = teamByCode(code);
          return (
            <span
              key={code}
              className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-pitch-900/80 px-3 transition-colors duration-200 hover:border-zinc-600"
            >
              <TeamCrest code={code} size="sm" />
              <span className="max-w-36 truncate text-xs font-semibold leading-tight text-zinc-200">
                {team.name}
              </span>
              <button
                type="button"
                onClick={() => remove(code)}
                aria-label={`${team.name} aus Favoriten entfernen`}
                title="Aus Favoriten entfernen"
                className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-gold-400 transition-colors duration-200 hover:bg-zinc-500/10 hover:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400"
              >
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
            </span>
          );
        })}

        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          aria-expanded={pickerOpen}
          className={cn(
            "flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-line px-3 text-xs font-semibold text-zinc-400 transition-colors duration-200 hover:border-zinc-600 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400",
            pickerOpen && "border-solid border-zinc-600 text-zinc-200"
          )}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Team hinzufügen
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              pickerOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
        </div>

        {trailing && <div className="shrink-0 whitespace-nowrap pb-1">{trailing}</div>}
      </div>

      {pickerOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="card mt-2 flex max-h-72 flex-wrap content-start gap-2 overflow-y-auto overscroll-contain p-3"
        >
          {available.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Alle Teams sind bereits Favoriten.
            </p>
          ) : (
            available.map((team) => (
              <button
                key={team.code}
                type="button"
                onClick={() => add(team.code)}
                aria-label={`${team.name} zu Favoriten hinzufügen`}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-xs font-medium text-zinc-300 transition-colors duration-200 hover:bg-zinc-500/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400"
              >
                <TeamCrest code={team.code} size="sm" />
                {team.name}
                <Star className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
              </button>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
