import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import type { Match } from "../../data/wm";
import { cn } from "../../lib/utils";

/* ---------------------------------------------------------------- */
/*  Taktische KI-Analyse: Fließtext-Zusammenfassung zum Spiel        */
/* ---------------------------------------------------------------- */

export function AITacticalSummary({
  match,
  className,
}: {
  match: Match;
  className?: string;
}) {
  const prediction = match.prediction;
  if (!prediction) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("card p-5", className)}
    >
      <h3 className="flex items-center gap-2 font-display text-sm font-extrabold uppercase tracking-wider text-zinc-100">
        <BrainCircuit className="h-4 w-4 text-azure-400" aria-hidden="true" />
        Markteinschätzung
      </h3>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-zinc-300">
        {prediction.tacticalSummary}
      </p>
      <p className="mt-4 border-t border-line pt-3 text-xs text-zinc-600">
        Modellhafte Einschätzung aus Buchmacherquoten · ESPN/DraftKings
      </p>
    </motion.div>
  );
}
