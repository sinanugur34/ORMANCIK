import { LEGACY_COLOR_IDS } from '../theme/colorNames';

/** Word-level learning record. Stored on the child profile, on device. */

export type EnglishLevel = 'new' | 'some' | 'ready';

/** What an entry actually measured. Counting is not the same as hearing the English word. */
export type LearningSkill = 'listen-recognize' | 'picture-match' | 'count-quantity' | 'prompt-incomplete';

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
  /**
   * Distinct local days with a heard, independent correct answer.
   * A new day counts only in a later session, after a few hours.
   * Missing on older saves.
   */
  independentDays?: number;
  lastIndependentDay?: number;
  /** Clock time of the latest heard independent answer. */
  lastIndependentAt?: number;
  /** App session of that answer. A new launch or profile switch changes it. */
  lastSessionId?: number;
  /** Independent corrects after the prompt finished. Picture matches are separate. */
  heardIndependent?: number;
  /** Independent corrects on a different picture, after the prompt finished. */
  transferIndependent?: number;
};

export type LearningNote = {
  /** Stable id for one attempt. Word and time alone can repeat inside one lesson. */
  eventId: string;
  id: string;
  at: number;
  correct: boolean;
  independent: boolean;
  skill: LearningSkill;
};

export type PracticeResult = 'tried' | 'seen' | 'helped-seen' | 'solo' | 'helped' | 'unfinished';

/** Wrong answers stay wrong. Skill and help are read only after that. */
export function practiceResult(note: Pick<LearningNote, 'correct' | 'independent' | 'skill'>): PracticeResult {
  if (note.skill === 'prompt-incomplete') return note.correct ? 'unfinished' : 'tried';
  if (!note.correct) return 'tried';
  if (note.skill === 'picture-match') return note.independent ? 'seen' : 'helped-seen';
  return note.independent ? 'solo' : 'helped';
}

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
/** Long enough that one sitting across midnight is not "remembered another time". */
const HEARD_GAP_MS = 4 * 60 * 60 * 1000;
const RECENT_LIMIT = 40;

let learningSessionId = Date.now();

export function currentLearningSession(): number {
  return learningSessionId;
}

export function nextLearningSession(): number {
  learningSessionId += 1;
  return learningSessionId;
}

export function localDayStamp(now: number, timeZone?: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(now));
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return year * 10000 + month * 100 + day;
}

function shiftLocalDay(now: number, days: number, timeZone?: string): number {
  const stamp = localDayStamp(now, timeZone);
  const year = Math.floor(stamp / 10000);
  const month = Math.floor((stamp % 10000) / 100);
  const day = stamp % 100;
  return localDayStamp(Date.UTC(year, month - 1, day + days, 12, 0, 0), timeZone);
}

export type PracticeDay = 'today' | 'yesterday' | 'earlier';

export function practiceDay(at: number, now = Date.now(), timeZone?: string): PracticeDay {
  const day = localDayStamp(at, timeZone);
  if (day === localDayStamp(now, timeZone)) return 'today';
  if (day === shiftLocalDay(now, -1, timeZone)) return 'yesterday';
  return 'earlier';
}

/**
 * A finished line, or an answer while that line is still playing, is listening.
 * A line that was cut off or failed is not, even when some audio had already started.
 */
export function skillAfterPrompt(
  requested: LearningSkill,
  outcome: 'played' | 'muted' | 'failed' | 'cut' | 'started' | null,
  started = false,
): LearningSkill {
  if (requested === 'count-quantity') return 'count-quantity';
  if (outcome === 'muted') return 'picture-match';
  if (outcome === 'cut' || outcome === 'failed') return started ? 'prompt-incomplete' : 'picture-match';
  if (outcome === 'played' || outcome === 'started' || started) return 'listen-recognize';
  return 'picture-match';
}

function heardSoFar(prev: WordStat | undefined): number {
  if (!prev) return 0;
  if (typeof prev.heardIndependent === 'number') return prev.heardIndependent;
  if (prev.skill === 'picture-match' || prev.skill === 'prompt-incomplete') return 0;
  return prev.independent;
}

export function applyAttempt(
  prev: WordStat | undefined,
  attempt: WordAttempt,
  now = Date.now(),
  meta?: { sessionId?: number; timeZone?: string },
): WordStat {
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
  const skill = attempt.skill ?? base.skill;
  const partial = skill === 'prompt-incomplete';
  const heardSkill = skill === 'listen-recognize';
  let independentDays = base.independentDays ?? 0;
  let lastIndependentDay = base.lastIndependentDay ?? 0;
  let lastIndependentAt = base.lastIndependentAt ?? 0;
  let lastSessionId = base.lastSessionId ?? 0;
  let transferIndependent = base.transferIndependent ?? 0;
  let heardIndependent = heardSoFar(prev);
  if (correct && attempt.independent && heardSkill) {
    heardIndependent += 1;
    const sessionId = meta?.sessionId ?? currentLearningSession();
    const day = localDayStamp(now, meta?.timeZone);
    const first = lastIndependentDay === 0;
    const laterDay = day !== lastIndependentDay;
    const laterSession = sessionId !== lastSessionId;
    const priorAt = lastIndependentAt > 0 ? lastIndependentAt : base.lastAt;
    const gap = priorAt > 0 ? now - priorAt : 0;
    if (first || (priorAt > 0 && laterDay && laterSession && gap >= HEARD_GAP_MS)) {
      independentDays += 1;
      lastIndependentDay = day;
    }
    lastIndependentAt = now;
    lastSessionId = sessionId;
    if (attempt.variant === 'transfer') transferIndependent += 1;
  }
  return {
    ...base,
    id: attempt.id,
    skill,
    attempts: base.attempts + 1,
    independent: base.independent + (correct && attempt.independent && !partial ? 1 : 0),
    hinted: base.hinted + (correct && !attempt.independent && !partial ? 1 : 0),
    firstTry: base.firstTry + (correct && attempt.firstTry && !partial ? 1 : 0),
    lastAt: now,
    reviewAt: correct && !partial ? now + (attempt.independent ? 2 * DAY_MS : DAY_MS) : correct ? now + DAY_MS : now,
    independentDays,
    lastIndependentDay,
    lastIndependentAt,
    lastSessionId,
    heardIndependent,
    transferIndependent,
  };
}

export function isDue(stat: WordStat, now = Date.now()): boolean {
  return stat.reviewAt > 0 && stat.reviewAt <= now;
}

export type FamilyStatus = 'met' | 'helped' | 'solo' | 'recalled' | 'seen';

export function heardIndependentCount(stat: WordStat): number {
  return heardSoFar(stat);
}

/** Listening lessons skip a word only after it was heard, not after a silent picture match. */
export function knownWordIds(progress: Record<string, WordStat | undefined>, now = Date.now()): string[] {
  return Object.values(progress)
    .filter((stat): stat is WordStat => stat != null && heardIndependentCount(stat) >= 2 && !isDue(stat, now))
    .map((stat) => stat.id);
}

/** Unaided picture matches. Counting successes and heard answers stay in their own counts. */
export function pictureIndependentCount(stat: WordStat): number {
  if (stat.skill === 'count-quantity' || stat.id.startsWith('count-')) return 0;
  return Math.max(0, stat.independent - heardIndependentCount(stat));
}

/** One row when a save has word totals but no per-attempt notes. An unaided picture match stays unaided. */
export function practiceNoteFromStat(stat: WordStat): LearningNote {
  return {
    eventId: `legacy-${stat.id}-${stat.lastAt}`,
    id: stat.id,
    at: stat.lastAt,
    correct: stat.independent + stat.hinted > 0,
    independent: stat.independent > 0,
    skill: stat.skill,
  };
}

/** What a family can honestly say. One sitting, or a silent match, is not "remembered later". */
export function familyStatus(stat: WordStat): FamilyStatus {
  const heard = heardSoFar(stat);
  if ((stat.independentDays ?? 0) >= 2 && (stat.transferIndependent ?? 0) >= 1 && heard > 0) return 'recalled';
  if (heard > 0) return 'solo';
  if (stat.skill === 'prompt-incomplete' && pictureIndependentCount(stat) > 0) return 'seen';
  if (stat.skill === 'picture-match' && (stat.independent > 0 || stat.hinted > 0)) return 'seen';
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
    skill:
      stat.skill === 'count-quantity' ||
      stat.skill === 'picture-match' ||
      stat.skill === 'listen-recognize' ||
      stat.skill === 'prompt-incomplete'
        ? stat.skill
        : 'listen-recognize',
    independent: asCount(stat.independent),
    hinted: asCount(stat.hinted),
    firstTry: asCount(stat.firstTry),
    attempts: asCount(stat.attempts),
    lastAt: asCount(stat.lastAt),
    reviewAt: asCount(stat.reviewAt),
    independentDays: asCount(stat.independentDays),
    lastIndependentDay: asCount(stat.lastIndependentDay),
    lastIndependentAt: asCount(stat.lastIndependentAt),
    lastSessionId: asCount(stat.lastSessionId),
    heardIndependent: stat.heardIndependent == null ? heardSoFar({ ...stat, id } as WordStat) : asCount(stat.heardIndependent),
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
    lastIndependentAt: Math.max(a.lastIndependentAt ?? 0, b.lastIndependentAt ?? 0),
    lastSessionId: (a.lastIndependentAt ?? 0) >= (b.lastIndependentAt ?? 0) ? (a.lastSessionId ?? 0) : (b.lastSessionId ?? 0),
    heardIndependent: (a.heardIndependent ?? 0) + (b.heardIndependent ?? 0),
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
  meta?: { sessionId?: number },
): Record<string, WordStat> {
  const wordProgress = mergeWordProgress(prev);
  for (const attempt of attempts) {
    const id = canonicalWordId(attempt.id);
    if (!id || id === 'color.unknown' || id.startsWith('room.')) continue;
    wordProgress[id] = applyAttempt(wordProgress[id], { ...attempt, id }, now, meta);
  }
  return wordProgress;
}

export function appendLearningNotes(
  prev: LearningNote[] | undefined,
  attempts: WordAttempt[],
  now = Date.now(),
): LearningNote[] {
  const next = [...(prev ?? [])];
  for (const attempt of attempts) {
    const id = canonicalWordId(attempt.id);
    if (!id || id === 'color.unknown' || id.startsWith('room.') || id.startsWith('count-')) continue;
    const skill: LearningSkill =
      attempt.skill === 'picture-match' || attempt.skill === 'count-quantity' || attempt.skill === 'prompt-incomplete'
        ? attempt.skill
        : 'listen-recognize';
    next.push({
      eventId: `${now.toString(36)}-${next.length.toString(36)}-${id}`,
      id,
      at: now,
      correct: attempt.correct !== false,
      independent: attempt.correct !== false && attempt.independent,
      skill,
    });
  }
  return next.slice(-RECENT_LIMIT);
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
