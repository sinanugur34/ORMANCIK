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
import { setVoiceNarrationEnabled } from '../audio/speakPrompt';
import { COSMETICS } from '../data/cosmetics';
import { TOTAL_LEVELS } from '../data/islands';
import { isDeviceTurkish } from '../i18n/deviceLocale';
import { setLanguage as setI18nLanguage, t, type Language } from '../i18n';
import { applyAttempt, type EnglishLevel, type WordAttempt, type WordStat } from '../data/learning';
import { ageToBand, AgeBand } from '../theme/colors';

const STORAGE_KEY = 'ormancik-v1';
const BACKUP_KEY = 'ormancik-v1-backup';
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
  saveWarning: boolean;
  setParentPin: (pin: string) => boolean;
  verifyParentPin: (pin: string) => 'ok' | 'wrong' | 'locked';
  unlockParent: () => void;
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
  'hintsEnabled' | 'englishLevel' | 'wordProgress' | 'sessionLimit' | 'levelStars'
> {
  const level = raw?.englishLevel;
  return {
    hintsEnabled: raw?.hintsEnabled ?? true,
    englishLevel: level === 'some' || level === 'ready' ? level : 'new',
    wordProgress: raw?.wordProgress && typeof raw.wordProgress === 'object' ? raw.wordProgress : {},
    sessionLimit: typeof raw?.sessionLimit === 'number' ? Math.max(0, Math.min(20, Math.round(raw.sessionLimit))) : 8,
    levelStars: raw?.levelStars && typeof raw.levelStars === 'object' ? raw.levelStars : {},
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
  };
}

function migrateFromRaw(raw: string): DevicePersisted {
  const parsed = JSON.parse(raw) as LegacyPersisted;

  if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
    const profiles = parsed.profiles.slice(0, MAX_PROFILES).map((p) => ({
      ...makeProfile(p.name || t('common.player'), p.age ?? 5, p),
      id: p.id || newProfileId(),
    }));
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
    const profile = makeProfile(t('common.player'), parsed.childAge, {
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
  const [saveWarning, setSaveWarning] = useState(false);
  const [sittingCount, setSittingCount] = useState(0);
  const stateRef = useRef(state);
  const allowSave = useRef(false);
  const pinFails = useRef(0);
  const pinLockedUntil = useRef(0);
  stateRef.current = state;

  const commit = useCallback((next: DevicePersisted) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    (async () => {
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
        if (raw) {
          let migrated: DevicePersisted;
          try {
            migrated = migrateFromRaw(raw);
          } catch {
            const backup = await AsyncStorage.getItem(BACKUP_KEY);
            if (!backup) throw new Error('save unreadable');
            migrated = migrateFromRaw(backup);
          }
          setI18nLanguage(migrated.language);
          allowSave.current = true;
          setState(migrated);
        } else {
          const fresh = bootstrapFreshInstall();
          setI18nLanguage(fresh.language);
          allowSave.current = true;
          setState(fresh);
        }
      } catch {
        const fresh = bootstrapFreshInstall();
        setI18nLanguage(fresh.language);
        allowSave.current = false;
        setSaveWarning(true);
        setState(fresh);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready || !allowSave.current) return;
    const payload = JSON.stringify(state);
    AsyncStorage.setItem(STORAGE_KEY, payload)
      .then(() => AsyncStorage.setItem(BACKUP_KEY, payload))
      .catch(() => setSaveWarning(true));
  }, [state, ready]);

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
    return profile;
  }, [commit]);

  const switchProfile = useCallback((id: string): boolean => {
    const s = stateRef.current;
    if (!s.profiles.some((p) => p.id === id)) return false;
    commit({ ...s, activeProfileId: id });
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
      patchActive(stateRef.current, (p) => {
        const wordProgress = { ...p.wordProgress };
        for (const attempt of attempts) {
          if (!attempt.id) continue;
          wordProgress[attempt.id] = applyAttempt(wordProgress[attempt.id], attempt, now);
        }
        return { ...p, wordProgress };
      }),
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
      saveWarning,
      parentPinSet: state.parentPin != null,
      parentUnlockedUntil: state.parentUnlockedUntil,
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
      setHintsEnabled,
      setEnglishLevel,
      setSessionLimit,
      setParentPin,
      verifyParentPin,
      unlockParent,
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
      saveWarning,
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
      setHintsEnabled,
      setEnglishLevel,
      setSessionLimit,
      setParentPin,
      verifyParentPin,
      unlockParent,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
