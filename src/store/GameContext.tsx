import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { setVoiceNarrationEnabled } from '../audio/speakPrompt';
import { COSMETICS } from '../data/cosmetics';
import { TOTAL_LEVELS } from '../data/islands';
import { ageToBand, AgeBand } from '../theme/colors';

const STORAGE_KEY = 'tiny-grove-v1';
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
};

type DevicePersisted = {
  profiles: ChildProfile[];
  activeProfileId: string | null;
  /** Device-level — shared across kids on this device. */
  premium: boolean;
  /** Device-level voice narration preference. */
  voiceEnabled: boolean;
};

/** Legacy single-age save shape (pre multi-profile). */
type LegacyPersisted = {
  childAge?: number | null;
  coins?: number;
  premium?: boolean;
  voiceEnabled?: boolean;
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
  ownCosmetic: (id: string) => void;
  equipCosmetic: (id: string) => void;
  clearLevel: (levelId: number, reward: number) => void;
  isLevelUnlocked: (levelId: number) => boolean;
  resetProgress: () => void;
};

const starterOwned = COSMETICS.filter((c) => c.starter).map((c) => c.id);

const defaultEquipped: Equipped = {
  outfit: 'outfit-leaf',
  room: 'room-meadow',
  pet: 'pet-squirrel',
  fx: null,
};

const defaultDevice: DevicePersisted = {
  profiles: [],
  activeProfileId: null,
  premium: false,
  voiceEnabled: true,
};

function newProfileId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampAge(age: number): number {
  return Math.min(10, Math.max(3, Math.round(age)));
}

function sanitizeName(name: string): string {
  return name.trim().slice(0, PROFILE_NAME_MAX);
}

function makeProfile(
  name: string,
  age: number,
  progress?: Partial<Pick<ChildProfile, 'coins' | 'ownedCosmeticIds' | 'equipped' | 'clearedLevelIds' | 'highestUnlocked'>>,
): ChildProfile {
  return {
    id: newProfileId(),
    name: sanitizeName(name) || 'Oyuncu',
    age: clampAge(age),
    coins: progress?.coins ?? 40,
    ownedCosmeticIds: progress?.ownedCosmeticIds?.length
      ? progress.ownedCosmeticIds
      : [...starterOwned],
    equipped: { ...defaultEquipped, ...progress?.equipped },
    clearedLevelIds: progress?.clearedLevelIds ?? [],
    highestUnlocked: progress?.highestUnlocked ?? FREE_UNLOCK_COUNT,
  };
}

function migrateFromRaw(raw: string): DevicePersisted {
  const parsed = JSON.parse(raw) as LegacyPersisted;

  if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
    const profiles = parsed.profiles.slice(0, MAX_PROFILES).map((p) => ({
      ...makeProfile(p.name || 'Oyuncu', p.age ?? 5, p),
      id: p.id || newProfileId(),
    }));
    const activeProfileId =
      profiles.find((p) => p.id === parsed.activeProfileId)?.id ?? profiles[0]!.id;
    return {
      profiles,
      activeProfileId,
      premium: parsed.premium ?? false,
      voiceEnabled: parsed.voiceEnabled ?? true,
    };
  }

  // Legacy single-age → one profile named "Oyuncu"
  if (parsed.childAge != null && typeof parsed.childAge === 'number') {
    const profile = makeProfile('Oyuncu', parsed.childAge, {
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
    };
  }

  return {
    ...defaultDevice,
    premium: parsed.premium ?? false,
    voiceEnabled: parsed.voiceEnabled ?? true,
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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState(migrateFromRaw(raw));
        }
      } catch {
        // keep defaults
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, ready]);

  useEffect(() => {
    setVoiceNarrationEnabled(state.voiceEnabled);
  }, [state.voiceEnabled]);

  const activeProfile = useMemo(
    () => state.profiles.find((p) => p.id === state.activeProfileId) ?? null,
    [state.profiles, state.activeProfileId],
  );

  const createProfile = useCallback((name: string, age: number): ChildProfile | null => {
    const clean = sanitizeName(name);
    if (!clean) return null;
    const profile = makeProfile(clean, age);
    let accepted = false;
    setState((s) => {
      if (s.profiles.length >= MAX_PROFILES) return s;
      accepted = true;
      return {
        ...s,
        profiles: [...s.profiles, profile],
        activeProfileId: profile.id,
      };
    });
    return accepted ? profile : null;
  }, []);

  const switchProfile = useCallback((id: string): boolean => {
    let ok = false;
    setState((s) => {
      if (!s.profiles.some((p) => p.id === id)) return s;
      ok = true;
      return { ...s, activeProfileId: id };
    });
    return ok;
  }, []);

  const deleteProfile = useCallback((id: string): boolean => {
    let ok = false;
    setState((s) => {
      if (s.profiles.length <= 1) return s;
      if (!s.profiles.some((p) => p.id === id)) return s;
      const profiles = s.profiles.filter((p) => p.id !== id);
      const activeProfileId =
        s.activeProfileId === id ? profiles[0]!.id : s.activeProfileId;
      ok = true;
      return { ...s, profiles, activeProfileId };
    });
    return ok;
  }, []);

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
    let ok = false;
    setState((s) => {
      const active = s.profiles.find((p) => p.id === s.activeProfileId);
      if (!active || active.coins < n) return s;
      ok = true;
      return patchActive(s, (p) => ({ ...p, coins: p.coins - n }));
    });
    return ok;
  }, []);

  const setPremium = useCallback((v: boolean) => {
    setState((s) => ({ ...s, premium: v }));
  }, []);

  const setVoiceEnabled = useCallback((v: boolean) => {
    setState((s) => ({ ...s, voiceEnabled: v }));
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

  const clearLevel = useCallback((levelId: number, reward: number) => {
    setState((s) =>
      patchActive(s, (p) => {
        const already = p.clearedLevelIds.includes(levelId);
        const cleared = already ? p.clearedLevelIds : [...p.clearedLevelIds, levelId];
        const nextUnlock = Math.max(p.highestUnlocked, Math.min(TOTAL_LEVELS, levelId + 1));
        const highestUnlocked = Math.max(FREE_UNLOCK_COUNT, nextUnlock, p.highestUnlocked);
        return {
          ...p,
          clearedLevelIds: cleared,
          highestUnlocked,
          coins: p.coins + (already ? Math.floor(reward / 4) : reward),
        };
      }),
    );
  }, []);

  const isLevelUnlocked = useCallback(
    (levelId: number) => {
      const unlocked = activeProfile?.highestUnlocked ?? FREE_UNLOCK_COUNT;
      return levelId <= unlocked && levelId <= TOTAL_LEVELS;
    },
    [activeProfile?.highestUnlocked],
  );

  const resetProgress = useCallback(() => {
    setState(defaultDevice);
  }, []);

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
      ageBand,
      createProfile,
      switchProfile,
      deleteProfile,
      updateActiveAge,
      updateActiveName,
      addCoins,
      spendCoins,
      setPremium,
      setVoiceEnabled,
      ownCosmetic,
      equipCosmetic,
      clearLevel,
      isLevelUnlocked,
      resetProgress,
    }),
    [
      state.profiles,
      state.activeProfileId,
      state.premium,
      state.voiceEnabled,
      ready,
      activeProfile,
      ageBand,
      createProfile,
      switchProfile,
      deleteProfile,
      updateActiveAge,
      updateActiveName,
      addCoins,
      spendCoins,
      setPremium,
      setVoiceEnabled,
      ownCosmetic,
      equipCosmetic,
      clearLevel,
      isLevelUnlocked,
      resetProgress,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
