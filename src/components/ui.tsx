import type { ReactNode } from "react";
import { teamByCode } from "../data/wm";
import { cn } from "../lib/utils";

/* ---------------------------------------------------------------- */
/*  Geteilte UI-Primitives – konsistenter Look über alle Seiten      */
/* ---------------------------------------------------------------- */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-zinc-50">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-sm text-zinc-500">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** Pulsierender Live-Indikator. */
export function LiveBadge({ minute }: { minute?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-volt-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-volt-400">
      <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-volt-400" />
      Live{typeof minute === "number" && ` · ${minute}′`}
    </span>
  );
}

/**
 * Team-Roundel: Verlauf aus den Teamfarben + FIFA-Trigramm.
 * Bewusst statt Flaggen-Emojis (rendern auf Windows nicht) –
 * funktioniert offline und bleibt visuell konsistent.
 *
 * Standardmäßig dekorativ (aria-hidden), weil das Wappen fast immer direkt
 * neben dem sichtbaren Teamnamen steht – sonst läse ein Screenreader den
 * Namen doppelt vor. Steht das Wappen allein, mit `decorative={false}`
 * den Teamnamen als Label ausgeben.
 */
export function TeamCrest({
  code,
  size = "md",
  className,
  decorative = true,
}: {
  code: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  decorative?: boolean;
}) {
  const team = teamByCode(code);
  const dims = {
    sm: "h-6 w-6 text-[8px]",
    md: "h-8 w-8 text-[9px]",
    lg: "h-11 w-11 text-[11px]",
    xl: "h-14 w-14 text-[13px] sm:h-16 sm:w-16 sm:text-sm",
  }[size];
  const [c1, c2] = team.colors;
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `Wappen ${team.name}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold tracking-wider ring-1 ring-white/15",
        dims,
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c1} 55%, ${c2} 56%)`,
        color: pickReadable(c1),
        textShadow: "0 1px 2px rgb(0 0 0 / 0.55)",
      }}
    >
      {team.short ?? team.code}
    </span>
  );
}

function pickReadable(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum =
    0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160 ? "#09090b" : "#fafafa";
}

/** Formkurve: letzte 5 Spiele als farbige Punkte. */
export function FormDots({ form }: { form: ("S" | "U" | "N")[] }) {
  const color = { S: "bg-volt-400", U: "bg-zinc-500", N: "bg-signal-400" };
  const label = { S: "Sieg", U: "Unentschieden", N: "Niederlage" };
  if (form.length === 0) {
    return (
      <span className="font-mono text-[10px] text-zinc-600" aria-label="Form nicht verfügbar">
        –
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`Formkurve, letzte ${form.length}: ${form.map((f) => label[f]).join(", ")}`}
    >
      {form.map((f, i) => (
        <span
          key={i}
          title={label[f]}
          aria-hidden="true"
          className={cn("h-1.5 w-1.5 rounded-full", color[f])}
        />
      ))}
    </span>
  );
}

/** Horizontaler Vergleichsbalken (z. B. Ballbesitz, xG). */
export function StatBar({
  label,
  home,
  away,
  format = (v) => String(v),
  highlightWinner = true,
}: {
  label: string;
  home: number;
  away: number;
  format?: (v: number) => string;
  highlightWinner?: boolean;
}) {
  const actualTotal = home + away;
  const total = actualTotal || 1;
  const homeWins = highlightWinner && home > away;
  const awayWins = highlightWinner && away > home;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 font-mono text-sm">
        <span className={cn("shrink-0 tabular-nums", homeWins ? "font-semibold text-volt-400" : "text-zinc-300")}>
          {format(home)}
        </span>
        <span className="label-caps min-w-0 truncate text-center">{label}</span>
        <span className={cn("shrink-0 tabular-nums", awayWins ? "font-semibold text-azure-400" : "text-zinc-300")}>
          {format(away)}
        </span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-pitch-800">
        {actualTotal === 0 ? (
          // Beide Werte 0 (z. B. 0 Ecken früh im Spiel): neutraler Balken statt leerer Spur
          <div className="w-full rounded-full bg-pitch-700" />
        ) : (
          <>
            <div
              className="rounded-full bg-volt-400/80 transition-all duration-500"
              style={{ width: `${(home / total) * 100}%` }}
            />
            <div
              className="rounded-full bg-azure-400/80 transition-all duration-500"
              style={{ width: `${(away / total) * 100}%` }}
            />
          </>
        )}
      </div>
    </div>
  );
}

/** Eleganter Lade-Skeleton-Block. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

/** Kleine Kategorie-/Status-Pille. */
export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "volt" | "azure" | "signal" | "gold";
  className?: string;
}) {
  const tones = {
    neutral: "bg-pitch-800 text-zinc-400",
    volt: "bg-volt-400/10 text-volt-400",
    azure: "bg-azure-400/10 text-azure-400",
    signal: "bg-signal-400/10 text-signal-400",
    gold: "bg-gold-400/10 text-gold-400",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tones,
        className
      )}
    >
      {children}
    </span>
  );
}
