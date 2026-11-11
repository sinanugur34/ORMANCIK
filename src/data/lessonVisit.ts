export type LessonVisit = {
  key: string;
  knownIds: string[];
};

/**
 * A lesson reads the known-word list when it opens.
 * Answers saved during that visit belong to the next opening.
 */
export function lessonVisit(previous: LessonVisit | null, key: string, knownNow: readonly string[]): LessonVisit {
  if (previous?.key === key) return previous;
  return { key, knownIds: [...knownNow] };
}

/** The steps on screen stay put until the lesson id changes. */
export function holdLessonSteps<T>(
  held: { id: number; steps: readonly T[] } | null,
  id: number,
  incoming: readonly T[],
): { id: number; steps: readonly T[] } {
  if (held?.id === id) return held;
  return { id, steps: incoming };
}
