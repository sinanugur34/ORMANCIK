/** How the same forest is shown. This does not change lesson difficulty. */

export type VisualLayer = 'young' | 'path' | 'explorer';

export function visualLayer(age: number | null | undefined): VisualLayer {
  if (age == null || age <= 5) return 'young';
  if (age <= 7) return 'path';
  return 'explorer';
}
