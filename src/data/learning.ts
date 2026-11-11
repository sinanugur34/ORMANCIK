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
  /** Distinct days with an independent correct answer. Missing on older saves. */
  independentDays?: number;
  lastIndependentDay?: number;
  /** Independent corrects on a different picture. */
  transferIndependent?: number;
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
  /** Transfer is a different picture from the one used to introduce the word. */
  variant?: 'find' | 'transfer' | 'listen';
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
  const day = dayStamp(now);
  let independentDays = base.independentDays ?? 0;
  let lastIndependentDay = base.lastIndependentDay ?? 0;
  let transferIndependent = base.transferIndependent ?? 0;
  if (correct && attempt.independent) {
    if (day !== lastIndependentDay) {
      independentDays += 1;
      lastIndependentDay = day;
    }
    if (attempt.variant === 'transfer') transferIndependent += 1;
  }
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
    independentDays,
    lastIndependentDay,
    transferIndependent,
  };
}

export function isDue(stat: WordStat, now = Date.now()): boolean {
  return stat.reviewAt > 0 && stat.reviewAt <= now;
}

function dayStamp(now: number): number {
  const date = new Date(now);
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

export type FamilyStatus = 'met' | 'helped' | 'solo' | 'recalled';

/** What a family can honestly say. A single sitting is not "remembered later". */
export function familyStatus(stat: WordStat): FamilyStatus {
  if ((stat.independentDays ?? 0) >= 2 && (stat.transferIndependent ?? 0) >= 1) return 'recalled';
  if (stat.independent > 0) return 'solo';
  if (stat.hinted > 0) return 'helped';
  return 'met';
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
    independentDays: asCount(stat.independentDays),
    lastIndependentDay: asCount(stat.lastIndependentDay),
    transferIndependent: asCount(stat.transferIndependent),
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
    independentDays: Math.max(a.independentDays ?? 0, b.independentDays ?? 0),
    lastIndependentDay: Math.max(a.lastIndependentDay ?? 0, b.lastIndependentDay ?? 0),
    transferIndependent: Math.max(a.transferIndependent ?? 0, b.transferIndependent ?? 0),
  };
}

/**
 * Fold old color names, then add each new attempt once.
 * Running this again on the result does not add the same attempt twice.
 */
export function commitAttempts(
  prev: Record<string, Partial<WordStat> | undefined> | undefined,
  attempts: WordAttempt[],
  now = Date.now(),
): Record<string, WordStat> {
  const wordProgress = mergeWordProgress(prev);
  for (const attempt of attempts) {
    const id = canonicalWordId(attempt.id);
    if (!id || id === 'color.unknown' || id.startsWith('room.')) continue;
    wordProgress[id] = applyAttempt(wordProgress[id], { ...attempt, id }, now);
  }
  return wordProgress;
}

/** One color keeps one record. Older names such as `red` or `berry` fold into `color.*`. */
export function mergeWordProgress(
  raw: Record<string, Partial<WordStat> | undefined> | undefined,
): Record<string, WordStat> {
  const out: Record<string, WordStat> = {};
  if (!raw) return out;
  for (const [id, stat] of Object.entries(raw)) {
    if (!stat || typeof stat !== 'object' || id.startsWith('room.')) continue;
    const key = canonicalWordId(id);
    const next = normalizeStat(key, stat);
    const prev = out[key];
    out[key] = prev ? combineStats(prev, next) : next;
  }
  return out;
}
