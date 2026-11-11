/** Teaching content that replaced the old activities on levels 1–8. */
export const CURRICULUM_VERSION = 2;
export const FRIENDS_LEVEL_COUNT = 8;

export type CurriculumInput = {
  clearedLevelIds?: number[];
  levelStars?: Record<string, 1 | 2 | 3>;
  wordProgress?: Record<string, unknown>;
  contentVersion?: number;
  friendsIntro?: boolean;
  legacyLevelIds?: number[];
};

export type CurriculumResult = {
  clearedLevelIds: number[];
  levelStars: Record<string, 1 | 2 | 3>;
  contentVersion: number;
  friendsIntro: boolean;
  /** Old activity clears. Kept as history, not as English skill. */
  legacyLevelIds: number[];
};

function friendClears(ids: number[]): number[] {
  return ids.filter((id) => id >= 1 && id <= FRIENDS_LEVEL_COUNT);
}

/**
 * Old saves used levels 1–8 for other activities. Those clears must not count
 * as the new English unit. A word such as "cat" can come from the old animal
 * game, so word records alone do not prove the new unit was finished.
 * Coins, cosmetics, and word records are left to the caller.
 */
export function migrateCurriculum(raw: CurriculumInput): CurriculumResult {
  const clearedLevelIds = Array.isArray(raw.clearedLevelIds) ? [...raw.clearedLevelIds] : [];
  const levelStars = raw.levelStars && typeof raw.levelStars === 'object' ? { ...raw.levelStars } : {};
  const legacyLevelIds = Array.isArray(raw.legacyLevelIds) ? [...raw.legacyLevelIds] : [];

  if ((raw.contentVersion ?? 0) >= CURRICULUM_VERSION) {
    return {
      clearedLevelIds,
      levelStars,
      contentVersion: raw.contentVersion ?? CURRICULUM_VERSION,
      friendsIntro: raw.friendsIntro ?? false,
      legacyLevelIds,
    };
  }

  const legacy = friendClears(clearedLevelIds);
  if (!legacy.length) {
    return {
      clearedLevelIds,
      levelStars,
      contentVersion: CURRICULUM_VERSION,
      friendsIntro: false,
      legacyLevelIds,
    };
  }

  for (const id of legacy) delete levelStars[String(id)];
  return {
    clearedLevelIds: clearedLevelIds.filter((id) => id < 1 || id > FRIENDS_LEVEL_COUNT),
    levelStars,
    contentVersion: CURRICULUM_VERSION,
    friendsIntro: true,
    legacyLevelIds: Array.from(new Set([...legacyLevelIds, ...legacy])),
  };
}
