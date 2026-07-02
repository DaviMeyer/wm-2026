import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";

/* ---------------------------------------------------------------- */
/*  ScoreFlip – zeigt einen Score-Wert. Ändert er sich (Tor!), klappt */
/*  die neue Zahl mit 3D-Rotation herein. Beim ersten Mount passiert  */
/*  nichts (initial=false). Reduced-motion: schlichter Crossfade.     */
/* ---------------------------------------------------------------- */

export function ScoreFlip({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span
      className={cn("relative inline-block tabular-nums", className)}
      style={{ perspective: 600 }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="inline-block"
          initial={reduce ? { opacity: 0 } : { rotateX: -90, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { rotateX: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
