import { TEAMS } from "../data/wm";

/* ------------------------------------------------------------------ */
/*  Monte-Carlo-Turniersimulator auf Basis der TEAMS-Ratings           */
/*                                                                    */
/*  Modell:                                                           */
/*  - Siegwahrscheinlichkeit: logistisch, p = 1/(1+10^((rB-rA)/25))   */
/*  - Formfaktor: ±3 Rating-Punkte Streuung pro Turnierlauf           */
/*  - Gruppenphase: Round-Robin, ~22 % Remisquote, 3/1/0 Punkte       */
/*  - Top 2 je Gruppe + 8 beste Gruppendritte -> 32er-K.-o.-Baum      */
/*  - K.-o.: kein Remis, p entscheidet direkt                         */
/* ------------------------------------------------------------------ */

export interface SimResult {
  championPct: Record<string, number>;
  finalistPct: Record<string, number>;
  semifinalPct: Record<string, number>;
  runs: number;
}

const DRAW_PROB = 0.22;

/** Siegwahrscheinlichkeit von Team A gegen Team B (logistisches Modell). */
function winProb(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 25));
}

export function simulateTournament(runs: number): SimResult {
  const n = TEAMS.length;
  const baseRating = new Float64Array(n);
  for (let i = 0; i < n; i++) baseRating[i] = TEAMS[i].rating;

  // Gruppen einmalig als Index-Listen auflösen.
  // Teams ohne Gruppe (im realen Turnier nicht qualifiziert) bleiben außen vor.
  const groupMap = new Map<string, number[]>();
  for (let i = 0; i < n; i++) {
    const g = TEAMS[i].group;
    if (!g) continue;
    const arr = groupMap.get(g);
    if (arr) arr.push(i);
    else groupMap.set(g, [i]);
  }
  const groups = [...groupMap.values()].filter((idx) => idx.length >= 2);

  const championCount = new Float64Array(n);
  const finalistCount = new Float64Array(n);
  const semifinalCount = new Float64Array(n);

  // Wiederverwendete Puffer (keine Allokationen in der heißen Schleife)
  const rating = new Float64Array(n);
  const score = new Float64Array(n); // Punkte*10 + Zufall (vereinfachte Tordifferenz)
  const knockout = new Array<number>(32);
  const thirds = new Array<number>(groups.length);

  for (let run = 0; run < runs; run++) {
    // Tagesform pro Turnierlauf
    for (let i = 0; i < n; i++) {
      rating[i] = baseRating[i] + (Math.random() * 6 - 3);
      score[i] = 0;
    }

    /* ---------------------------- Gruppenphase --------------------- */
    let q = 0;
    for (let g = 0; g < groups.length; g++) {
      const idx = groups[g];
      for (let a = 0; a < 4; a++) {
        for (let b = a + 1; b < 4; b++) {
          const ia = idx[a];
          const ib = idx[b];
          if (Math.random() < DRAW_PROB) {
            score[ia] += 10;
            score[ib] += 10;
          } else if (Math.random() < winProb(rating[ia], rating[ib])) {
            score[ia] += 30;
          } else {
            score[ib] += 30;
          }
        }
      }
      // Tiebreak: kleiner Zufallsanteil (< 10) bricht Punktgleichheit
      for (let a = 0; a < 4; a++) score[idx[a]] += Math.random() * 9;

      // Top 2 per einfacher Selektion (nur 4 Teams, Sort unnötig)
      let first = idx[0];
      let second = -1;
      for (let a = 1; a < 4; a++) {
        const t = idx[a];
        if (score[t] > score[first]) {
          second = first;
          first = t;
        } else if (second === -1 || score[t] > score[second]) {
          second = t;
        }
      }
      let third = -1;
      for (let a = 0; a < 4; a++) {
        const t = idx[a];
        if (t === first || t === second) continue;
        if (third === -1 || score[t] > score[third]) third = t;
      }
      knockout[q++] = first;
      knockout[q++] = second;
      thirds[g] = third;
    }

    // Die 8 besten Gruppendritten qualifizieren sich
    thirds.sort((x, y) => score[y] - score[x]);
    for (let i = 0; i < 8; i++) knockout[q++] = thirds[i];

    /* ---------------------------- K.-o.-Runden --------------------- */
    // Zufällige Bracket-Zuordnung (Fisher-Yates)
    for (let i = 31; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = knockout[i];
      knockout[i] = knockout[j];
      knockout[j] = tmp;
    }

    // Sechzehntel-, Achtel- und Viertelfinale: 32 -> 4
    let size = 32;
    while (size > 4) {
      for (let i = 0; i < size; i += 2) {
        const a = knockout[i];
        const b = knockout[i + 1];
        knockout[i >> 1] = Math.random() < winProb(rating[a], rating[b]) ? a : b;
      }
      size >>= 1;
    }

    // Halbfinale
    for (let i = 0; i < 4; i++) semifinalCount[knockout[i]]++;
    const f1 =
      Math.random() < winProb(rating[knockout[0]], rating[knockout[1]])
        ? knockout[0]
        : knockout[1];
    const f2 =
      Math.random() < winProb(rating[knockout[2]], rating[knockout[3]])
        ? knockout[2]
        : knockout[3];
    finalistCount[f1]++;
    finalistCount[f2]++;

    // Finale
    const champ = Math.random() < winProb(rating[f1], rating[f2]) ? f1 : f2;
    championCount[champ]++;
  }

  const championPct: Record<string, number> = {};
  const finalistPct: Record<string, number> = {};
  const semifinalPct: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const code = TEAMS[i].code;
    championPct[code] = (championCount[i] / runs) * 100;
    finalistPct[code] = (finalistCount[i] / runs) * 100;
    semifinalPct[code] = (semifinalCount[i] / runs) * 100;
  }

  return { championPct, finalistPct, semifinalPct, runs };
}
