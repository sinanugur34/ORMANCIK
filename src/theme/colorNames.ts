/** Basic color names for the learning palette. Ids stay separate from food words. */

export type LearningColor = {
  hex: string;
  id: string;
  en: string;
  tr: string;
};

export const LEARNING_COLORS: readonly LearningColor[] = [
  { hex: '#FF6B6B', id: 'color.red', en: 'red', tr: 'kırmızı' },
  { hex: '#FFC857', id: 'color.yellow', en: 'yellow', tr: 'sarı' },
  { hex: '#8D5524', id: 'color.brown', en: 'brown', tr: 'kahverengi' },
  { hex: '#6C5CE7', id: 'color.purple', en: 'purple', tr: 'mor' },
  { hex: '#3CB371', id: 'color.green', en: 'green', tr: 'yeşil' },
  { hex: '#FFAB76', id: 'color.orange', en: 'orange', tr: 'turuncu' },
  { hex: '#FF7EB3', id: 'color.pink', en: 'pink', tr: 'pembe' },
  { hex: '#54A0FF', id: 'color.blue', en: 'blue', tr: 'mavi' },
];

/** Older saves used these names for palette colors. They are not food words. */
export const LEGACY_COLOR_IDS: Record<string, string> = {
  red: 'color.red',
  yellow: 'color.yellow',
  green: 'color.green',
  blue: 'color.blue',
  purple: 'color.purple',
  orange: 'color.orange',
  pink: 'color.pink',
  brown: 'color.brown',
  berry: 'color.pink',
  teal: 'color.teal',
};

const EXTRA_SWATCHES: Record<string, LearningColor> = {
  'color.teal': { hex: '#4ECDC4', id: 'color.teal', en: 'teal', tr: 'turkuaz' },
};

function byHex(hex: string): LearningColor | undefined {
  const key = hex.toLowerCase();
  return LEARNING_COLORS.find((item) => item.hex.toLowerCase() === key);
}

export function colorInfo(hex: string): LearningColor {
  return byHex(hex) ?? { hex, id: 'color.unknown', en: 'color', tr: 'renk' };
}

export function colorName(hex: string, lang: 'en' | 'tr'): string {
  return colorInfo(hex)[lang];
}

export function colorId(hex: string): string {
  return colorInfo(hex).id;
}

export function learningColorById(id: string): LearningColor | null {
  return LEARNING_COLORS.find((item) => item.id === id) ?? EXTRA_SWATCHES[id] ?? null;
}
