/** Question order and option placement are produced separately. */

/** Mixes every bit. A nearby seed must not keep the same low bit. */
export function mixSeed(seed: number): number {
  let z = (seed + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

/** Level, replay, and job get separate streams. Adding a constant is not enough. */
export function playSeed(levelId: number, salt: number, lane: number): number {
  return mixSeed(
    Math.imul(levelId + 1, 0x9e3779b9) ^ Math.imul((salt >>> 0) + 1, 0x85ebca6b) ^ Math.imul(lane + 1, 0xc2b2ae35),
  );
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const order = [...items];
  let state = seed >>> 0;
  for (let i = order.length - 1; i > 0; i--) {
    state = mixSeed(state + i);
    const j = state % (i + 1);
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return order;
}

export function orderByNeed<T>(pool: readonly T[], seed: number, isNeeded: (item: T) => boolean): T[] {
  const needed = seededShuffle(pool.filter(isNeeded), mixSeed(seed ^ 0x51));
  const rest = seededShuffle(
    pool.filter((item) => !isNeeded(item)),
    mixSeed(seed ^ 0xae),
  );
  return [...needed, ...rest];
}

export type Round<T> = {
  target: T;
  options: T[];
  /** Where the target landed in this question's own shuffle. */
  targetIndex: number;
};

/**
 * Target order and option order are chosen separately. Nothing about the
 * question number forces the answer into a particular slot.
 */
export function buildRounds<T>(
  pool: readonly T[],
  targets: readonly T[],
  seed: number,
  same: (a: T, b: T) => boolean,
): Round<T>[] {
  if (!pool.length || !targets.length) return [];
  return targets.map((target, question) => {
    let options = seededShuffle(pool, mixSeed(Math.imul(seed ^ 0x6d2b79f5, question + 1) ^ 0x517cc1b7));
    let index = options.findIndex((item) => same(item, target));
    if (index < 0) {
      options = seededShuffle(
        [target, ...options.filter((item) => !same(item, target))],
        mixSeed(Math.imul(seed ^ 0x1b873593, question + 3)),
      );
      index = options.findIndex((item) => same(item, target));
    }
    return { target, options, targetIndex: index };
  });
}

/** Visible shape size. Touch targets stay larger than this when the shape is small. */
export function shapePixelSize(scale: number): number {
  return Math.round(52 * scale);
}
