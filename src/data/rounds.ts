/** Question order and option placement are produced separately. */

export function mixSeed(seed: number): number {
  let s = seed >>> 0;
  s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
  return s;
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
  const needed = seededShuffle(pool.filter(isNeeded), seed + 1);
  const rest = seededShuffle(
    pool.filter((item) => !isNeeded(item)),
    seed + 2,
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
    let options = seededShuffle(pool, seed + 19 + question * 97);
    let index = options.findIndex((item) => same(item, target));
    if (index < 0) {
      options = seededShuffle([target, ...options.filter((item) => !same(item, target))], seed + 41 + question);
      index = options.findIndex((item) => same(item, target));
    }
    return { target, options, targetIndex: index };
  });
}

/** Visible shape size. Touch targets stay larger than this when the shape is small. */
export function shapePixelSize(scale: number): number {
  return Math.round(52 * scale);
}
