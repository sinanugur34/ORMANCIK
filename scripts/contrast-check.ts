import assert from 'node:assert/strict';
import { colors } from '../src/theme/colors';

function channel(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

function contrast(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

const normal = 4.5;
assert.ok(contrast(colors.white, colors.forest) >= normal);
assert.ok(contrast(colors.white, colors.coralStrong) >= normal);
assert.ok(contrast(colors.coralInk, colors.cream) >= normal);
assert.ok(contrast(colors.coralInk, colors.white) >= normal);
assert.ok(contrast(colors.forestDeep, colors.sun) >= normal);
assert.ok(contrast(colors.forestDeep, colors.sky) >= normal);
assert.ok(contrast(colors.forestDeep, colors.cream) >= normal);
assert.ok(contrast(colors.muted, colors.cream) >= normal);
assert.ok(contrast(colors.forestDeep, colors.mint) >= normal);
console.log('contrast checks passed');
