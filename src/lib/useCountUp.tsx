import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

/**
 * Zählt bei Erscheinen bzw. Wertänderung sanft von 0 auf `value` hoch – ein
 * dezenter „Broadcast"-Effekt für Zahlen (Prozente, Punkte, Scores).
 * Respektiert prefers-reduced-motion: setzt den Wert dann ohne Animation.
 */
export function CountUp({
  value,
  duration = 0.8,
  className,
  format = (v) => String(v),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (v: number) => string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(Math.round(v)));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, duration, reduce, mv]);

  return <motion.span className={className}>{text}</motion.span>;
}
