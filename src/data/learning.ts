/** Word-level learning record. Stored on the child profile, on device. */

export type EnglishLevel = 'new' | 'some' | 'ready';

export type WordStat = {
  id: string;
  skill: 'listen-recognize';
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
  return {
    ...base,
    id: attempt.id,
    skill: 'listen-recognize',
    attempts: base.attempts + 1,
    independent: base.independent + (attempt.independent ? 1 : 0),
    hinted: base.hinted + (attempt.independent ? 0 : 1),
    firstTry: base.firstTry + (attempt.firstTry ? 1 : 0),
    lastAt: now,
    reviewAt: now + (attempt.independent ? 2 * DAY_MS : DAY_MS),
  };
}

export function isDue(stat: WordStat, now = Date.now()): boolean {
  return stat.reviewAt > 0 && stat.reviewAt <= now;
}
