import { LEARNING_COLORS } from './colorNames';

export const colors = {
  forestDeep: '#0F3D2E',
  forest: '#1B7A4A',
  leaf: '#3CB371',
  mint: '#A8E6CF',
  cream: '#FFF6E8',
  sun: '#FFC857',
  coral: '#FF6B6B',
  sky: '#4ECDC4',
  berry: '#C44569',
  grape: '#6C5CE7',
  peach: '#FFAB76',
  ink: '#1A1A2E',
  muted: '#5C6B73',
  white: '#FFFFFF',
  card: 'rgba(255,255,255,0.92)',
  overlay: 'rgba(15,61,46,0.55)',
};

/** Learning swatches use basic color names. Theme accents above stay as they are. */
export const palette = LEARNING_COLORS.map((item) => item.hex);

export type AgeBand = '3-5' | '6-8' | '9-10';

export function ageToBand(age: number): AgeBand {
  if (age <= 5) return '3-5';
  if (age <= 8) return '6-8';
  return '9-10';
}
