import { getLanguage, tFor, type Language } from '../i18n';
import { AgeBand, palette } from '../theme/colors';
import { islandForLevel, TOTAL_LEVELS } from './islands';

export type LevelTemplate =
  | 'colorMatch'
  | 'shapeSort'
  | 'sequence'
  | 'memory'
  | 'countCollect'
  | 'sizeCompare'
  | 'patternComplete'
  | 'tapSort'
  | 'oddOneOut'
  | 'animalMatch'
  | 'pathOrder'
  | 'quickFind';

export type ShapeToken = {
  glyph: string;
  /** i18n key under shape.* */
  labelKey: string;
  /** Localized label for the active language (set in buildLevel). */
  label: string;
};

export type AnimalToken = {
  emoji: string;
  /** i18n key under animal.* */
  labelKey: string;
  label: string;
};

export type LevelDef = {
  id: number;
  islandId: string;
  title: string;
  template: LevelTemplate;
  /** Reward coins on clear */
  reward: number;
  optionCount: number;
  targetCount: number;
  /** seconds; undefined = no timer */
  timerSec?: number;
  colors: string[];
  shapes: string[];
  shapeTokens: ShapeToken[];
  animals: AnimalToken[];
  prompt: string;
  /** sizeCompare: true = find bigger */
  findBigger?: boolean;
  /** patternComplete: expected next color index into colors */
  patternColors?: string[];
  patternAnswer?: string;
  /** pathOrder: number of stepping stones */
  pathLength?: number;
  /** quickFind: denser grid size */
  findGridSize?: number;
};

const SHAPE_DEFS: { glyph: string; labelKey: string }[] = [
  { glyph: '●', labelKey: 'shape.circle' },
  { glyph: '■', labelKey: 'shape.square' },
  { glyph: '▲', labelKey: 'shape.triangle' },
  { glyph: '★', labelKey: 'shape.star' },
  { glyph: '◆', labelKey: 'shape.diamond' },
  { glyph: '♥', labelKey: 'shape.heart' },
];

const ANIMAL_DEFS: { emoji: string; labelKey: string }[] = [
  { emoji: '🐱', labelKey: 'animal.cat' },
  { emoji: '🐶', labelKey: 'animal.dog' },
  { emoji: '🐰', labelKey: 'animal.rabbit' },
  { emoji: '🐻', labelKey: 'animal.bear' },
  { emoji: '🦊', labelKey: 'animal.fox' },
  { emoji: '🐸', labelKey: 'animal.frog' },
  { emoji: '🐼', labelKey: 'animal.panda' },
  { emoji: '🐥', labelKey: 'animal.chick' },
  { emoji: '🐷', labelKey: 'animal.pig' },
  { emoji: '🦄', labelKey: 'animal.unicorn' },
];

function localizeShape(def: { glyph: string; labelKey: string }, lang: Language): ShapeToken {
  return { glyph: def.glyph, labelKey: def.labelKey, label: tFor(lang, def.labelKey) };
}

function localizeAnimal(def: { emoji: string; labelKey: string }, lang: Language): AnimalToken {
  return { emoji: def.emoji, labelKey: def.labelKey, label: tFor(lang, def.labelKey) };
}

/** Catalog accessors (labels follow active language). */
export const SHAPE_TOKENS: ShapeToken[] = SHAPE_DEFS.map((d) => localizeShape(d, getLanguage()));
export const ANIMAL_TOKENS: AnimalToken[] = ANIMAL_DEFS.map((d) => localizeAnimal(d, getLanguage()));

const SIMPLE_TEMPLATES: LevelTemplate[] = [
  'colorMatch',
  'shapeSort',
  'countCollect',
  'sizeCompare',
  'oddOneOut',
  'animalMatch',
];

const MID_TEMPLATES: LevelTemplate[] = [
  ...SIMPLE_TEMPLATES,
  'tapSort',
  'patternComplete',
  'sequence',
  'pathOrder',
];

const ALL_TEMPLATES: LevelTemplate[] = [...MID_TEMPLATES, 'memory', 'quickFind'];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

type Tuning = {
  optionCount: number;
  targetCount: number;
  timerSec: number | undefined;
  allowMemory: boolean;
  allowSequence: boolean;
  allowPattern: boolean;
  allowTapSort: boolean;
  allowPathOrder: boolean;
  allowQuickFind: boolean;
  reward: number;
};

function bandTuning(band: AgeBand, levelId: number): Tuning {
  const wave = Math.floor((levelId - 1) / 10);
  const within = ((levelId - 1) % 10) + 1;

  if (band === '3-5') {
    return {
      optionCount: within <= 4 ? 2 : wave >= 2 ? 3 : 2,
      targetCount: wave >= 5 && within > 5 ? 2 : 1,
      timerSec: undefined,
      allowMemory: false,
      allowSequence: wave >= 4,
      allowPattern: wave >= 3,
      allowTapSort: wave >= 2,
      allowPathOrder: false,
      allowQuickFind: false,
      reward: 8 + wave,
    };
  }
  if (band === '6-8') {
    return {
      optionCount: 3 + (wave >= 3 ? 1 : 0) + (wave >= 6 ? 1 : 0),
      targetCount: 2 + (wave >= 2 ? 1 : 0) + (within > 7 && wave >= 4 ? 1 : 0),
      timerSec: wave >= 5 ? 48 - Math.min(wave, 6) : undefined,
      allowMemory: wave >= 1,
      allowSequence: true,
      allowPattern: true,
      allowTapSort: true,
      allowPathOrder: true,
      allowQuickFind: wave >= 4,
      reward: 12 + wave * 2,
    };
  }
  return {
    optionCount: 4 + (wave >= 2 ? 1 : 0) + (wave >= 5 ? 1 : 0),
    targetCount: 3 + (wave >= 3 ? 1 : 0),
    timerSec: Math.max(28, 42 - Math.min(wave, 5) * 2),
    allowMemory: true,
    allowSequence: true,
    allowPattern: true,
    allowTapSort: true,
    allowPathOrder: true,
    allowQuickFind: true,
    reward: 16 + wave * 3,
  };
}

function templateFor(levelId: number, band: AgeBand, rng: () => number, tuning: Tuning): LevelTemplate {
  let pool: LevelTemplate[];
  if (band === '3-5') {
    pool = [...SIMPLE_TEMPLATES];
    if (tuning.allowTapSort) pool.push('tapSort');
    if (tuning.allowPattern) pool.push('patternComplete');
    if (tuning.allowSequence) pool.push('sequence');
  } else if (band === '6-8') {
    pool = [...MID_TEMPLATES];
    if (!tuning.allowMemory) pool = pool.filter((t) => t !== 'memory');
    if (tuning.allowQuickFind) pool.push('quickFind');
  } else {
    pool = [...ALL_TEMPLATES];
  }

  if (!tuning.allowMemory) pool = pool.filter((t) => t !== 'memory');
  if (!tuning.allowSequence) pool = pool.filter((t) => t !== 'sequence');
  if (!tuning.allowPattern) pool = pool.filter((t) => t !== 'patternComplete');
  if (!tuning.allowTapSort) pool = pool.filter((t) => t !== 'tapSort');
  if (!tuning.allowPathOrder) pool = pool.filter((t) => t !== 'pathOrder');
  if (!tuning.allowQuickFind) pool = pool.filter((t) => t !== 'quickFind');

  // Signature templates: guaranteed early slots per band, then normal mixed pool
  if (band === '3-5' && (levelId === 1 || levelId === 4) && pool.includes('animalMatch')) {
    return 'animalMatch';
  }
  if (band === '6-8' && (levelId === 2 || levelId === 5) && pool.includes('pathOrder')) {
    return 'pathOrder';
  }
  if (band === '9-10' && (levelId === 3 || levelId === 6) && pool.includes('quickFind')) {
    return 'quickFind';
  }

  if (band === '3-5' && levelId <= 8) {
    pool = pool.filter((t) =>
      ['animalMatch', 'colorMatch', 'shapeSort', 'countCollect', 'sizeCompare', 'oddOneOut'].includes(t),
    );
  } else if (band === '6-8' && levelId <= 10) {
    pool = pool.filter((t) =>
      ['pathOrder', 'colorMatch', 'sequence', 'patternComplete', 'sizeCompare', 'oddOneOut', 'animalMatch', 'shapeSort'].includes(
        t,
      ),
    );
  } else if (band === '9-10' && levelId <= 10) {
    pool = pool.filter((t) =>
      ['quickFind', 'oddOneOut', 'colorMatch', 'pathOrder', 'patternComplete', 'sequence', 'sizeCompare'].includes(t),
    );
  } else if (levelId <= 6) {
    pool = pool.filter((t) =>
      ['colorMatch', 'shapeSort', 'countCollect', 'sizeCompare', 'oddOneOut', 'animalMatch'].includes(t),
    );
  } else if (levelId <= 12) {
    pool = pool.filter((t) => t !== 'memory');
  }

  if (!pool.length) {
    if (band === '3-5') return 'animalMatch';
    if (band === '6-8') return 'pathOrder';
    return 'quickFind';
  }

  // Deterministic variety: bias by level so maps feel mixed
  const bias = levelId % pool.length;
  if (rng() < 0.55) return pool[bias] ?? pool[0];
  return pool[Math.floor(rng() * pool.length)] ?? pool[0];
}

function placeFlavor(islandId: string, lang: Language): string {
  return tFor(lang, `island.place.${islandId}`) || tFor(lang, 'island.place.grove');
}

function promptFor(
  template: LevelTemplate,
  islandId: string,
  band: AgeBand,
  lang: Language,
  extras: { findBigger?: boolean; targetLabel?: string; need?: number },
): string {
  const place = placeFlavor(islandId, lang);
  const soft = band === '3-5';
  const p = (key: string, params?: Record<string, string | number>) => tFor(lang, key, params);

  switch (template) {
    case 'colorMatch':
      return soft
        ? p('level.prompt.colorMatch.soft', { place })
        : p('level.prompt.colorMatch', { place });
    case 'shapeSort':
      return soft
        ? p('level.prompt.shapeSort.soft', { place, target: extras.targetLabel ?? '' })
        : p('level.prompt.shapeSort', { place });
    case 'sequence':
      return soft ? p('level.prompt.sequence.soft') : p('level.prompt.sequence', { place });
    case 'memory':
      return p('level.prompt.memory', { place });
    case 'countCollect':
      return soft
        ? p('level.prompt.countCollect.soft', { need: extras.need ?? 1 })
        : p('level.prompt.countCollect', { place, need: extras.need ?? 1 });
    case 'sizeCompare':
      return extras.findBigger
        ? soft
          ? p('level.prompt.sizeBigger.soft')
          : p('level.prompt.sizeBigger', { place })
        : soft
          ? p('level.prompt.sizeSmaller.soft')
          : p('level.prompt.sizeSmaller', { place });
    case 'patternComplete':
      return soft ? p('level.prompt.pattern.soft') : p('level.prompt.pattern', { place });
    case 'tapSort':
      return soft ? p('level.prompt.tapSort.soft') : p('level.prompt.tapSort', { place });
    case 'oddOneOut':
      return soft ? p('level.prompt.oddOneOut.soft') : p('level.prompt.oddOneOut', { place });
    case 'animalMatch':
      return soft
        ? p('level.prompt.animalMatch.soft')
        : p('level.prompt.animalMatch', { place });
    case 'pathOrder':
      return soft
        ? p('level.prompt.pathOrder.soft')
        : p('level.prompt.pathOrder', { place });
    case 'quickFind':
      return soft
        ? p('level.prompt.quickFind.soft')
        : p('level.prompt.quickFind', { place });
    default:
      return p('level.prompt.default', { place });
  }
}

export function buildLevel(levelId: number, band: AgeBand, lang: Language = getLanguage()): LevelDef {
  const rng = mulberry32(levelId * 997 + band.charCodeAt(0) * 13);
  const island = islandForLevel(levelId);
  const tuning = bandTuning(band, levelId);
  const template = templateFor(levelId, band, rng, tuning);
  const optionCount = Math.min(tuning.optionCount, 6);
  const targetCount = Math.max(1, Math.min(tuning.targetCount, 5));
  const colors = pick(rng, palette, Math.min(optionCount + 2, palette.length));
  const shapeTokens = pick(rng, SHAPE_DEFS, Math.min(optionCount + 1, SHAPE_DEFS.length)).map((d) =>
    localizeShape(d, lang),
  );
  const shapes = shapeTokens.map((s) => s.glyph);

  const animalPickN =
    template === 'animalMatch'
      ? band === '3-5'
        ? Math.min(3, Math.max(2, optionCount))
        : Math.min(4, Math.max(3, optionCount))
      : Math.min(4, ANIMAL_DEFS.length);
  const animals = pick(rng, ANIMAL_DEFS, animalPickN).map((d) => localizeAnimal(d, lang));

  const findBigger = rng() > 0.45;
  let patternColors: string[] | undefined;
  let patternAnswer: string | undefined;

  if (template === 'patternComplete') {
    const a = colors[0];
    const b = colors[1] ?? colors[0];
    const mode = Math.floor(rng() * 3);
    if (mode === 0) {
      // A B A B → A
      patternColors = [a, b, a, b];
      patternAnswer = a;
    } else if (mode === 1) {
      // A A B B → A
      patternColors = [a, a, b, b];
      patternAnswer = a;
    } else {
      // A B B A → B
      patternColors = [a, b, b, a];
      patternAnswer = b;
    }
  }

  let pathLength: number | undefined;
  if (template === 'pathOrder') {
    if (band === '3-5') pathLength = 3;
    else if (band === '6-8') pathLength = levelId <= 5 ? 3 : 4;
    else pathLength = 4;
  }

  let findGridSize: number | undefined;
  let timerSec = tuning.timerSec;
  if (template === 'quickFind') {
    if (band === '9-10') {
      findGridSize = levelId <= 4 ? 6 : Math.min(8, 6 + Math.floor((levelId - 1) / 10));
      // Light pressure: short timer even early for 9–10
      timerSec = timerSec ?? Math.max(18, 28 - Math.min(Math.floor((levelId - 1) / 10), 4) * 2);
    } else if (band === '6-8') {
      findGridSize = 6;
      timerSec = timerSec ?? 36;
    } else {
      findGridSize = 4;
      timerSec = undefined;
    }
  }

  const islandLabel = tFor(lang, `island.${island.id}`);

  return {
    id: levelId,
    islandId: island.id,
    title: tFor(lang, 'level.title', { island: islandLabel, id: levelId }),
    template,
    reward: tuning.reward,
    optionCount,
    targetCount,
    timerSec,
    colors,
    shapes,
    shapeTokens,
    animals,
    findBigger,
    patternColors,
    patternAnswer,
    pathLength,
    findGridSize,
    prompt: promptFor(template, island.id, band, lang, {
      findBigger,
      targetLabel: shapeTokens[0]?.label,
      need: targetCount,
    }),
  };
}

export function buildAllLevels(band: AgeBand, lang: Language = getLanguage()): LevelDef[] {
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => buildLevel(i + 1, band, lang));
}

/** Cosmetic star rating from mistake count (1–3). */
export function starsFromMistakes(mistakes: number, band: AgeBand): 1 | 2 | 3 {
  if (band === '3-5') {
    if (mistakes <= 2) return 3;
    if (mistakes <= 5) return 2;
    return 1;
  }
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}

export { TOTAL_LEVELS };
