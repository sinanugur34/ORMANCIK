import { useCallback, useSyncExternalStore } from 'react';
import { en } from './en';
import { tr, type TrKey } from './tr';
import type { Language, TParams } from './types';

export type { Language, TParams } from './types';
export type { TrKey };

const catalogs: Record<Language, Record<TrKey, string>> = { tr, en };

let currentLang: Language = 'tr';
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language): void {
  if (lang !== 'tr' && lang !== 'en') return;
  if (currentLang === lang) return;
  currentLang = lang;
  emit();
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = params[key];
    return v == null ? '' : String(v);
  });
}

/** Translate a catalog key for the active language (falls back to TR, then the key). */
export function t(key: TrKey | string, params?: TParams): string {
  const catalog = catalogs[currentLang];
  const fallback = catalogs.tr;
  const raw =
    (catalog as Record<string, string>)[key] ??
    (fallback as Record<string, string>)[key] ??
    key;
  return interpolate(raw, params);
}

/** Translate for an explicit language without changing global state. */
export function tFor(lang: Language, key: TrKey | string, params?: TParams): string {
  const catalog = catalogs[lang] ?? catalogs.tr;
  const raw =
    (catalog as Record<string, string>)[key] ??
    (catalogs.tr as Record<string, string>)[key] ??
    key;
  return interpolate(raw, params);
}

export function cosmeticName(id: string): string {
  return t(`cosmetic.${id}`);
}

export function islandName(id: string): string {
  return t(`island.${id}`);
}

export function productLabel(key: string): string {
  return t(`product.${key}`);
}

/** React hook: re-renders when language changes; returns bound `t` + lang. */
export function useI18n(): {
  language: Language;
  t: (key: TrKey | string, params?: TParams) => string;
  setLanguage: (lang: Language) => void;
} {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
  const translate = useCallback(
    (key: TrKey | string, params?: TParams) => t(key, params),
    [language],
  );
  return { language, t: translate, setLanguage };
}

/** Lightweight subscribe for non-GameContext components. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

/** Force a re-render when language flips (pair with module-level `t`). */
export function useT(): (key: TrKey | string, params?: TParams) => string {
  const language = useLanguage();
  return useCallback((key: TrKey | string, params?: TParams) => t(key, params), [language]);
}

/** Optional effect helper for tests. */
export function __resetLanguageForTests(): void {
  currentLang = 'tr';
  emit();
}
