import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { setVoiceNarrationEnabled } from '../audio/speakPrompt';
import { COSMETICS } from '../data/cosmetics';
import { TOTAL_LEVELS } from '../data/islands';
import { isDeviceTurkish } from '../i18n/deviceLocale';
import { setLanguage as setI18nLanguage, t, type Language } from '../i18n';
import { CURRICULUM_VERSION, acceptFriendsReplay, declineFriendsReplay, loadCurriculum, saveNeedsRepairCopy } from '../data/curriculum';
import { appendLearningNotes, commitAttempts, currentLearningSession, mergeWordProgress, nextLearningSession, type EnglishLevel, type LearningNote, type WordAttempt, type WordStat } from '../data/learning';
import { ageToBand, AgeBand } from '../theme/colors';

const STORAGE_KEY = 'ormancik-v1';
const BACKUP_KEY = 'ormancik-v1-backup';
/** Unreadable save kept aside before a grown-up starts a new one. */
const QUARANTINE_KEY = 'ormancik-v1-quarantine';
/** Copy of the file from before a curriculum or color-id repair. Written once. */
const REPAIR_BACKUP_KEY = 'ormancik-v1-premigrate';
/** Legacy key from Tiny Grove branding — migrated once into STORAGE_KEY. */
const LEGACY_STORAGE_KEY = 'tiny-grove-v1';
const PARENT_SESSION_MS = 5 * 60 * 1000;
export const MAX_PROFILES = 4;
export const PROFILE_NAME_MAX = 12;

/** First N levels always unlocked; rest unlock sequentially by clearing previous. */
export const FREE_UNLOCK_COUNT = 30;

type Equipped = {
  outfit: string;
  room: string;
  pet: string;
  fx: string | null;
};

export type ChildProfile = {
  id: string;
  name: string;
  age: number;
  coins: number;
  ownedCosmeticIds: string[];
  equipped: Equipped;
  clearedLevelIds: number[];
  highestUnlocked: number;
  /** Turkish gloss available as an optional hint. Learning targets stay English. */
  hintsEnabled: boolean;
  /** Starting point for English. New profiles begin at "new", not a fast track. */
  englishLevel: EnglishLevel;
  wordProgress: Record<string, WordStat>;
  /** Levels before a gentle break prompt. 0 disables it. */
  sessionLimit: number;
  levelStars: Record<string, 1 | 2 | 3>;
  /** 2 = the English friends unit owns levels 1–8. */
  contentVersion: number;
  /** Old player still needs to be shown the new English unit. */
  friendsIntro: boolean;
  /** Previous activity clears for levels 1–8. Not English evidence. */
  legacyLevelIds: number[];
  /** Grown-up can replay levels 1–8 when an older version may have skipped them. */
  replayOffer: boolean;
  /** Present after the grown-up accepts or declines the replay question. */
  replayDecision?: 'accept' | 'decline';
  /** Home tasks a grown-up marked as done together. Not an English score. */
  homeTasks: string[];
  /** Dated attempts for the family view. Not a mastery score. */
  recentLearning: LearningNote[];
};

type DevicePersisted = {
  profiles: ChildProfile[];
  activeProfileId: string | null;
  /** Device-level — shared across kids on this device. */
  premium: boolean;
  /** Device-level voice narration preference. */
  voiceEnabled: boolean;
  /** Device-level UI + TTS language (TR primary, EN L2). */
  language: Language;
  /**
   * True after the user picks on the TR language gate, or after non-TR
   * devices are silently set to English. Existing saves migrate to true.
   */
  languageChosen: boolean;
  /** Local 4-digit grown-up PIN. Not an account password. */
  parentPin: string | null;
  parentUnlockedUntil: number;
};

/** Legacy single-age save shape (pre multi-profile). */
type LegacyPersisted = {
  childAge?: number | null;
  coins?: number;
  premium?: boolean;
  voiceEnabled?: boolean;
  language?: Language;
  languageChosen?: boolean;
  parentPin?: string | null;
  ownedCosmeticIds?: string[];
  equipped?: Partial<Equipped>;
  clearedLevelIds?: number[];
  highestUnlocked?: number;
  profiles?: ChildProfile[];
  activeProfileId?: string | null;
};

type GameContextValue = {
  ready: boolean;
  profiles: ChildProfile[];
  activeProfileId: string | null;
  activeProfile: ChildProfile | null;
  /** Convenience mirrors of active profile (null-safe defaults when no profile). */
  childAge: number | null;
  childName: string | null;
  coins: number;
  ownedCosmeticIds: string[];
  equipped: Equipped;
  clearedLevelIds: number[];
  highestUnlocked: number;
  premium: boolean;
  voiceEnabled: boolean;
  language: Language;
  /** False only on first launch for Turkish-system devices (LanguageGate). */
  languageChosen: boolean;
  ageBand: AgeBand | null;
  createProfile: (name: string, age: number) => ChildProfile | null;
  switchProfile: (id: string) => boolean;
  deleteProfile: (id: string) => boolean;
  updateActiveAge: (age: number) => void;
  updateActiveName: (name: string) => void;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  setPremium: (v: boolean) => void;
  setVoiceEnabled: (v: boolean) => void;
  setLanguage: (lang: Language) => void;
  /** First-launch gate: set language and mark languageChosen. */
  chooseLanguage: (lang: Language) => void;
  ownCosmetic: (id: string) => void;
  equipCosmetic: (id: string) => void;
  clearLevel: (levelId: number, reward: number, stars?: 1 | 2 | 3) => number;
  recordLearning: (attempts: WordAttempt[]) => void;
  isLevelUnlocked: (levelId: number) => boolean;
  resetProgress: () => void;
  hintsEnabled: boolean;
  englishLevel: EnglishLevel;
  wordProgress: Record<string, WordStat>;
  sessionLimit: number;
  sittingCount: number;
  dismissSitting: () => void;
  setHintsEnabled: (v: boolean) => void;
  setEnglishLevel: (level: EnglishLevel) => void;
  setSessionLimit: (n: number) => void;
  addCoinsToProfile: (profileId: string, n: number) => void;
  parentPinSet: boolean;
  parentUnlockedUntil: number;
  /** read: the file could not be read. write: a later save failed. */
  saveIssue: 'read' | 'write' | null;
  /** True while a corrupt file is held and must not be overwritten. */
  saveBlocked: boolean;
  backupAvailable: boolean;
  setParentPin: (pin: string) => boolean;
  verifyParentPin: (pin: string) => 'ok' | 'wrong' | 'locked';
  unlockParent: () => void;
  /** Hides the grown-up area before the timer ends. */
  lockParent: () => void;
  /** True only while the grown-up timer is still running. Updates when it ends. */
  parentOpen: boolean;
  friendsIntro: boolean;
  dismissFriendsIntro: () => void;
  replayOffer: boolean;
  acceptReplay: () => void;
  declineReplay: () => void;
  homeTasks: string[];
  recentLearning: LearningNote[];
  markHomeTask: (id: string) => void;
  retrySaveLoad: () => Promise<void>;
  restoreBackup: () => Promise<boolean>;
  /** Keeps the unreadable file aside, then allows a new save. */
  startNewSave: () => Promise<boolean>;
};

const starterOwned = COSMETICS.filter((c) => c.starter).map((c) => c.id);

const defaultEquipped: Equipped = {
  outfit: 'outfit-leaf',
  room: 'room-meadow',
  pet: 'pet-squirrel',
  fx: null,
};

function normalizeLanguage(v: unknown): Language {
  return v === 'en' ? 'en' : 'tr';
}

const defaultDevice: DevicePersisted = {
  profiles: [],
  activeProfileId: null,
  premium: false,
  voiceEnabled: true,
  language: 'tr',
  languageChosen: false,
  parentPin: null,
  parentUnlockedUntil: 0,
};

/** Fresh install: TR devices wait for LanguageGate; all others start in English. */
function bootstrapFreshInstall(): DevicePersisted {
  if (isDeviceTurkish()) {
    return { ...defaultDevice, language: 'tr', languageChosen: false };
  }
  return { ...defaultDevice, language: 'en', languageChosen: true };
}

/**
 * Existing saves: treat language as already chosen so users are never re-asked.
 * Explicit `languageChosen: false` is preserved (e.g. after full reset mid-flow).
 */
function resolveLanguageChosen(parsed: LegacyPersisted): boolean {
  if (typeof parsed.languageChosen === 'boolean') return parsed.languageChosen;
  return true;
}

function newProfileId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampAge(age: number): number {
  return Math.min(9, Math.max(3, Math.round(age)));
}

function learningDefaults(raw?: Partial<ChildProfile>): Pick<
  ChildProfile,
  'hintsEnabled' | 'englishLevel' | 'wordProgress' | 'sessionLimit' | 'levelStars' | 'replayOffer' | 'homeTasks' | 'recentLearning'
> {
  const level = raw?.englishLevel;
  return {
    hintsEnabled: raw?.hintsEnabled ?? true,
    englishLevel: level === 'some' || level === 'ready' ? level : 'new',
    wordProgress: mergeWordProgress(raw?.wordProgress),
    sessionLimit: typeof raw?.sessionLimit === 'number' ? Math.max(0, Math.min(20, Math.round(raw.sessionLimit))) : 8,
    levelStars: raw?.levelStars && typeof raw.levelStars === 'object' ? raw.levelStars : {},
    replayOffer: raw?.replayOffer ?? false,
    homeTasks: Array.isArray(raw?.homeTasks) ? raw.homeTasks.filter((id) => typeof id === 'string') : [],
    recentLearning: Array.isArray(raw?.recentLearning)
      ? raw.recentLearning
          .filter((note) => note && typeof note.id === 'string' && typeof note.at === 'number')
          .slice(-40)
          .map((note, index) => ({
            eventId:
              typeof note.eventId === 'string' && note.eventId
                ? note.eventId
                : `saved-${note.at}-${index}-${note.id}`,
            id: note.id,
            at: note.at,
            correct: note.correct !== false,
            independent: Boolean(note.independent),
            skill:
              note.skill === 'picture-match' ||
              note.skill === 'count-quantity' ||
              note.skill === 'listen-recognize' ||
              note.skill === 'prompt-incomplete'
                ? note.skill
                : 'listen-recognize',
          }))
      : [],
  };
}

function readPin(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}$/.test(value) ? value : null;
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, PROFILE_NAME_MAX);
}

function makeProfile(name: string, age: number, progress?: Partial<ChildProfile>): ChildProfile {
  return {
    id: newProfileId(),
    name: sanitizeName(name) || t('common.player'),
    age: clampAge(age),
    coins: progress?.coins ?? 40,
    ownedCosmeticIds: progress?.ownedCosmeticIds?.length
      ? progress.ownedCosmeticIds
      : [...starterOwned],
    equipped: { ...defaultEquipped, ...progress?.equipped },
    clearedLevelIds: progress?.clearedLevelIds ?? [],
    highestUnlocked: progress?.highestUnlocked ?? FREE_UNLOCK_COUNT,
    ...learningDefaults(progress),
    contentVersion: progress?.contentVersion ?? CURRICULUM_VERSION,
    friendsIntro: progress?.friendsIntro ?? false,
    legacyLevelIds: progress?.legacyLevelIds ?? [],
  };
}

function profileFromSaved(raw: Partial<ChildProfile> & { name?: string; age?: number }): ChildProfile {
  const curriculum = loadCurriculum(raw);
  return {
    ...makeProfile(raw.name || t('common.player'), raw.age ?? 5, {
      ...raw,
      clearedLevelIds: curriculum.clearedLevelIds,
      levelStars: curriculum.levelStars,
      wordProgress: raw.wordProgress,
    }),
    id: raw.id || newProfileId(),
    contentVersion: curriculum.contentVersion,
    friendsIntro: curriculum.friendsIntro,
    legacyLevelIds: curriculum.legacyLevelIds,
    replayOffer: curriculum.replayOffer,
    replayDecision: curriculum.replayDecision,
  };
}

function migrateFromRaw(raw: string): DevicePersisted {
  const parsed = JSON.parse(raw) as LegacyPersisted;

  if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
    const profiles = parsed.profiles.slice(0, MAX_PROFILES).map((p) => profileFromSaved(p));
    const activeProfileId =
      profiles.find((p) => p.id === parsed.activeProfileId)?.id ?? profiles[0]!.id;
    return {
      profiles,
      activeProfileId,
      premium: parsed.premium ?? false,
      voiceEnabled: parsed.voiceEnabled ?? true,
      language: normalizeLanguage(parsed.language),
      languageChosen: resolveLanguageChosen(parsed),
      parentPin: readPin(parsed.parentPin),
      parentUnlockedUntil: 0,
    };
  }

  // Legacy single-age → one profile named "Oyuncu" / "Player"
  if (parsed.childAge != null && typeof parsed.childAge === 'number') {
    const profile = profileFromSaved({
      name: t('common.player'),
      age: parsed.childAge,
      coins: parsed.coins,
      ownedCosmeticIds: parsed.ownedCosmeticIds,
      equipped: parsed.equipped as Equipped | undefined,
      clearedLevelIds: parsed.clearedLevelIds,
      highestUnlocked: parsed.highestUnlocked,
    });
    return {
      profiles: [profile],
      activeProfileId: profile.id,
      premium: parsed.premium ?? false,
      voiceEnabled: parsed.voiceEnabled ?? true,
      language: normalizeLanguage(parsed.language),
      languageChosen: resolveLanguageChosen(parsed),
      parentPin: readPin(parsed.parentPin),
      parentUnlockedUntil: 0,
    };
  }

  return {
    ...defaultDevice,
    premium: parsed.premium ?? false,
    voiceEnabled: parsed.voiceEnabled ?? true,
    language: normalizeLanguage(parsed.language),
    languageChosen: resolveLanguageChosen(parsed),
    parentPin: readPin(parsed.parentPin),
  };
}

function patchActive(
  state: DevicePersisted,
  patch: (p: ChildProfile) => ChildProfile,
): DevicePersisted {
  if (!state.activeProfileId) return state;
  return {
    ...state,
    profiles: state.profiles.map((p) =>
      p.id === state.activeProfileId ? patch(p) : p,
    ),
  };
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DevicePersisted>(defaultDevice);
  const [ready, setReady] = useState(false);
  const [saveIssue, setSaveIssue] = useState<'read' | 'write' | null>(null);
  const [saveBlocked, setSaveBlocked] = useState(false);
  const [heldSave, setHeldSave] = useState<{ mainRaw: string | null; backupRaw: string | null }>({
    mainRaw: null,
    backupRaw: null,
  });
  const [sittingCount, setSittingCount] = useState(0);
  const [parentOpen, setParentOpen] = useState(false);
  const stateRef = useRef(state);
  const allowSave = useRef(false);
  const pinFails = useRef(0);
  const pinLockedUntil = useRef(0);
  const heldSaveRef = useRef(heldSave);
  stateRef.current = state;
  heldSaveRef.current = heldSave;

  const commit = useCallback((next: DevicePersisted) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const acceptLoaded = useCallback((migrated: DevicePersisted) => {
    setI18nLanguage(migrated.language);
    allowSave.current = true;
    setSaveBlocked(false);
    setSaveIssue(null);
    setHeldSave({ mainRaw: null, backupRaw: null });
    stateRef.current = migrated;
    setState(migrated);
  }, []);

  const holdUnreadable = useCallback((mainRaw: string | null, backupRaw: string | null) => {
    const fresh = bootstrapFreshInstall();
    setI18nLanguage(fresh.language);
    allowSave.current = false;
    setSaveIssue('read');
    setSaveBlocked(true);
    setHeldSave({ mainRaw, backupRaw });
    stateRef.current = fresh;
    setState(fresh);
  }, []);

  const keepRepairCopy = useCallback(async (raw: string) => {
    try {
      const existing = await AsyncStorage.getItem(REPAIR_BACKUP_KEY);
      if (existing) return;
      const parsed = JSON.parse(raw) as { profiles?: Array<{ contentVersion?: number; wordProgress?: Record<string, unknown> }> };
      if (!saveNeedsRepairCopy(parsed)) return;
      await AsyncStorage.setItem(REPAIR_BACKUP_KEY, raw);
    } catch {
      // Loading still continues. The copy is only a safety file.
    }
  }, []);

  const loadFromDisk = useCallback(async () => {
    try {
      let raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          raw = legacy;
          await AsyncStorage.setItem(STORAGE_KEY, legacy);
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }
      if (!raw) {
        acceptLoaded(bootstrapFreshInstall());
        return;
      }
      try {
        const migrated = migrateFromRaw(raw);
        await keepRepairCopy(raw);
        acceptLoaded(migrated);
        return;
      } catch {
        const backup = await AsyncStorage.getItem(BACKUP_KEY);
        if (backup) {
          try {
            await keepRepairCopy(backup);
            acceptLoaded(migrateFromRaw(backup));
            return;
          } catch {
            holdUnreadable(raw, backup);
            return;
          }
        }
        holdUnreadable(raw, null);
      }
    } catch {
      holdUnreadable(null, null);
    }
  }, [acceptLoaded, holdUnreadable, keepRepairCopy]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      await loadFromDisk();
      if (!cancel) setReady(true);
    })();
    return () => {
      cancel = true;
    };
  }, [loadFromDisk]);

  useEffect(() => {
    if (!ready || !allowSave.current) return;
    const payload = JSON.stringify(state);
    AsyncStorage.setItem(STORAGE_KEY, payload)
      .then(() => AsyncStorage.setItem(BACKUP_KEY, payload))
      .then(() => setSaveIssue((current) => (current === 'write' ? null : current)))
      .catch(() => setSaveIssue('write'));
  }, [state, ready]);

  useEffect(() => {
    const sync = () => {
      const open = stateRef.current.parentUnlockedUntil > Date.now();
      setParentOpen((current) => (current === open ? current : open));
    };
    sync();
    const id = setInterval(sync, 1000);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [state.parentUnlockedUntil]);

  useEffect(() => {
    setVoiceNarrationEnabled(state.voiceEnabled);
  }, [state.voiceEnabled]);

  useEffect(() => {
    setI18nLanguage(state.language);
  }, [state.language]);

  const activeProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeProfileId) ?? null,
    [state.profiles, state.activeProfileId],
  );

  const createProfile = useCallback((name: string, age: number): ChildProfile | null => {
    const clean = sanitizeName(name);
    if (!clean) return null;
    const s = stateRef.current;
    if (s.profiles.length >= MAX_PROFILES) return null;
    const profile = makeProfile(clean, age);
    commit({
      ...s,
      profiles: [...s.profiles, profile],
      activeProfileId: profile.id,
    });
    setSittingCount(0);
    return profile;
  }, [commit]);

  const switchProfile = useCallback((id: string): boolean => {
    const s = stateRef.current;
    if (!s.profiles.some((p) => p.id === id)) return false;
    commit({ ...s, activeProfileId: id });
    // Each child has their own sitting. Switching starts the break count again.
    nextLearningSession();
    setSittingCount(0);
    return true;
  }, [commit]);

  const deleteProfile = useCallback((id: string): boolean => {
    const s = stateRef.current;
    if (s.profiles.length <= 1) return false;
    if (!s.profiles.some((p) => p.id === id)) return false;
    const profiles = s.profiles.filter((p) => p.id !== id);
    const activeProfileId = s.activeProfileId === id ? profiles[0]!.id : s.activeProfileId;
    commit({ ...s, profiles, activeProfileId });
    return true;
  }, [commit]);

  const updateActiveAge = useCallback((age: number) => {
    setState((s) =>
      patchActive(s, (p) => ({ ...p, age: clampAge(age) })),
    );
  }, []);

  const updateActiveName = useCallback((name: string) => {
    const clean = sanitizeName(name);
    if (!clean) return;
    setState((s) => patchActive(s, (p) => ({ ...p, name: clean })));
  }, []);

  const addCoins = useCallback((n: number) => {
    setState((s) => patchActive(s, (p) => ({ ...p, coins: p.coins + n })));
  }, []);

  const spendCoins = useCallback((n: number) => {
    const s = stateRef.current;
    const active = s.profiles.find((p) => p.id === s.activeProfileId);
    if (!active || active.coins < n) return false;
    commit(patchActive(s, (p) => ({ ...p, coins: p.coins - n })));
    return true;
  }, [commit]);

  const addCoinsToProfile = useCallback((profileId: string, n: number) => {
    const s = stateRef.current;
    if (!s.profiles.some((p) => p.id === profileId) || n === 0) return;
    commit({
      ...s,
      profiles: s.profiles.map((p) => (p.id === profileId ? { ...p, coins: p.coins + n } : p)),
    });
  }, [commit]);

  const setPremium = useCallback((v: boolean) => {
    commit({ ...stateRef.current, premium: v });
  }, [commit]);

  const setVoiceEnabled = useCallback((v: boolean) => {
    setState((s) => ({ ...s, voiceEnabled: v }));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    const next = normalizeLanguage(lang);
    setI18nLanguage(next);
    setState((s) =>
      s.language === next && s.languageChosen
        ? s
        : { ...s, language: next, languageChosen: true },
    );
  }, []);

  const chooseLanguage = useCallback((lang: Language) => {
    const next = normalizeLanguage(lang);
    setI18nLanguage(next);
    setState((s) => ({ ...s, language: next, languageChosen: true }));
  }, []);

  const ownCosmetic = useCallback((id: string) => {
    setState((s) =>
      patchActive(s, (p) =>
        p.ownedCosmeticIds.includes(id)
          ? p
          : { ...p, ownedCosmeticIds: [...p.ownedCosmeticIds, id] },
      ),
    );
  }, []);

  const equipCosmetic = useCallback((id: string) => {
    const item = COSMETICS.find((c) => c.id === id);
    if (!item) return;
    setState((s) => {
      const active = s.profiles.find((p) => p.id === s.activeProfileId);
      if (!active) return s;
      if (!active.ownedCosmeticIds.includes(id) && !s.premium) return s;
      return patchActive(s, (p) => {
        const equipped = { ...p.equipped };
        if (item.kind === 'outfit') equipped.outfit = id;
        if (item.kind === 'room') equipped.room = id;
        if (item.kind === 'pet') equipped.pet = id;
        if (item.kind === 'fx') equipped.fx = id;
        return { ...p, equipped };
      });
    });
  }, []);

  const clearLevel = useCallback((levelId: number, reward: number, stars?: 1 | 2 | 3): number => {
    const s = stateRef.current;
    const active = s.profiles.find((p) => p.id === s.activeProfileId);
    if (!active) return 0;
    const already = active.clearedLevelIds.includes(levelId);
    const awarded = already ? Math.floor(reward / 4) : reward;
    commit(
      patchActive(s, (p) => {
        const cleared = already ? p.clearedLevelIds : [...p.clearedLevelIds, levelId];
        const nextUnlock = Math.max(p.highestUnlocked, Math.min(TOTAL_LEVELS, levelId + 1));
        const levelStars = { ...p.levelStars };
        if (stars) levelStars[String(levelId)] = stars;
        return {
          ...p,
          clearedLevelIds: cleared,
          highestUnlocked: Math.max(FREE_UNLOCK_COUNT, nextUnlock, p.highestUnlocked),
          coins: p.coins + awarded,
          levelStars,
          friendsIntro: levelId <= 8 ? false : p.friendsIntro,
        };
      }),
    );
    setSittingCount((c) => c + 1);
    return awarded;
  }, [commit]);

  const recordLearning = useCallback((attempts: WordAttempt[]) => {
    if (!attempts.length) return;
    const now = Date.now();
    commit(
      patchActive(stateRef.current, (p) => ({
        ...p,
        wordProgress: commitAttempts(p.wordProgress, attempts, now, { sessionId: currentLearningSession() }),
        recentLearning: appendLearningNotes(p.recentLearning, attempts, now),
      })),
    );
  }, [commit]);

  const acceptReplay = useCallback(() => {
    commit(
      patchActive(stateRef.current, (p) => ({
        ...p,
        ...acceptFriendsReplay({
          clearedLevelIds: p.clearedLevelIds,
          levelStars: p.levelStars,
          contentVersion: p.contentVersion,
          friendsIntro: p.friendsIntro,
          legacyLevelIds: p.legacyLevelIds,
          replayOffer: p.replayOffer,
        }),
      })),
    );
  }, [commit]);

  const declineReplay = useCallback(() => {
    commit(
      patchActive(stateRef.current, (p) => ({
        ...p,
        ...declineFriendsReplay({
          clearedLevelIds: p.clearedLevelIds,
          levelStars: p.levelStars,
          contentVersion: p.contentVersion,
          friendsIntro: p.friendsIntro,
          legacyLevelIds: p.legacyLevelIds,
          replayOffer: p.replayOffer,
        }),
      })),
    );
  }, [commit]);

  const markHomeTask = useCallback((id: string) => {
    commit(
      patchActive(stateRef.current, (p) => ({
        ...p,
        homeTasks: p.homeTasks.includes(id) ? p.homeTasks : [...p.homeTasks, id],
      })),
    );
  }, [commit]);

  const setHintsEnabled = useCallback((v: boolean) => {
    commit(patchActive(stateRef.current, (p) => ({ ...p, hintsEnabled: v })));
  }, [commit]);

  const setEnglishLevel = useCallback((level: EnglishLevel) => {
    commit(patchActive(stateRef.current, (p) => ({ ...p, englishLevel: level })));
  }, [commit]);

  const setSessionLimit = useCallback((n: number) => {
    const sessionLimit = Math.max(0, Math.min(20, Math.round(n)));
    commit(patchActive(stateRef.current, (p) => ({ ...p, sessionLimit })));
  }, [commit]);

  const dismissSitting = useCallback(() => {
    setSittingCount(0);
  }, []);

  const dismissFriendsIntro = useCallback(() => {
    commit(patchActive(stateRef.current, (p) => ({ ...p, friendsIntro: false })));
  }, [commit]);

  const lockParent = useCallback(() => {
    commit({ ...stateRef.current, parentUnlockedUntil: 0 });
  }, [commit]);

  const quarantineHeld = useCallback(async (): Promise<boolean> => {
    const raw = heldSaveRef.current.mainRaw;
    if (!raw) return true;
    try {
      await AsyncStorage.setItem(QUARANTINE_KEY, raw);
      return true;
    } catch {
      return false;
    }
  }, []);

  const retrySaveLoad = useCallback(async () => {
    await loadFromDisk();
  }, [loadFromDisk]);

  const restoreBackup = useCallback(async (): Promise<boolean> => {
    const backup = heldSaveRef.current.backupRaw;
    if (!backup) return false;
    let migrated: DevicePersisted;
    try {
      migrated = migrateFromRaw(backup);
    } catch {
      return false;
    }
    const kept = await quarantineHeld();
    if (!kept) return false;
    acceptLoaded(migrated);
    return true;
  }, [acceptLoaded, quarantineHeld]);

  const startNewSave = useCallback(async (): Promise<boolean> => {
    const kept = await quarantineHeld();
    if (!kept) return false;
    const pin = stateRef.current.parentPin;
    const fresh = { ...bootstrapFreshInstall(), parentPin: pin };
    acceptLoaded(fresh);
    return true;
  }, [acceptLoaded, quarantineHeld]);

  const setParentPin = useCallback((pin: string) => {
    if (!/^\d{4}$/.test(pin)) return false;
    const next = { ...stateRef.current, parentPin: pin, parentUnlockedUntil: Date.now() + PARENT_SESSION_MS };
    commit(next);
    pinFails.current = 0;
    return true;
  }, [commit]);

  const unlockParent = useCallback(() => {
    commit({ ...stateRef.current, parentUnlockedUntil: Date.now() + PARENT_SESSION_MS });
  }, [commit]);

  const verifyParentPin = useCallback((pin: string): 'ok' | 'wrong' | 'locked' => {
    if (Date.now() < pinLockedUntil.current) return 'locked';
    if (stateRef.current.parentPin && stateRef.current.parentPin === pin) {
      pinFails.current = 0;
      unlockParent();
      return 'ok';
    }
    pinFails.current += 1;
    if (pinFails.current >= 5) {
      pinFails.current = 0;
      pinLockedUntil.current = Date.now() + 30_000;
      return 'locked';
    }
    return 'wrong';
  }, [unlockParent]);

  const isLevelUnlocked = useCallback(
    (levelId: number) => {
      const unlocked = activeProfile?.highestUnlocked ?? FREE_UNLOCK_COUNT;
      return levelId <= unlocked && levelId <= TOTAL_LEVELS;
    },
    [activeProfile?.highestUnlocked],
  );

  const resetProgress = useCallback(() => {
    const kept = stateRef.current;
    const fresh = bootstrapFreshInstall();
    commit({
      ...fresh,
      premium: kept.premium,
      parentPin: kept.parentPin,
    });
    setSittingCount(0);
  }, [commit]);

  const ageBand = useMemo(
    () => (activeProfile != null ? ageToBand(activeProfile.age) : null),
    [activeProfile],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      ready,
      profiles: state.profiles,
      activeProfileId: state.activeProfileId,
      activeProfile,
      childAge: activeProfile?.age ?? null,
      childName: activeProfile?.name ?? null,
      coins: activeProfile?.coins ?? 0,
      ownedCosmeticIds: activeProfile?.ownedCosmeticIds ?? starterOwned,
      equipped: activeProfile?.equipped ?? defaultEquipped,
      clearedLevelIds: activeProfile?.clearedLevelIds ?? [],
      highestUnlocked: activeProfile?.highestUnlocked ?? FREE_UNLOCK_COUNT,
      premium: state.premium,
      voiceEnabled: state.voiceEnabled,
      language: state.language,
      languageChosen: state.languageChosen,
      ageBand,
      hintsEnabled: activeProfile?.hintsEnabled ?? true,
      englishLevel: activeProfile?.englishLevel ?? 'new',
      wordProgress: activeProfile?.wordProgress ?? {},
      sessionLimit: activeProfile?.sessionLimit ?? 8,
      sittingCount,
      saveIssue,
      saveBlocked,
      backupAvailable: heldSave.backupRaw != null,
      parentPinSet: state.parentPin != null,
      parentUnlockedUntil: state.parentUnlockedUntil,
      parentOpen,
      friendsIntro: activeProfile?.friendsIntro ?? false,
      replayOffer: activeProfile?.replayOffer ?? false,
      homeTasks: activeProfile?.homeTasks ?? [],
      recentLearning: activeProfile?.recentLearning ?? [],
      createProfile,
      switchProfile,
      deleteProfile,
      updateActiveAge,
      updateActiveName,
      addCoins,
      addCoinsToProfile,
      spendCoins,
      setPremium,
      setVoiceEnabled,
      setLanguage,
      chooseLanguage,
      ownCosmetic,
      equipCosmetic,
      clearLevel,
      recordLearning,
      isLevelUnlocked,
      resetProgress,
      dismissSitting,
      dismissFriendsIntro,
      acceptReplay,
      declineReplay,
      markHomeTask,
      setHintsEnabled,
      setEnglishLevel,
      setSessionLimit,
      setParentPin,
      verifyParentPin,
      unlockParent,
      lockParent,
      retrySaveLoad,
      restoreBackup,
      startNewSave,
    }),
    [
      state.profiles,
      state.activeProfileId,
      state.premium,
      state.voiceEnabled,
      state.language,
      state.languageChosen,
      state.parentPin,
      state.parentUnlockedUntil,
      ready,
      activeProfile,
      ageBand,
      sittingCount,
      saveIssue,
      saveBlocked,
      heldSave.backupRaw,
      parentOpen,
      createProfile,
      switchProfile,
      deleteProfile,
      updateActiveAge,
      updateActiveName,
      addCoins,
      addCoinsToProfile,
      spendCoins,
      setPremium,
      setVoiceEnabled,
      setLanguage,
      chooseLanguage,
      ownCosmetic,
      equipCosmetic,
      clearLevel,
      recordLearning,
      isLevelUnlocked,
      resetProgress,
      dismissSitting,
      dismissFriendsIntro,
      acceptReplay,
      declineReplay,
      markHomeTask,
      setHintsEnabled,
      setEnglishLevel,
      setSessionLimit,
      setParentPin,
      verifyParentPin,
      unlockParent,
      lockParent,
      retrySaveLoad,
      restoreBackup,
      startNewSave,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
