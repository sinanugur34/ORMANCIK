import { tFor, type Language } from '../i18n';
import type { AgeBand } from '../theme/colors';
import { LEARNING_COLORS, LEGACY_COLOR_IDS } from '../theme/colorNames';
import type { EnglishLevel } from './learning';
import { islandForLevel } from './islands';
import type { LevelDef } from './levels';

export type LessonChoice = {
  id: string;
  emoji: string;
  labelEn: string;
  labelTr: string;
  /** Real color chip. Used instead of an emoji when set. */
  swatch?: string;
  /** Relative size of the same picture, so big and small stay the same kind. */
  scale?: number;
  /** How many separate copies of `emoji` this choice shows. */
  count?: number;
};

export type LessonStep = {
  kind: 'model' | 'find' | 'transfer';
  wordId: string;
  say: string;
  clipId: string;
  /** Shown only while modeling or after a hint. Hidden during find/transfer. */
  emoji: string;
  hintTr: string;
  choices: LessonChoice[];
  swatch?: string;
  scale?: number;
  count?: number;
};

export type CatalogWord = {
  id: string;
  emoji: string;
  emojiAlt: string;
  en: string;
  swatch?: string;
  scale?: number;
  /** Repeated copies of the single emoji. Keeps four and five countable. */
  count?: number;
  tr: string;
  model: string;
  modelClip: string;
  find: string;
  findClip: string;
  transfer: string;
  transferClip: string;
};

const WORDS: Record<string, CatalogWord> = {
  hello: {
    id: 'hello',
    emoji: '🙋',
    emojiAlt: '🧒',
    en: 'hello',
    tr: 'merhaba',
    model: 'Hello.',
    modelClip: 'hello-model',
    find: 'Find the friend who says hello.',
    findClip: 'hello-find',
    transfer: 'Find the friend who says hello.',
    transferClip: 'hello-find',
  },
  bye: {
    id: 'bye',
    emoji: '👋',
    emojiAlt: '🚶',
    en: 'bye',
    tr: 'hoşça kal',
    model: 'Bye.',
    modelClip: 'bye-model',
    find: 'Find the friend who says bye.',
    findClip: 'bye-find',
    transfer: 'Find the friend who says bye.',
    transferClip: 'bye-find',
  },
  cat: {
    id: 'cat',
    emoji: '🐱',
    emojiAlt: '🐈',
    en: 'cat',
    tr: 'kedi',
    model: 'Cat. This is a cat.',
    modelClip: 'cat-model',
    find: 'Find the cat.',
    findClip: 'cat-find',
    transfer: 'Touch the cat.',
    transferClip: 'cat-transfer',
  },
  dog: {
    id: 'dog',
    emoji: '🐶',
    emojiAlt: '🐕',
    en: 'dog',
    tr: 'köpek',
    model: 'Dog. This is a dog.',
    modelClip: 'dog-model',
    find: 'Find the dog.',
    findClip: 'dog-find',
    transfer: 'Touch the dog.',
    transferClip: 'dog-transfer',
  },
  rabbit: {
    id: 'rabbit',
    emoji: '🐰',
    emojiAlt: '🐇',
    en: 'rabbit',
    tr: 'tavşan',
    model: 'Rabbit. This is a rabbit.',
    modelClip: 'rabbit-model',
    find: 'Find the rabbit.',
    findClip: 'rabbit-find',
    transfer: 'Touch the rabbit.',
    transferClip: 'rabbit-transfer',
  },
};

const EXTRA: CatalogWord[] = [
  { id: 'bear', emoji: '🐻', emojiAlt: '🧸', en: 'bear', tr: 'ayı', model: '', modelClip: '', find: 'Find the bear.', findClip: '', transfer: 'Touch the bear.', transferClip: '' },
  { id: 'fox', emoji: '🦊', emojiAlt: '🦊', en: 'fox', tr: 'tilki', model: '', modelClip: '', find: 'Find the fox.', findClip: '', transfer: 'Touch the fox.', transferClip: '' },
  { id: 'frog', emoji: '🐸', emojiAlt: '🐸', en: 'frog', tr: 'kurbağa', model: '', modelClip: '', find: 'Find the frog.', findClip: '', transfer: 'Touch the frog.', transferClip: '' },
  { id: 'panda', emoji: '🐼', emojiAlt: '🐼', en: 'panda', tr: 'panda', model: '', modelClip: '', find: 'Find the panda.', findClip: '', transfer: 'Touch the panda.', transferClip: '' },
  { id: 'chick', emoji: '🐥', emojiAlt: '🐤', en: 'chick', tr: 'civciv', model: '', modelClip: '', find: 'Find the chick.', findClip: '', transfer: 'Touch the chick.', transferClip: '' },
  { id: 'pig', emoji: '🐷', emojiAlt: '🐖', en: 'pig', tr: 'domuz', model: '', modelClip: '', find: 'Find the pig.', findClip: '', transfer: 'Touch the pig.', transferClip: '' },
  { id: 'unicorn', emoji: '🦄', emojiAlt: '🦄', en: 'unicorn', tr: 'tek boynuz', model: '', modelClip: '', find: 'Find the unicorn.', findClip: '', transfer: 'Touch the unicorn.', transferClip: '' },
];

function colorCatalog(item: { hex: string; id: string; en: string; tr: string }): CatalogWord {
  const name = item.en.charAt(0).toUpperCase() + item.en.slice(1);
  return {
    id: item.id,
    emoji: '',
    emojiAlt: '',
    swatch: item.hex,
    en: item.en,
    tr: item.tr,
    model: `${name}.`,
    modelClip: '',
    find: `Find the ${item.en}.`,
    findClip: '',
    transfer: `Touch the ${item.en}.`,
    transferClip: '',
  };
}

const COLOR_WORDS: CatalogWord[] = [
  ...LEARNING_COLORS.map(colorCatalog),
  colorCatalog({ hex: '#4ECDC4', id: 'color.teal', en: 'teal', tr: 'turkuaz' }),
];

const REVIEW_EXTRA: CatalogWord[] = [
  ...COLOR_WORDS,
  { id: 'one', emoji: '🍎', emojiAlt: '🌟', count: 1, en: 'one', tr: 'bir', model: '', modelClip: '', find: 'Find one.', findClip: '', transfer: 'Touch one.', transferClip: '' },
  { id: 'two', emoji: '🍎', emojiAlt: '🌟', count: 2, en: 'two', tr: 'iki', model: '', modelClip: '', find: 'Find two.', findClip: '', transfer: 'Touch two.', transferClip: '' },
  { id: 'three', emoji: '🍎', emojiAlt: '🌟', count: 3, en: 'three', tr: 'üç', model: '', modelClip: '', find: 'Find three.', findClip: '', transfer: 'Touch three.', transferClip: '' },
  { id: 'four', emoji: '🍎', emojiAlt: '🌟', count: 4, en: 'four', tr: 'dört', model: '', modelClip: '', find: 'Find four.', findClip: '', transfer: 'Touch four.', transferClip: '' },
  { id: 'five', emoji: '🍎', emojiAlt: '🌟', count: 5, en: 'five', tr: 'beş', model: '', modelClip: '', find: 'Find five.', findClip: '', transfer: 'Touch five.', transferClip: '' },
  { id: 'big', emoji: '●', emojiAlt: '●', scale: 1.65, en: 'big', tr: 'büyük', model: '', modelClip: '', find: 'Find the big one.', findClip: '', transfer: 'Touch the big one.', transferClip: '' },
  { id: 'small', emoji: '●', emojiAlt: '●', scale: 0.62, en: 'small', tr: 'küçük', model: '', modelClip: '', find: 'Find the small one.', findClip: '', transfer: 'Touch the small one.', transferClip: '' },
  { id: 'circle', emoji: '●', emojiAlt: '⬤', en: 'circle', tr: 'daire', model: '', modelClip: '', find: 'Find the circle.', findClip: '', transfer: 'Touch the circle.', transferClip: '' },
  { id: 'square', emoji: '■', emojiAlt: '▢', en: 'square', tr: 'kare', model: '', modelClip: '', find: 'Find the square.', findClip: '', transfer: 'Touch the square.', transferClip: '' },
  { id: 'triangle', emoji: '▲', emojiAlt: '△', en: 'triangle', tr: 'üçgen', model: '', modelClip: '', find: 'Find the triangle.', findClip: '', transfer: 'Touch the triangle.', transferClip: '' },
  { id: 'star', emoji: '★', emojiAlt: '☆', en: 'star', tr: 'yıldız', model: '', modelClip: '', find: 'Find the star.', findClip: '', transfer: 'Touch the star.', transferClip: '' },
  { id: 'diamond', emoji: '◆', emojiAlt: '◇', en: 'diamond', tr: 'elmas', model: '', modelClip: '', find: 'Find the diamond.', findClip: '', transfer: 'Touch the diamond.', transferClip: '' },
  { id: 'heart', emoji: '♥', emojiAlt: '♡', en: 'heart', tr: 'kalp', model: '', modelClip: '', find: 'Find the heart.', findClip: '', transfer: 'Touch the heart.', transferClip: '' },
];

const POOL: CatalogWord[] = [...Object.values(WORDS), ...EXTRA];
const REVIEW_POOL: CatalogWord[] = [...POOL, ...REVIEW_EXTRA];

export type AlbumWord = {
  id: string;
  en: string;
  tr: string;
  emoji: string;
  swatch?: string;
  clipId?: string;
};

const NUMBER_IDS = new Set(['one', 'two', 'three', 'four', 'five']);
const SHAPE_IDS = new Set(['circle', 'square', 'triangle', 'star', 'diamond', 'heart']);

export function resolveReviewId(id: string): string {
  return LEGACY_COLOR_IDS[id] ?? id;
}

export function listAlbumWords(): AlbumWord[] {
  const seen = new Set<string>();
  const out: AlbumWord[] = [];
  for (const word of [...Object.values(WORDS), ...EXTRA]) {
    if (seen.has(word.id)) continue;
    seen.add(word.id);
    out.push({
      id: word.id,
      en: word.en,
      tr: word.tr,
      emoji: word.emoji,
      clipId: word.modelClip || undefined,
    });
  }
  return out;
}

export function albumWord(id: string): AlbumWord | null {
  if (id.startsWith('count-')) {
    const n = id.slice('count-'.length);
    return { id, en: `how many · ${n}`, tr: `kaç tane · ${n}`, emoji: '🔢' };
  }
  const word = REVIEW_POOL.find((item) => item.id === resolveReviewId(id));
  if (!word) return null;
  return {
    id: word.id,
    en: word.en,
    tr: word.tr,
    emoji: word.emoji,
    swatch: word.swatch,
    clipId: word.modelClip || undefined,
  };
}

function sameLook(a: CatalogWord, b: CatalogWord, kind: LessonStep['kind']): boolean {
  if (a.swatch || b.swatch) return a.swatch === b.swatch;
  if (a.count != null || b.count != null) return a.count === b.count && picture(a, kind) === picture(b, kind);
  if (a.scale != null || b.scale != null) return picture(a, kind) === picture(b, kind) && a.scale === b.scale;
  return picture(a, kind) === picture(b, kind);
}

function reviewPoolFor(word: CatalogWord): CatalogWord[] {
  if (word.id.startsWith('color.')) {
    return COLOR_WORDS.filter((item) => item.id !== 'color.teal' || word.id === 'color.teal');
  }
  if (NUMBER_IDS.has(word.id)) return REVIEW_POOL.filter((item) => NUMBER_IDS.has(item.id));
  if (word.id === 'big' || word.id === 'small') return REVIEW_POOL.filter((item) => item.id === 'big' || item.id === 'small');
  if (SHAPE_IDS.has(word.id)) return REVIEW_POOL.filter((item) => SHAPE_IDS.has(item.id));
  return POOL;
}

function mixSeed(seed: number): number {
  let s = seed >>> 0;
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return s;
}

function picture(word: CatalogWord, kind: LessonStep['kind']): string {
  return kind === 'transfer' ? word.emojiAlt : word.emoji;
}

function distractorCount(band: AgeBand, englishLevel: EnglishLevel): number {
  const base = band === '3-5' ? 1 : 2;
  return Math.min(4, englishLevel === 'ready' ? base + 1 : base);
}

function choicesFor(
  target: CatalogWord,
  band: AgeBand,
  salt: number,
  kind: LessonStep['kind'],
  englishLevel: EnglishLevel,
  pool: CatalogWord[] = POOL,
): LessonChoice[] {
  const count = distractorCount(band, englishLevel);
  const distractors = pool.filter((w) => w.id !== target.id && !sameLook(w, target, kind));
  const picked: CatalogWord[] = [];
  let state = salt;
  const copy = [...distractors];
  while (picked.length < count && copy.length) {
    state = mixSeed(state + picked.length + 1);
    const index = state % copy.length;
    picked.push(copy.splice(index, 1)[0]!);
  }
  const order = [target, ...picked];
  let shuffleState = salt + 17;
  for (let i = order.length - 1; i > 0; i--) {
    shuffleState = mixSeed(shuffleState + i);
    const j = shuffleState % (i + 1);
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order.map((w) => ({
    id: w.id,
    emoji: picture(w, kind),
    labelEn: w.en,
    labelTr: w.tr,
    swatch: w.swatch,
    scale: w.scale,
    count: w.count,
  }));
}

function step(
  word: CatalogWord,
  kind: LessonStep['kind'],
  band: AgeBand,
  salt: number,
  englishLevel: EnglishLevel,
  pool: CatalogWord[] = POOL,
): LessonStep {
  const say = kind === 'model' ? word.model : kind === 'transfer' ? word.transfer : word.find;
  const clipId = kind === 'model' ? word.modelClip : kind === 'transfer' ? word.transferClip : word.findClip;
  return {
    kind,
    wordId: word.id,
    say,
    clipId,
    emoji: picture(word, kind),
    hintTr: word.tr,
    swatch: word.swatch,
    scale: word.scale,
    count: word.count,
    choices: kind === 'model' ? [] : choicesFor(word, band, salt, kind, englishLevel, pool),
  };
}

function script(levelId: number, band: AgeBand, englishLevel: EnglishLevel): LessonStep[] {
  const w = WORDS;
  const s = (word: CatalogWord, kind: LessonStep['kind'], salt: number) =>
    step(word, kind, band, salt, englishLevel);
  if (levelId === 1) return [s(w.hello, 'model', 1), s(w.hello, 'find', 2)];
  if (levelId === 2) return [s(w.bye, 'model', 3), s(w.bye, 'find', 4)];
  if (levelId === 3) return [s(w.cat, 'model', 5), s(w.cat, 'find', 6), s(w.cat, 'transfer', 7)];
  if (levelId === 4) return [s(w.dog, 'model', 8), s(w.dog, 'find', 9), s(w.dog, 'transfer', 10)];
  if (levelId === 5) return [s(w.rabbit, 'model', 11), s(w.rabbit, 'find', 12), s(w.rabbit, 'transfer', 13)];
  if (levelId === 6) return [s(w.cat, 'find', 14), s(w.dog, 'find', 15), s(w.rabbit, 'find', 16)];
  if (levelId === 7) return [s(w.hello, 'find', 17), s(w.bye, 'find', 18)];
  return [s(w.cat, 'transfer', 19), s(w.dog, 'transfer', 20), s(w.rabbit, 'transfer', 21)];
}

export type FriendsLearning = {
  englishLevel?: EnglishLevel;
  /** Words with a solid independent record that are not due. Used on review lessons. */
  knownIds?: string[];
};

function applyStartingLevel(lesson: LessonStep[], levelId: number, learning?: FriendsLearning): LessonStep[] {
  const englishLevel = learning?.englishLevel ?? 'new';
  let next = lesson;
  if (englishLevel === 'some' || englishLevel === 'ready') {
    const withoutModel = next.filter((item) => item.kind !== 'model');
    if (withoutModel.length) next = withoutModel;
  }
  if (englishLevel === 'ready' && levelId >= 6) {
    const known = new Set(learning?.knownIds ?? []);
    const fresh = next.filter((item) => !known.has(item.wordId));
    if (fresh.length) next = fresh;
  }
  return next;
}

/** First eight levels are one English “first friends” unit. Later levels stay mixed practice. */
export function buildFriendsLevel(
  levelId: number,
  band: AgeBand,
  lang: Language,
  learning?: FriendsLearning,
): LevelDef | null {
  if (levelId < 1 || levelId > 8) return null;
  const englishLevel = learning?.englishLevel ?? 'new';
  const lesson = applyStartingLevel(script(levelId, band, englishLevel), levelId, learning);
  const island = islandForLevel(levelId);
  const reward = band === '3-5' ? 8 : band === '6-8' ? 12 : 16;
  return {
    id: levelId,
    islandId: island.id,
    title: tFor(lang, 'unit.friends.levelTitle', { n: levelId }),
    template: 'lesson',
    reward,
    optionCount: Math.max(2, lesson.find((item) => item.choices.length > 0)?.choices.length ?? 2),
    targetCount: lesson.length,
    timerSec: undefined,
    colors: [],
    shapes: [],
    shapeTokens: [],
    animals: [],
    prompt: lesson[0]?.say ?? 'Listen.',
    lesson,
  };
}

/** Short practice from the album. Uses the other picture for each word. */
export function buildReviewLevel(wordIds: string[], band: AgeBand, lang: Language): LevelDef | null {
  const unique = Array.from(new Set(wordIds.map(resolveReviewId))).slice(0, 4);
  const words = unique
    .map((id) => REVIEW_POOL.find((item) => item.id === id))
    .filter((item): item is CatalogWord => item != null);
  if (!words.length) return null;
  const lesson = words.map((word, index) =>
    step(word, 'transfer', band, 40 + index, 'some', reviewPoolFor(word)),
  );
  return {
    id: 0,
    islandId: 'meadow',
    title: tFor(lang, 'album.reviewTitle'),
    template: 'lesson',
    reward: 0,
    optionCount: Math.max(2, lesson[0]?.choices.length ?? 2),
    targetCount: lesson.length,
    timerSec: undefined,
    colors: [],
    shapes: [],
    shapeTokens: [],
    animals: [],
    prompt: lesson[0]?.say ?? 'Listen.',
    lesson,
  };
}

export const FRIENDS_WORD_IDS = ['hello', 'bye', 'cat', 'dog', 'rabbit'] as const;
