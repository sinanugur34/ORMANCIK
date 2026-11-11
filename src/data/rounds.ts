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
  /** Index of the target inside options. Not the question index. */
  targetIndex: number;
};

/**
 * Each question gets its own option order. The target is moved off the
 * question index so tapping first, then second, then third cannot solve it.
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
      options = [target, ...options.filter((item) => !same(item, target))];
      index = 0;
    }
    const blocked = question % options.length;
    if (index === blocked && options.length > 1) {
      const swap = (index + 1) % options.length;
      const next = [...options];
      const current = next[index]!;
      next[index] = next[swap]!;
      next[swap] = current;
      options = next;
      index = swap;
    }
    return { target, options, targetIndex: index };
  });
}
