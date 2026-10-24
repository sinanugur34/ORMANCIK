import { islandName } from '../i18n';

export type Island = {
  id: string;
  /** TR fallback; prefer `displayIslandName(island)`. */
  name: string;
  emoji: string;
  accent: string;
  levelStart: number;
  levelCount: number;
};

/** 8 islands × 10 levels = 80 levels */
export const ISLANDS: Island[] = [
  { id: 'meadow', name: 'Çiçek Çayır', emoji: '🌸', accent: '#FF6B6B', levelStart: 1, levelCount: 10 },
  { id: 'brook', name: 'Parıltı Dere', emoji: '💧', accent: '#4ECDC4', levelStart: 11, levelCount: 10 },
  { id: 'orchard', name: 'Meyve Bahçe', emoji: '🍎', accent: '#FFAB76', levelStart: 21, levelCount: 10 },
  { id: 'grove', name: 'Fısıltı Koru', emoji: '🌳', accent: '#3CB371', levelStart: 31, levelCount: 10 },
  { id: 'hill', name: 'Güneş Tepe', emoji: '☀️', accent: '#FFC857', levelStart: 41, levelCount: 10 },
  { id: 'cave', name: 'Kristal Mağara', emoji: '💎', accent: '#6C5CE7', levelStart: 51, levelCount: 10 },
  { id: 'shore', name: 'Deniz Kabuğu', emoji: '🐚', accent: '#54A0FF', levelStart: 61, levelCount: 10 },
  { id: 'star', name: 'Yıldız Çadır', emoji: '⭐', accent: '#C44569', levelStart: 71, levelCount: 10 },
];

export const TOTAL_LEVELS = ISLANDS.reduce((sum, i) => sum + i.levelCount, 0);

export function displayIslandName(island: Island | string): string {
  const id = typeof island === 'string' ? island : island.id;
  return islandName(id);
}

export function islandForLevel(levelId: number): Island {
  return ISLANDS.find((i) => levelId >= i.levelStart && levelId < i.levelStart + i.levelCount) ?? ISLANDS[0];
}
