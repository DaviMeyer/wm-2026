import { motion, useReducedMotion } from "framer-motion";

/* ---------------------------------------------------------------- */
/*  Konfetti-Burst – kurzer Partikel-Ausbruch (Tor / K.-o.-Sieger).  */
/*  Deterministisch aus dem Partikel-Index (kein Zufall → stabil beim */
/*  Re-Render). Bei prefers-reduced-motion wird nichts gerendert.     */
/* ---------------------------------------------------------------- */

const COUNT = 16;
const PARTICLES = Array.from({ length: COUNT }, (_, i) => i);

export function Confetti({
  burstKey,
  colors,
}: {
  /** Ändert sich der Key, feuert der Burst erneut (via Remount). */
  burstKey: number | string;
  /** Partikelfarben (z. B. beide Team-Farben). */
  colors: string[];
}) {
  const reduce = useReducedMotion();
  if (reduce) return null;

  return (
    <div
      key={burstKey}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-visible"
      aria-hidden="true"
    >
      {PARTICLES.map((i) => {
        const angle = (i / COUNT) * Math.PI * 2;
        // Kompakter Radius: bleibt auch in kleineren Karten (K.-o.-Baum, die per
        // overflow-hidden clippen) weitgehend sichtbar.
        const dist = 34 + (i % 4) * 16;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist - 18; // leichter Drall nach oben
        const color = colors[i % colors.length] ?? "#cdf542";
        return (
          <motion.span
            key={i}
            className="absolute h-2 w-1.5 rounded-[1px]"
            style={{ backgroundColor: color }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{ x, y, opacity: [1, 1, 0], rotate: (i % 2 ? 1 : -1) * 320 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: (i % 5) * 0.015 }}
          />
        );
      })}
    </div>
  );
}
