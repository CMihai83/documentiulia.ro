/**
 * EXP-7 — pure assessment logic: seedable item selection + auto-grading.
 * No I/O; fully unit-tested. The PRNG is the same mulberry32 the simulator uses,
 * so item selection is reproducible for a given seed.
 */

export interface QuizItem {
  id: string;
  question: string;
  options: string[];
  /** index into options — NEVER serve this field to a taker. */
  correct: number;
}

export interface ServedItem {
  id: string;
  question: string;
  options: string[];
}

export interface GradeResult {
  scorePct: number;
  passed: boolean;
  correctCount: number;
  total: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministically pick `count` items for a given seed (Fisher–Yates on a copy). */
export function selectItems(items: QuizItem[], count: number, seed: number): QuizItem[] {
  const rng = mulberry32(seed);
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

/** Strip answers before serving to a taker. */
export function stripAnswers(items: QuizItem[]): ServedItem[] {
  return items.map(({ id, question, options }) => ({ id, question, options }));
}

/** Grade a set of answers ({itemId: chosenIndex}) against the full items. */
export function grade(items: QuizItem[], answers: Record<string, number>, passScorePct = 70): GradeResult {
  const total = items.length;
  if (total === 0) return { scorePct: 0, passed: false, correctCount: 0, total: 0 };
  let correctCount = 0;
  for (const item of items) {
    if (answers[item.id] === item.correct) correctCount += 1;
  }
  const scorePct = Math.round((correctCount / total) * 100);
  return { scorePct, passed: scorePct >= passScorePct, correctCount, total };
}

/** Aggregate peer-review rubric scores (simple mean, rounded). */
export function aggregatePeerScores(scores: number[]): number {
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
