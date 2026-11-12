import { canonicalWordId } from './learning';

/** Teaching content that replaced the old activities on levels 1–8. */
export const CURRICULUM_VERSION = 3;
export const FRIENDS_LEVEL_COUNT = 8;

export type CurriculumInput = {
  clearedLevelIds?: number[];
  levelStars?: Record<string, 1 | 2 | 3>;
  wordProgress?: Record<string, unknown>;
  contentVersion?: number;
  friendsIntro?: boolean;
  legacyLevelIds?: number[];
  replayOffer?: boolean;
  /** Set when a grown-up answers the replay question. Absent means it is still open. */
  replayDecision?: 'accept' | 'decline';
};

export type CurriculumResult = {
  clearedLevelIds: number[];
  levelStars: Record<string, 1 | 2 | 3>;
  contentVersion: number;
  friendsIntro: boolean;
  /** Old activity clears. Kept as history, not as English skill. */
  legacyLevelIds: number[];
  /**
   * Version 2 could keep old 1–8 clears when a word such as cat existed.
   * That profile cannot be told apart from a real unit finish, so the
   * grown-up may replay. Coins and words stay either way.
   */
  replayOffer: boolean;
  replayDecision?: 'accept' | 'decline';
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
function kept(raw: CurriculumInput, clearedLevelIds: number[], levelStars: Record<string, 1 | 2 | 3>, legacyLevelIds: number[]): CurriculumResult {
  return {
    clearedLevelIds,
    levelStars,
    contentVersion: raw.contentVersion && raw.contentVersion > CURRICULUM_VERSION ? raw.contentVersion : CURRICULUM_VERSION,
    friendsIntro: raw.friendsIntro ?? false,
    legacyLevelIds,
    replayOffer: raw.replayDecision ? false : (raw.replayOffer ?? false),
    replayDecision: raw.replayDecision,
  };
}

/**
 * The loader must pass the stored offer through. A version-3 profile with
 * `replayOffer: false` and no decision is left alone: that shape is also a
 * child who finished the new lessons, and a declined offer. Wiping every
 * version-3 clear would be the wrong repair.
 */
export function loadCurriculum(raw: CurriculumInput): CurriculumResult {
  return migrateCurriculum({
    clearedLevelIds: raw.clearedLevelIds,
    levelStars: raw.levelStars,
    wordProgress: raw.wordProgress,
    contentVersion: raw.contentVersion,
    friendsIntro: raw.friendsIntro,
    legacyLevelIds: raw.legacyLevelIds,
    replayOffer: raw.replayOffer,
    replayDecision: raw.replayDecision,
  });
}

export function migrateCurriculum(raw: CurriculumInput): CurriculumResult {
  const clearedLevelIds = Array.isArray(raw.clearedLevelIds) ? [...raw.clearedLevelIds] : [];
  const levelStars = raw.levelStars && typeof raw.levelStars === 'object' ? { ...raw.levelStars } : {};
  const legacyLevelIds = Array.isArray(raw.legacyLevelIds) ? [...raw.legacyLevelIds] : [];
  const version = raw.contentVersion ?? 0;

  if (version >= CURRICULUM_VERSION) return kept(raw, clearedLevelIds, levelStars, legacyLevelIds);

  if (version >= 2) {
    const ambiguous = !(raw.friendsIntro ?? false) && legacyLevelIds.length === 0 && friendClears(clearedLevelIds).length > 0;
    return {
      clearedLevelIds,
      levelStars,
      contentVersion: CURRICULUM_VERSION,
      friendsIntro: raw.friendsIntro ?? false,
      legacyLevelIds,
      replayOffer: ambiguous,
      replayDecision: undefined,
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
      replayOffer: false,
      replayDecision: undefined,
    };
  }

  for (const id of legacy) delete levelStars[String(id)];
  return {
    clearedLevelIds: clearedLevelIds.filter((id) => id < 1 || id > FRIENDS_LEVEL_COUNT),
    levelStars,
    contentVersion: CURRICULUM_VERSION,
    friendsIntro: true,
    legacyLevelIds: Array.from(new Set([...legacyLevelIds, ...legacy])),
    replayOffer: false,
    replayDecision: undefined,
  };
}

/** Opens levels 1–8 again. Later clears, coins, and word records stay with the caller. */
export function acceptFriendsReplay(raw: CurriculumResult): CurriculumResult {
  const legacy = friendClears(raw.clearedLevelIds);
  return {
    ...raw,
    clearedLevelIds: raw.clearedLevelIds.filter((id) => id < 1 || id > FRIENDS_LEVEL_COUNT),
    legacyLevelIds: Array.from(new Set([...raw.legacyLevelIds, ...legacy])),
    friendsIntro: true,
    replayOffer: false,
    replayDecision: 'accept',
    contentVersion: CURRICULUM_VERSION,
  };
}

export function declineFriendsReplay(raw: CurriculumResult): CurriculumResult {
  return { ...raw, replayOffer: false, replayDecision: 'decline', contentVersion: CURRICULUM_VERSION };
}

export function saveNeedsRepairCopy(parsed: {
  profiles?: Array<{ contentVersion?: number; wordProgress?: Record<string, unknown> }>;
}): boolean {
  if (!Array.isArray(parsed.profiles)) return true;
  return parsed.profiles.some((profile) => {
    if ((profile.contentVersion ?? 0) < CURRICULUM_VERSION) return true;
    return Object.keys(profile.wordProgress ?? {}).some((id) => canonicalWordId(id) !== id);
  });
}
