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
  | 'oddOneOut';

export type ShapeToken = {
  glyph: string;
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
  prompt: string;
  /** sizeCompare: true = find bigger */
  findBigger?: boolean;
  /** patternComplete: expected next color index into colors */
  patternColors?: string[];
  patternAnswer?: string;
};

const SHAPE_TOKENS: ShapeToken[] = [
  { glyph: '●', label: 'Daire' },
  { glyph: '■', label: 'Kare' },
  { glyph: '▲', label: 'Üçgen' },
  { glyph: '★', label: 'Yıldız' },
  { glyph: '◆', label: 'Elmas' },
  { glyph: '♥', label: 'Kalp' },
];

const SIMPLE_TEMPLATES: LevelTemplate[] = [
  'colorMatch',
  'shapeSort',
  'countCollect',
  'sizeCompare',
  'oddOneOut',
];

const MID_TEMPLATES: LevelTemplate[] = [
  ...SIMPLE_TEMPLATES,
  'tapSort',
  'patternComplete',
  'sequence',
];

const ALL_TEMPLATES: LevelTemplate[] = [...MID_TEMPLATES, 'memory'];

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
  } else {
    pool = [...ALL_TEMPLATES];
  }

  if (!tuning.allowMemory) pool = pool.filter((t) => t !== 'memory');
  if (!tuning.allowSequence) pool = pool.filter((t) => t !== 'sequence');
  if (!tuning.allowPattern) pool = pool.filter((t) => t !== 'patternComplete');
  if (!tuning.allowTapSort) pool = pool.filter((t) => t !== 'tapSort');

  // Early levels: keep it gentle and rotate simple templates
  if (levelId <= 6) {
    pool = pool.filter((t) =>
      ['colorMatch', 'shapeSort', 'countCollect', 'sizeCompare', 'oddOneOut'].includes(t),
    );
  } else if (levelId <= 12) {
    pool = pool.filter((t) => t !== 'memory');
  }

  // Deterministic variety: bias by level so maps feel mixed
  const bias = levelId % pool.length;
  if (rng() < 0.55) return pool[bias] ?? 'colorMatch';
  return pool[Math.floor(rng() * pool.length)] ?? 'colorMatch';
}

const ISLAND_FLAVOR: Record<string, string> = {
  meadow: 'Çayırda',
  brook: 'Derede',
  orchard: 'Bahçede',
  grove: 'Koruda',
  hill: 'Tepede',
  cave: 'Mağarada',
  shore: 'Kıyıda',
  star: 'Yıldızda',
};

function promptFor(
  template: LevelTemplate,
  islandId: string,
  band: AgeBand,
  extras: { findBigger?: boolean; targetLabel?: string; need?: number },
): string {
  const place = ISLAND_FLAVOR[islandId] ?? 'Koruda';
  const soft = band === '3-5';

  switch (template) {
    case 'colorMatch':
      return soft ? `${place} aynı rengi bul!` : `${place} doğru rengi seç`;
    case 'shapeSort':
      return soft
        ? `${place} bu şekli bul: ${extras.targetLabel ?? ''}`
        : `${place} doğru şekli seç`;
    case 'sequence':
      return soft ? 'Sırayı dokun!' : `${place} sırayı takip et`;
    case 'memory':
      return `${place} eşleri bul`;
    case 'countCollect':
      return soft
        ? `${extras.need ?? 1} tane bul!`
        : `${place} ${extras.need ?? 1} taneyi topla`;
    case 'sizeCompare':
      return extras.findBigger
        ? soft
          ? 'Büyük olanı seç!'
          : `${place} daha büyüğü bul`
        : soft
          ? 'Küçük olanı seç!'
          : `${place} daha küçüğü bul`;
    case 'patternComplete':
      return soft ? 'Deseni tamamla!' : `${place} deseni tamamla`;
    case 'tapSort':
      return soft ? 'Doğru kutuya koy!' : `${place} eşyaları kutulara ayır`;
    case 'oddOneOut':
      return soft ? 'Farklı olanı bul!' : `${place} aykırı olanı bul`;
    default:
      return `${place} oyna!`;
  }
}

export function buildLevel(levelId: number, band: AgeBand): LevelDef {
  const rng = mulberry32(levelId * 997 + band.charCodeAt(0) * 13);
  const island = islandForLevel(levelId);
  const tuning = bandTuning(band, levelId);
  const template = templateFor(levelId, band, rng, tuning);
  const optionCount = Math.min(tuning.optionCount, 6);
  const targetCount = Math.max(1, Math.min(tuning.targetCount, 5));
  const colors = pick(rng, palette, Math.min(optionCount + 2, palette.length));
  const shapeTokens = pick(rng, SHAPE_TOKENS, Math.min(optionCount + 1, SHAPE_TOKENS.length));
  const shapes = shapeTokens.map((s) => s.glyph);

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

  return {
    id: levelId,
    islandId: island.id,
    title: `${island.name} · ${levelId}`,
    template,
    reward: tuning.reward,
    optionCount,
    targetCount,
    timerSec: tuning.timerSec,
    colors,
    shapes,
    shapeTokens,
    findBigger,
    patternColors,
    patternAnswer,
    prompt: promptFor(template, island.id, band, {
      findBigger,
      targetLabel: shapeTokens[0]?.label,
      need: targetCount,
    }),
  };
}

export function buildAllLevels(band: AgeBand): LevelDef[] {
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => buildLevel(i + 1, band));
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

export { TOTAL_LEVELS, SHAPE_TOKENS };
