import type { WordAttempt } from '../data/learning';

export type LevelWin = {
  stars: 1 | 2 | 3;
  words: WordAttempt[];
};
