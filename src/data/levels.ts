import { AgeBand, palette } from '../theme/colors';
import { islandForLevel, TOTAL_LEVELS } from './islands';

export type LevelTemplate = 'colorMatch' | 'shapeSort' | 'sequence' | 'memory' | 'countCollect';

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
  prompt: string;
};

const SHAPES = ['●', '■', '▲', '★', '◆', '♥'] as const;
const TEMPLATES: LevelTemplate[] = [
  'colorMatch',
  'shapeSort',
  'countCollect',
  'sequence',
  'memory',
];

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

function bandTuning(band: AgeBand, levelId: number) {
  const wave = Math.floor((levelId - 1) / 10);
  if (band === '3-5') {
    return {
      optionCount: 2 + (wave > 2 ? 1 : 0),
      targetCount: 1 + (wave > 4 ? 1 : 0),
      timerSec: undefined as number | undefined,
      allowMemory: false,
      allowSequence: wave >= 3,
      reward: 8 + wave,
    };
  }
  if (band === '6-8') {
    return {
      optionCount: 3 + (wave > 3 ? 1 : 0),
      targetCount: 2 + (wave > 2 ? 1 : 0),
      timerSec: wave >= 5 ? 45 : undefined,
      allowMemory: true,
      allowSequence: true,
      reward: 12 + wave * 2,
    };
  }
  return {
    optionCount: 4 + (wave > 2 ? 1 : 0),
    targetCount: 3 + (wave > 3 ? 1 : 0),
    timerSec: 40 - Math.min(wave, 4) * 2,
    allowMemory: true,
    allowSequence: true,
    reward: 16 + wave * 3,
  };
}

function templateFor(levelId: number, band: AgeBand, rng: () => number): LevelTemplate {
  const tuning = bandTuning(band, levelId);
  let pool = [...TEMPLATES];
  if (!tuning.allowMemory) pool = pool.filter((t) => t !== 'memory');
  if (!tuning.allowSequence) pool = pool.filter((t) => t !== 'sequence');
  // Prefer simpler templates early
  if (levelId <= 8) pool = pool.filter((t) => t === 'colorMatch' || t === 'shapeSort' || t === 'countCollect');
  return pool[Math.floor(rng() * pool.length)] ?? 'colorMatch';
}

const PROMPTS: Record<LevelTemplate, string> = {
  colorMatch: 'Aynı rengi bul!',
  shapeSort: 'Doğru şekli seç!',
  sequence: 'Sırayı takip et!',
  memory: 'Kartları eşleştir!',
  countCollect: 'Doğru sayıyı topla!',
};

export function buildLevel(levelId: number, band: AgeBand): LevelDef {
  const rng = mulberry32(levelId * 997 + band.charCodeAt(0) * 13);
  const island = islandForLevel(levelId);
  const tuning = bandTuning(band, levelId);
  const template = templateFor(levelId, band, rng);
  const colors = pick(rng, palette, Math.min(tuning.optionCount + 1, palette.length));
  const shapes = pick(rng, SHAPES, Math.min(tuning.optionCount + 1, SHAPES.length));

  return {
    id: levelId,
    islandId: island.id,
    title: `${island.name} · ${levelId}`,
    template,
    reward: tuning.reward,
    optionCount: Math.min(tuning.optionCount, 6),
    targetCount: tuning.targetCount,
    timerSec: tuning.timerSec,
    colors,
    shapes,
    prompt: PROMPTS[template],
  };
}

export function buildAllLevels(band: AgeBand): LevelDef[] {
  return Array.from({ length: TOTAL_LEVELS }, (_, i) => buildLevel(i + 1, band));
}

export { TOTAL_LEVELS };
