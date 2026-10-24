export type Language = 'tr' | 'en';

export type TParams = Record<string, string | number | null | undefined>;

/** Dot-path keys resolved against the active string catalog. */
export type TranslationKey = string;
