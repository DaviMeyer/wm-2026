import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { CalendarDays, ChevronRight, ExternalLink, MapPin, Newspaper } from "lucide-react";
import { teamByCode, venueById, type Match, type NewsItem } from "../data/wm";
import { ErrorState, LiveBadge, Pill, SectionHeader, Skeleton, TeamCrest } from "../components/ui";
import { AIPredictionCard } from "../components/ai/AIPredictionCard";
import { FavoritesBar } from "../components/dashboard/FavoritesBar";
import { effectiveNow, liveOf, matchesOn, retry, useWmData } from "../lib/useWmData";
import { cn, kickoffUser, timeAgo } from "../lib/utils";

/** "Fr., 12. Juni" relativ zum Bezugstag. */
function dayLabel(base: Date, offsetDays: number): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(base.getTime() + offsetDays * 86_400_000));
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Heute · 21:00 Uhr", "Morgen · …", sonst "Sa., 13. Juni · …" – datumsgenau. */
function relativeKickoff(match: Match): string {
  const diffDays = Math.round((startOfDay(new Date(match.kickoff)) - startOfDay(effectiveNow())) / 86_400_000);
  const prefix =
    diffDays === 0
      ? "Heute"
      : diffDays === 1
        ? "Morgen"
        : diffDays === -1
          ? "Gestern"
          : new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long" }).format(
              new Date(match.kickoff)
            );
  return `${prefix} · ${kickoffUser(match)} Uhr`;
}

/* ---------------- Framer-Motion-Orchestrierung ---------------- */

const page: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

/* ---------------------- Hero: Live-Match ----------------------- */

function HeroLiveCard({ match }: { match: Match }) {
  const home = teamByCode(match.homeCode);
  const away = teamByCode(match.awayCode);
  const venue = venueById(match.venueId);

  return (
    <Link
      to={`/match/${match.id}`}
      aria-label={`Zum Match-Center: ${home.name} gegen ${away.name}`}
      className="card group relative block cursor-pointer overflow-hidden p-4 shadow-[0_0_60px_-18px_rgb(205_245_66/0.25)] transition-colors duration-200 hover:border-volt-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400 sm:p-8"
    >
      {/* dezenter Volt-Glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(560px 220px at 18% 0%, rgb(205 245 66 / 0.08), transparent 65%), radial-gradient(560px 220px at 82% 100%, rgb(56 189 248 / 0.07), transparent 65%)",
        }}
        aria-hidden="true"
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          {match.status === "live" ? (
            <LiveBadge minute={match.minute} />
          ) : match.status === "finished" ? (
            <Pill tone="neutral">Endstand</Pill>
          ) : (
            <span className="font-mono text-sm font-semibold text-zinc-200">
              {relativeKickoff(match)}
            </span>
          )}
          <span className="label-caps">{match.group ? `Gruppe ${match.group}` : "WM 2026"}</span>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
          {/* Heim */}
          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:gap-3">
            <TeamCrest code={home.code} size="xl" />
            <div className="min-w-0 max-w-full">
              <p className="hyphens-auto break-words font-display text-sm font-extrabold text-zinc-50 sm:text-lg">
                {home.name}
              </p>
              <p className="label-caps mt-0.5 text-volt-400/80">Heim</p>
            </div>
          </div>

          {/* Score */}
          {match.status === "upcoming" ? (
            <span className="display-num text-4xl text-zinc-600 sm:text-7xl">–</span>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-4">
              <span className="display-num text-4xl text-volt-400 sm:text-7xl">
                {match.homeScore}
              </span>
              <span className="display-num text-2xl text-zinc-600 sm:text-5xl">:</span>
              <span className="display-num text-4xl text-azure-400 sm:text-7xl">
                {match.awayScore}
              </span>
            </div>
          )}

          {/* Auswärts */}
          <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:gap-3">
            <TeamCrest code={away.code} size="xl" />
            <div className="min-w-0 max-w-full">
              <p className="hyphens-auto break-words font-display text-sm font-extrabold text-zinc-50 sm:text-lg">
                {away.name}
              </p>
              <p className="label-caps mt-0.5 text-azure-400/80">Auswärts</p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-zinc-400">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
            <span className="truncate">
              {venue.stadium} · {venue.city}
            </span>
          </p>
          <span className="flex items-center gap-1 text-sm font-semibold text-volt-400 transition-colors duration-200 group-hover:text-volt-300">
            Match-Center
            <ChevronRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>

      {/* Score-Änderungen für Screenreader ankündigen, ohne zu unterbrechen */}
      {match.status === "live" && (
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          Live, {match.minute}. Minute. Spielstand: {home.name} {match.homeScore}, {away.name}{" "}
          {match.awayScore}.
        </div>
      )}
    </Link>
  );
}

/* --------------------- Heute: Match-Karte ----------------------- */

function TodayMatchCard({ match }: { match: Match }) {
  const home = teamByCode(match.homeCode);
  const away = teamByCode(match.awayCode);
  const venue = venueById(match.venueId);
  const isLive = match.status === "live";

  return (
    <Link
      to={`/match/${match.id}`}
      aria-label={`${home.name} gegen ${away.name}, Details öffnen`}
      className={cn(
        "card group block cursor-pointer p-4 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400",
        isLive ? "border-volt-400/30 hover:border-volt-400/50" : "hover:border-zinc-600"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {isLive ? (
          <LiveBadge minute={match.minute} />
        ) : (
          <span className="font-mono text-sm tabular-nums text-zinc-300">
            {kickoffUser(match)} Uhr
          </span>
        )}
        <span className="label-caps">{match.group ? `Gruppe ${match.group}` : "WM 2026"}</span>
      </div>

      <div className="mt-3.5 space-y-2.5">
        {(
          [
            [home, match.homeScore, "home"],
            [away, match.awayScore, "away"],
          ] as const
        ).map(([team, score, side]) => (
          <div key={team.code} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <TeamCrest code={team.code} size="md" />
              <span className="truncate text-sm font-semibold text-zinc-100">{team.name}</span>
            </span>
            {isLive && (
              <span
                className={cn(
                  "display-num shrink-0 text-xl",
                  side === "home" ? "text-volt-400" : "text-azure-400"
                )}
              >
                {score}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3.5 flex items-center gap-1.5 border-t border-line pt-3 text-xs text-zinc-500 transition-colors duration-200 group-hover:text-zinc-400">
        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">
          {venue.city} · {venue.stadium}
        </span>
      </p>
    </Link>
  );
}

/* ------------------ Gestern: kompakte Ergebniszeile ------------------ */

function ResultRow({ match }: { match: Match }) {
  const home = teamByCode(match.homeCode);
  const away = teamByCode(match.awayCode);
  const venue = venueById(match.venueId);

  return (
    <Link
      to={`/match/${match.id}`}
      aria-label={`Ergebnis: ${home.name} ${match.homeScore} zu ${match.awayScore} gegen ${away.name}`}
      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5 transition-colors duration-200 hover:bg-zinc-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400 sm:gap-3 sm:px-3"
    >
      <span className="label-caps hidden w-14 shrink-0 sm:block">
        {match.group ? `Gr. ${match.group}` : "WM"}
      </span>
      <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-medium text-zinc-200">{home.name}</span>
        <TeamCrest code={home.code} size="sm" />
      </span>
      <span className="display-num shrink-0 rounded-lg bg-pitch-800 px-2 py-1 text-sm text-zinc-100 sm:px-2.5">
        {match.homeScore}&thinsp;:&thinsp;{match.awayScore}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <TeamCrest code={away.code} size="sm" />
        <span className="truncate text-sm font-medium text-zinc-200">{away.name}</span>
      </span>
      <span className="hidden shrink-0 text-xs text-zinc-500 sm:block">{venue.city}</span>
    </Link>
  );
}

/* ------------------------------ News ------------------------------ */

const NEWS_TONE: Record<NewsItem["category"], "volt" | "azure" | "signal" | "gold"> = {
  Verletzung: "signal",
  Taktik: "azure",
  Turnier: "volt",
  "Transfer-Buzz": "gold",
};

function NewsCard({ item }: { item: NewsItem }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <Pill tone={NEWS_TONE[item.category]}>{item.category}</Pill>
        <span className="font-mono text-[11px] text-zinc-500">
          {timeAgo(item.timestamp, new Date())}
        </span>
      </div>
      <h3 className="font-display text-sm font-extrabold leading-snug text-zinc-100">
        {item.headline}
      </h3>
      {item.summary && <p className="text-sm leading-relaxed text-zinc-400">{item.summary}</p>}
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        {item.teamCode ? (
          <span className="flex min-w-0 items-center gap-2">
            <TeamCrest code={item.teamCode} size="sm" />
            <span className="truncate text-xs font-medium text-zinc-500">
              {teamByCode(item.teamCode).name}
            </span>
          </span>
        ) : (
          <span />
        )}
        {item.url && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-volt-400 transition-colors duration-200 group-hover:text-volt-300">
            ESPN
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </div>
    </>
  );

  const className =
    "card flex flex-col gap-2.5 p-4 transition-colors duration-200 hover:border-zinc-600";

  return item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${item.headline} – Artikel bei ESPN öffnen`}
      className={cn(
        className,
        "group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400"
      )}
    >
      {content}
    </a>
  ) : (
    <article className={className}>{content}</article>
  );
}

/* ----------------------------- Seite ------------------------------ */

export default function Dashboard() {
  const { matches, source, loading, news } = useWmData();
  const now = effectiveNow();
  const live = liveOf(matches);
  const today = matchesOn(matches, 0);
  // Auch ein Spiel, das gestern anstieß und (z. B. durch Verlängerung) noch
  // läuft, gehört in die Gestern-Liste – nicht nur abgeschlossene Partien.
  const yesterday = matchesOn(matches, -1).filter((m) => m.status !== "upcoming");
  const featured =
    live[0] ??
    today.find((m) => m.status === "upcoming" && m.prediction) ??
    today[0] ??
    matches.find((m) => m.status === "upcoming");
  // Das Hero-Spiel nicht zusätzlich als Karte im Heute-Grid doppeln.
  const todayList = featured ? today.filter((m) => m.id !== featured.id) : today;

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Spieldaten werden geladen">
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44 max-sm:hidden" />
          <Skeleton className="h-44 max-lg:hidden" />
        </div>
      </div>
    );
  }

  if (source === "error") {
    return <ErrorState onRetry={retry} />;
  }

  return (
    <motion.div
      variants={page}
      initial="hidden"
      animate="show"
      className="space-y-8 sm:space-y-10"
    >
      {/* Favoriten-Schnellzugriff + Datenquelle */}
      <motion.section variants={rise} aria-label="Favoriten-Schnellzugriff">
        <FavoritesBar
          trailing={
            <Pill tone="volt">Live-Daten · ESPN</Pill>
          }
        />
      </motion.section>

      {/* Hero: Live-Match + KI-Prognose */}
      {featured && (
        <motion.section variants={rise} aria-label="Live-Match im Fokus">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <HeroLiveCard match={featured} />
            <AIPredictionCard match={featured} />
          </div>
        </motion.section>
      )}

      {/* Heute */}
      <motion.section variants={rise} aria-label="Heutige Spiele">
        <SectionHeader
          title="Heute"
          hint="Alle Partien des Spieltags – Zeiten in deiner Zeitzone"
          action={
            <span className="label-caps flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {dayLabel(now, 0)}
            </span>
          }
        />
        {todayList.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {todayList.map((m) => (
              <TodayMatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <p className="card p-6 text-center text-sm text-zinc-500">
            {today.length === 0
              ? "Heute stehen keine Partien an."
              : "Die heutige Partie siehst du oben im Fokus."}
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <Link
            to="/spielplan"
            className="flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-2 text-sm font-semibold text-volt-400 transition-colors duration-200 hover:text-volt-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt-400"
          >
            Kompletter Spielplan
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </motion.section>

      {/* Gestern */}
      {yesterday.length > 0 && (
        <motion.section variants={rise} aria-label="Ergebnisse von gestern">
          <SectionHeader title="Gestern" hint={`Endstände vom ${dayLabel(now, -1)}`} />
          <div className="card divide-y divide-line p-1.5">
            {yesterday.map((m) => (
              <ResultRow key={m.id} match={m} />
            ))}
          </div>
        </motion.section>
      )}

      {/* News – nur echte ESPN-Schlagzeilen; ohne verfügbare News ausgeblendet */}
      {news.length > 0 && (
        <motion.section variants={rise} aria-label="Aktuelle Meldungen">
          <SectionHeader
            title="News & Buzz"
            hint="Aktuelle Schlagzeilen rund um die WM · Quelle: ESPN"
            action={
              <span className="label-caps flex items-center gap-1.5">
                <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                {news.length} Meldungen
              </span>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
