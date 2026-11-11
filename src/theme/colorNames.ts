/** Spoken / accessible names for the fixed play palette. */
const NAMES: Record<string, { en: string; tr: string }> = {
  '#FF6B6B': { en: 'red', tr: 'kırmızı' },
  '#FFC857': { en: 'yellow', tr: 'sarı' },
  '#4ECDC4': { en: 'teal', tr: 'deniz mavisi' },
  '#6C5CE7': { en: 'purple', tr: 'mor' },
  '#3CB371': { en: 'green', tr: 'yeşil' },
  '#FFAB76': { en: 'orange', tr: 'turuncu' },
  '#C44569': { en: 'berry', tr: 'böğürtlen' },
  '#54A0FF': { en: 'blue', tr: 'mavi' },
};

export function colorName(hex: string, lang: 'en' | 'tr'): string {
  const named = NAMES[hex] ?? NAMES[hex.toUpperCase()];
  if (named) return named[lang];
  return lang === 'en' ? 'color' : 'renk';
}
