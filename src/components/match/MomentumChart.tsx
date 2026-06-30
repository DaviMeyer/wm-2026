import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MomentumPoint } from "../../data/wm";
import { useTheme } from "../../lib/theme";
import { cn } from "../../lib/utils";

/* ---------------------------------------------------------------- */
/*  Attack Momentum – Spielverlauf als Balkendiagramm                */
/*  Wert > 0 = Heimteam dominiert (Volt), < 0 = Gastteam (Azure)     */
/* ---------------------------------------------------------------- */

function MomentumTooltip({
  active,
  payload,
  homeName,
  awayName,
}: {
  active?: boolean;
  payload?: { payload: MomentumPoint }[];
  homeName: string;
  awayName: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const isHome = point.value >= 0;
  const strength = Math.abs(point.value);
  const verb =
    strength >= 55 ? "dominiert" : strength >= 25 ? "macht Druck" : "leicht am Drücker";
  return (
    <div className="max-w-[240px] rounded-lg border border-line bg-pitch-850 px-3 py-2 shadow-xl">
      <p className="font-mono text-xs leading-relaxed text-zinc-200">
        {point.minute}′ —{" "}
        <span className={isHome ? "text-volt-400" : "text-azure-400"}>
          {isHome ? homeName : awayName}
        </span>{" "}
        {verb}
      </p>
    </div>
  );
}

export function MomentumChart({
  momentum,
  homeName,
  awayName,
  className,
  estimated = false,
}: {
  momentum: MomentumPoint[];
  homeName: string;
  awayName: string;
  className?: string;
  /** true = aus Toren & Ballbesitz geschätzt (kein echtes Live-Momentum). */
  estimated?: boolean;
}) {
  // Recharts braucht feste Farb-Props. useTheme triggert ein Re-Render bei
  // Modus-/Akzentwechsel; die Balkenfarben holen wir aus den CSS-Variablen
  // (folgen damit dem Akzent), Achsen/Text aus dem aufgelösten Modus.
  const { resolvedMode } = useTheme();
  const css = getComputedStyle(document.documentElement);
  const volt = css.getPropertyValue("--color-volt-400").trim() || "#cdf542";
  const azure = css.getPropertyValue("--color-azure-400").trim() || "#38bdf8";
  const axisColor = css.getPropertyValue("--color-pitch-700").trim() || "#27272e";
  const tickColor = resolvedMode === "dark" ? "#71717a" : "#52525b";
  const zeroColor = resolvedMode === "dark" ? "#52525b" : "#b4b8c0";
  const cursorFill = resolvedMode === "dark" ? "rgb(255 255 255 / 0.06)" : "rgb(9 9 11 / 0.05)";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="font-display text-sm font-extrabold tracking-tight text-zinc-100">
          Attack Momentum
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-volt-400" aria-hidden="true" />
            <span className="truncate">{homeName}</span>
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-azure-400" aria-hidden="true" />
            <span className="truncate">{awayName}</span>
          </span>
        </div>
      </div>

      <div className="h-36 w-full min-w-0 sm:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={momentum}
            margin={{ top: 6, right: 4, bottom: 0, left: 4 }}
            barCategoryGap="18%"
          >
            <XAxis
              dataKey="minute"
              ticks={[15, 30, 45, 60, 75, 90]}
              interval={0}
              tickFormatter={(m: number) => `${m}'`}
              tickLine={false}
              axisLine={{ stroke: axisColor }}
              tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
            />
            <YAxis hide domain={[-100, 100]} />
            <ReferenceLine y={0} stroke={zeroColor} strokeWidth={1} />
            <Tooltip
              cursor={{ fill: cursorFill }}
              content={<MomentumTooltip homeName={homeName} awayName={awayName} />}
            />
            <Bar dataKey="value" maxBarSize={6} radius={[2, 2, 2, 2]}>
              {momentum.map((p) => (
                <Cell
                  key={p.minute}
                  fill={p.value >= 0 ? volt : azure}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {estimated && (
        <p className="mt-2 text-[11px] leading-snug text-zinc-600">
          Geschätzt aus Toren &amp; Ballbesitz – die Datenquelle liefert kein Live-Momentum.
        </p>
      )}
    </div>
  );
}
