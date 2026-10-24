import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { COSMETICS } from '../data/cosmetics';
import { TOTAL_LEVELS } from '../data/islands';
import { ageToBand, AgeBand } from '../theme/colors';

const STORAGE_KEY = 'tiny-grove-v1';

/** First N levels always unlocked; rest unlock sequentially by clearing previous. */
export const FREE_UNLOCK_COUNT = 30;

type Equipped = {
  outfit: string;
  room: string;
  pet: string;
  fx: string | null;
};

type Persisted = {
  childAge: number | null;
  coins: number;
  premium: boolean;
  ownedCosmeticIds: string[];
  equipped: Equipped;
  clearedLevelIds: number[];
  highestUnlocked: number;
};

type GameContextValue = Persisted & {
  ready: boolean;
  ageBand: AgeBand | null;
  setChildAge: (age: number) => void;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  setPremium: (v: boolean) => void;
  ownCosmetic: (id: string) => void;
  equipCosmetic: (id: string) => void;
  clearLevel: (levelId: number, reward: number) => void;
  isLevelUnlocked: (levelId: number) => boolean;
  resetProgress: () => void;
};

const starterOwned = COSMETICS.filter((c) => c.starter).map((c) => c.id);

const defaultState: Persisted = {
  childAge: null,
  coins: 40,
  premium: false,
  ownedCosmeticIds: starterOwned,
  equipped: {
    outfit: 'outfit-leaf',
    room: 'room-meadow',
    pet: 'pet-squirrel',
    fx: null,
  },
  clearedLevelIds: [],
  highestUnlocked: FREE_UNLOCK_COUNT,
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(defaultState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Persisted>;
          setState({
            ...defaultState,
            ...parsed,
            ownedCosmeticIds: parsed.ownedCosmeticIds?.length
              ? parsed.ownedCosmeticIds
              : starterOwned,
            equipped: { ...defaultState.equipped, ...parsed.equipped },
          });
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

  const setChildAge = useCallback((age: number) => {
    setState((s) => ({ ...s, childAge: Math.min(10, Math.max(3, age)) }));
  }, []);

  const addCoins = useCallback((n: number) => {
    setState((s) => ({ ...s, coins: s.coins + n }));
  }, []);

  const spendCoins = useCallback((n: number) => {
    let ok = false;
    setState((s) => {
      if (s.coins < n) return s;
      ok = true;
      return { ...s, coins: s.coins - n };
    });
    return ok;
  }, []);

  const setPremium = useCallback((v: boolean) => {
    setState((s) => ({ ...s, premium: v }));
  }, []);

  const ownCosmetic = useCallback((id: string) => {
    setState((s) =>
      s.ownedCosmeticIds.includes(id)
        ? s
        : { ...s, ownedCosmeticIds: [...s.ownedCosmeticIds, id] },
    );
  }, []);

  const equipCosmetic = useCallback((id: string) => {
    const item = COSMETICS.find((c) => c.id === id);
    if (!item) return;
    setState((s) => {
      if (!s.ownedCosmeticIds.includes(id) && !s.premium) return s;
      const equipped = { ...s.equipped };
      if (item.kind === 'outfit') equipped.outfit = id;
      if (item.kind === 'room') equipped.room = id;
      if (item.kind === 'pet') equipped.pet = id;
      if (item.kind === 'fx') equipped.fx = id;
      return { ...s, equipped };
    });
  }, []);

  const clearLevel = useCallback((levelId: number, reward: number) => {
    setState((s) => {
      const already = s.clearedLevelIds.includes(levelId);
      const cleared = already ? s.clearedLevelIds : [...s.clearedLevelIds, levelId];
      const nextUnlock = Math.max(s.highestUnlocked, Math.min(TOTAL_LEVELS, levelId + 1));
      // Keep FREE_UNLOCK_COUNT floor; also unlock sequentially past that
      const highestUnlocked = Math.max(FREE_UNLOCK_COUNT, nextUnlock, s.highestUnlocked);
      return {
        ...s,
        clearedLevelIds: cleared,
        highestUnlocked,
        coins: s.coins + (already ? Math.floor(reward / 4) : reward),
      };
    });
  }, []);

  const isLevelUnlocked = useCallback(
    (levelId: number) => levelId <= state.highestUnlocked && levelId <= TOTAL_LEVELS,
    [state.highestUnlocked],
  );

  const resetProgress = useCallback(() => {
    setState(defaultState);
  }, []);

  const ageBand = useMemo(
    () => (state.childAge != null ? ageToBand(state.childAge) : null),
    [state.childAge],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      ...state,
      ready,
      ageBand,
      setChildAge,
      addCoins,
      spendCoins,
      setPremium,
      ownCosmetic,
      equipCosmetic,
      clearLevel,
      isLevelUnlocked,
      resetProgress,
    }),
    [
      state,
      ready,
      ageBand,
      setChildAge,
      addCoins,
      spendCoins,
      setPremium,
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
