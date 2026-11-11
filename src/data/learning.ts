import { LEGACY_COLOR_IDS } from '../theme/colorNames';

/** Word-level learning record. Stored on the child profile, on device. */

export type EnglishLevel = 'new' | 'some' | 'ready';

/** What an entry actually measured. Counting is not the same as hearing the English word. */
export type LearningSkill = 'listen-recognize' | 'count-quantity';

export type WordStat = {
  id: string;
  skill: LearningSkill;
  independent: number;
  hinted: number;
  firstTry: number;
  attempts: number;
  lastAt: number;
  /** Next time this word should be practiced again. */
  reviewAt: number;
};

export type WordAttempt = {
  id: string;
  independent: boolean;
  firstTry: boolean;
  /**
   * False for a wrong entry. `attempts` counts every entry, including wrong ones.
   * Independent and hinted count only correct entries.
   */
  correct: boolean;
  /** Defaults to listen-recognize when an older caller omits it. */
  skill?: LearningSkill;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function applyAttempt(prev: WordStat | undefined, attempt: WordAttempt, now = Date.now()): WordStat {
  const base = prev ?? {
    id: attempt.id,
    skill: 'listen-recognize' as const,
    independent: 0,
    hinted: 0,
    firstTry: 0,
    attempts: 0,
    lastAt: 0,
    reviewAt: 0,
  };
  const correct = attempt.correct !== false;
  return {
    ...base,
    id: attempt.id,
    skill: attempt.skill ?? base.skill,
    attempts: base.attempts + 1,
    independent: base.independent + (correct && attempt.independent ? 1 : 0),
    hinted: base.hinted + (correct && !attempt.independent ? 1 : 0),
    firstTry: base.firstTry + (correct && attempt.firstTry ? 1 : 0),
    lastAt: now,
    reviewAt: correct ? now + (attempt.independent ? 2 * DAY_MS : DAY_MS) : now,
  };
}

export function isDue(stat: WordStat, now = Date.now()): boolean {
  return stat.reviewAt > 0 && stat.reviewAt <= now;
}

export function canonicalWordId(id: string): string {
  return LEGACY_COLOR_IDS[id] ?? id;
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function normalizeStat(id: string, stat: Partial<WordStat>): WordStat {
  return {
    id,
    skill: stat.skill === 'count-quantity' ? 'count-quantity' : 'listen-recognize',
    independent: asCount(stat.independent),
    hinted: asCount(stat.hinted),
    firstTry: asCount(stat.firstTry),
    attempts: asCount(stat.attempts),
    lastAt: asCount(stat.lastAt),
    reviewAt: asCount(stat.reviewAt),
  };
}

function combineStats(a: WordStat, b: WordStat): WordStat {
  const reviewAt =
    a.reviewAt > 0 && b.reviewAt > 0 ? Math.min(a.reviewAt, b.reviewAt) : Math.max(a.reviewAt, b.reviewAt);
  return {
    id: a.id,
    skill: a.skill === b.skill ? a.skill : a.lastAt >= b.lastAt ? a.skill : b.skill,
    independent: a.independent + b.independent,
    hinted: a.hinted + b.hinted,
    firstTry: a.firstTry + b.firstTry,
    attempts: a.attempts + b.attempts,
    lastAt: Math.max(a.lastAt, b.lastAt),
    reviewAt,
  };
}

/** One color keeps one record. Older names such as `red` or `berry` fold into `color.*`. */
export function mergeWordProgress(
  raw: Record<string, Partial<WordStat> | undefined> | undefined,
): Record<string, WordStat> {
  const out: Record<string, WordStat> = {};
  if (!raw) return out;
  for (const [id, stat] of Object.entries(raw)) {
    if (!stat || typeof stat !== 'object') continue;
    const key = canonicalWordId(id);
    const next = normalizeStat(key, stat);
    const prev = out[key];
    out[key] = prev ? combineStats(prev, next) : next;
  }
  return out;
}
