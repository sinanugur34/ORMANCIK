import type { AgeBand } from '../theme/colors';
import { heardIndependentCount, isDue, type WordStat } from './learning';
import type { AnimalToken, LevelDef, ShapeToken } from './levels';
import { buildRounds, orderByNeed, playSeed, seededShuffle, type Round } from './rounds';

function questionCount(level: LevelDef, band: AgeBand): number {
  return Math.max(1, Math.min(level.targetCount, band === '3-5' ? 2 : 4));
}

function optionCount(level: LevelDef, band: AgeBand): number {
  return band === '3-5' ? Math.min(level.optionCount, 3) : level.optionCount;
}

/** Same chain the play screen uses for color questions. */
export function colorRoundsFor(level: LevelDef, band: AgeBand, salt: number): Round<string>[] {
  const pool = level.colors.slice(0, Math.max(2, optionCount(level, band)));
  if (!pool.length) return [];
  const questions = Math.max(1, Math.min(questionCount(level, band), pool.length));
  const targets = seededShuffle(pool, playSeed(level.id, salt, 11)).slice(0, questions);
  return buildRounds(pool, targets, playSeed(level.id, salt, 23), (a, b) => a === b);
}

/** Same chain the play screen uses for shape questions. */
export function shapeRoundsFor(level: LevelDef, band: AgeBand, salt: number): Round<ShapeToken>[] {
  const pool = level.shapeTokens.slice(0, Math.max(2, optionCount(level, band)));
  if (!pool.length) return [];
  const questions = Math.max(1, Math.min(questionCount(level, band), pool.length));
  const targets = seededShuffle(pool, playSeed(level.id, salt, 29)).slice(0, questions);
  return buildRounds(pool, targets, playSeed(level.id, salt, 41), (a, b) => a.glyph === b.glyph);
}

/** Same chain the play screen uses for animal questions. */
export function animalRoundsFor(
  level: LevelDef,
  band: AgeBand,
  salt: number,
  wordProgress: Record<string, WordStat>,
): Round<AnimalToken>[] {
  const size = band === '3-5' ? Math.min(3, Math.max(2, level.animals.length)) : Math.min(4, level.animals.length);
  const pool = level.animals.slice(0, size);
  if (!pool.length) return [];
  const questions = Math.max(1, Math.min(questionCount(level, band), pool.length));
  const ordered = orderByNeed(pool, playSeed(level.id, salt, 3), (animal) => {
    const id = animal.labelKey.replace(/^animal\./, '');
    const stat = wordProgress[id];
    return !stat || isDue(stat) || heardIndependentCount(stat) < 1;
  });
  return buildRounds(pool, ordered.slice(0, questions), playSeed(level.id, salt, 70), (a, b) => a.labelKey === b.labelKey);
}
