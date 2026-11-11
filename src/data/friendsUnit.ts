import { tFor, type Language } from '../i18n';
import type { AgeBand } from '../theme/colors';
import { islandForLevel } from './islands';
import type { LevelDef } from './levels';

export type LessonChoice = {
  id: string;
  emoji: string;
  labelEn: string;
  labelTr: string;
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
};

type Word = {
  id: string;
  emoji: string;
  en: string;
  tr: string;
  model: string;
  modelClip: string;
  find: string;
  findClip: string;
  transfer: string;
  transferClip: string;
};

const WORDS: Record<string, Word> = {
  hello: {
    id: 'hello',
    emoji: '🙋',
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

const EXTRA: Word[] = [
  {
    id: 'bear',
    emoji: '🐻',
    en: 'bear',
    tr: 'ayı',
    model: '',
    modelClip: '',
    find: '',
    findClip: '',
    transfer: '',
    transferClip: '',
  },
  {
    id: 'fox',
    emoji: '🦊',
    en: 'fox',
    tr: 'tilki',
    model: '',
    modelClip: '',
    find: '',
    findClip: '',
    transfer: '',
    transferClip: '',
  },
];

const POOL: Word[] = [...Object.values(WORDS), ...EXTRA];

function mixSeed(seed: number): number {
  let s = seed >>> 0;
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return s;
}

function choicesFor(target: Word, band: AgeBand, salt: number): LessonChoice[] {
  const distractorCount = band === '3-5' ? 1 : 2;
  const pool = POOL.filter((w) => w.id !== target.id && w.emoji !== target.emoji);
  const picked: Word[] = [];
  let state = salt;
  const copy = [...pool];
  while (picked.length < distractorCount && copy.length) {
    state = mixSeed(state + picked.length + 1);
    const index = state % copy.length;
    picked.push(copy.splice(index, 1)[0]!);
  }
  const all = [target, ...picked];
  const order = [...all];
  let shuffleState = salt + 17;
  for (let i = order.length - 1; i > 0; i--) {
    shuffleState = mixSeed(shuffleState + i);
    const j = shuffleState % (i + 1);
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order.map((w) => ({ id: w.id, emoji: w.emoji, labelEn: w.en, labelTr: w.tr }));
}

function step(
  word: Word,
  kind: LessonStep['kind'],
  band: AgeBand,
  salt: number,
): LessonStep {
  const say = kind === 'model' ? word.model : kind === 'transfer' ? word.transfer : word.find;
  const clipId = kind === 'model' ? word.modelClip : kind === 'transfer' ? word.transferClip : word.findClip;
  return {
    kind,
    wordId: word.id,
    say,
    clipId,
    emoji: word.emoji,
    hintTr: word.tr,
    choices: kind === 'model' ? [] : choicesFor(word, band, salt),
  };
}

function script(levelId: number, band: AgeBand): LessonStep[] {
  const w = WORDS;
  if (levelId === 1) return [step(w.hello, 'model', band, 1), step(w.hello, 'find', band, 2)];
  if (levelId === 2) return [step(w.bye, 'model', band, 3), step(w.bye, 'find', band, 4)];
  if (levelId === 3) {
    return [step(w.cat, 'model', band, 5), step(w.cat, 'find', band, 6), step(w.cat, 'transfer', band, 7)];
  }
  if (levelId === 4) {
    return [step(w.dog, 'model', band, 8), step(w.dog, 'find', band, 9), step(w.dog, 'transfer', band, 10)];
  }
  if (levelId === 5) {
    return [
      step(w.rabbit, 'model', band, 11),
      step(w.rabbit, 'find', band, 12),
      step(w.rabbit, 'transfer', band, 13),
    ];
  }
  if (levelId === 6) {
    return [step(w.cat, 'find', band, 14), step(w.dog, 'find', band, 15), step(w.rabbit, 'find', band, 16)];
  }
  if (levelId === 7) return [step(w.hello, 'find', band, 17), step(w.bye, 'find', band, 18)];
  return [step(w.cat, 'transfer', band, 19), step(w.dog, 'transfer', band, 20), step(w.rabbit, 'transfer', band, 21)];
}

/** First eight levels are one English “first friends” unit. Later levels stay mixed practice. */
export function buildFriendsLevel(levelId: number, band: AgeBand, lang: Language): LevelDef | null {
  if (levelId < 1 || levelId > 8) return null;
  const lesson = script(levelId, band);
  const island = islandForLevel(levelId);
  const reward = band === '3-5' ? 8 : band === '6-8' ? 12 : 16;
  return {
    id: levelId,
    islandId: island.id,
    title: tFor(lang, 'unit.friends.levelTitle', { n: levelId }),
    template: 'lesson',
    reward,
    optionCount: Math.max(2, lesson.find((s) => s.choices.length > 0)?.choices.length ?? 2),
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
