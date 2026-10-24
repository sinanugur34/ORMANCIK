import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Platform } from 'react-native';

/** Kid-friendly Turkish TTS when an explicitly female voice is available. */
const FEMALE_PITCH = 1.12;
const FEMALE_RATE = 0.8;

/**
 * Many OS/browsers only expose a male tr-TR voice. Raising pitch + slightly
 * slowing rate makes that fallback read clearer / more feminine for kids.
 */
const MALE_FALLBACK_PITCH = 1.4;
const MALE_FALLBACK_RATE = 0.78;

const LANGUAGE = 'tr-TR';

/** Female voice name hints across OS / browser engines (TR + common en-*). */
const FEMALE_NAME_HINTS = [
  'female',
  'kadın',
  'kadin',
  'woman',
  'yelda',
  'emel',
  'filiz',
  'zeynep',
  'aylin',
  'selin',
  'deniz',
  'asli',
  'aslı',
  'zira',
  'hazel',
  'samantha',
  'karen',
  'moira',
  'susan',
  'victoria',
  'google uk english female',
  'microsoft zira',
  'microsoft hazel',
] as const;

const MALE_NAME_HINTS = [
  'male',
  'erkek',
  'man',
  'tolga',
  'ahmet',
  'mehmet',
  'david',
  'daniel',
  'mark',
  'microsoft david',
  'google uk english male',
] as const;

const PRAISE = ['Harika!', 'Aferin!', 'Bravo!'] as const;

/** Module gate synced from GameContext — default ON. */
let voiceEnabled = true;

type ResolvedVoice = {
  identifier: string | null;
  name: string;
  language: string;
  explicitlyFemale: boolean;
};

/** Cached preferred voice (undefined = not resolved yet). */
let cachedVoice: ResolvedVoice | undefined;

/** Log selected voice once per session for debug. */
let loggedVoiceOnce = false;

/** Throttle success praise so rapid correct taps are not spammy. */
let lastPraiseAt = 0;
const PRAISE_MIN_GAP_MS = 1400;

/** Web: resolve once voiceschanged fires (Chrome loads voices async). */
let webVoicesReady: Promise<void> | null = null;

export function setVoiceNarrationEnabled(enabled: boolean): void {
  voiceEnabled = enabled;
  if (!enabled) {
    void stopSpeaking();
  }
}

export function isVoiceNarrationEnabled(): boolean {
  return voiceEnabled;
}

/** Selected voice summary for optional Settings display. */
export function getSelectedVoiceLabel(): string | null {
  if (!cachedVoice) return null;
  if (cachedVoice.identifier) {
    return `${cachedVoice.name} (${cachedVoice.language})`;
  }
  return 'varsayılan';
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Speech.stop();
  } catch {
    // Speech may be unavailable on some web/desktop builds
  }
}

function speechAvailable(): boolean {
  if (Platform.OS === 'web') {
    try {
      return typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis;
    } catch {
      return false;
    }
  }
  return true;
}

function getWebSpeechSynthesis(): SpeechSynthesis | null {
  if (Platform.OS !== 'web' || typeof globalThis === 'undefined') return null;
  try {
    return (
      (globalThis as typeof globalThis & { speechSynthesis?: SpeechSynthesis }).speechSynthesis ??
      null
    );
  } catch {
    return null;
  }
}

/**
 * Chrome (and some other browsers) populate getVoices() asynchronously.
 * Wait for voiceschanged (or a short timeout) before first speak so we do not
 * lock onto the engine default male voice.
 */
function ensureWebVoicesReady(): Promise<void> {
  if (webVoicesReady) return webVoicesReady;

  const synth = getWebSpeechSynthesis();
  if (!synth) {
    webVoicesReady = Promise.resolve();
    return webVoicesReady;
  }

  webVoicesReady = new Promise((resolve) => {
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        synth.removeEventListener('voiceschanged', onChanged);
      } catch {
        // ignore
      }
      resolve();
    };

    const onChanged = () => finish();
    try {
      synth.addEventListener('voiceschanged', onChanged);
    } catch {
      // Older engines may only support onvoiceschanged
      try {
        synth.onvoiceschanged = onChanged;
      } catch {
        // ignore
      }
    }

    // Also poke getVoices — some engines fire voiceschanged only after a call.
    try {
      void synth.getVoices();
    } catch {
      // ignore
    }

    setTimeout(finish, 1500);
  });

  return webVoicesReady;
}

function isTurkishVoice(voice: { language?: string }): boolean {
  const lang = (voice.language ?? '').toLowerCase().replace('_', '-');
  return lang === 'tr' || lang.startsWith('tr-');
}

function haystack(voice: Voice): string {
  const extra = voice as Voice & { gender?: string; voiceURI?: string };
  return [voice.name, voice.identifier, extra.voiceURI, extra.gender]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isExplicitlyFemale(voice: Voice): boolean {
  const extra = voice as Voice & { gender?: string };
  if (typeof extra.gender === 'string' && extra.gender.toLowerCase() === 'female') {
    return true;
  }
  const h = haystack(voice);
  return FEMALE_NAME_HINTS.some((hint) => h.includes(hint));
}

function isExplicitlyMale(voice: Voice): boolean {
  const extra = voice as Voice & { gender?: string };
  if (typeof extra.gender === 'string' && extra.gender.toLowerCase() === 'male') {
    return true;
  }
  const h = haystack(voice);
  return MALE_NAME_HINTS.some((hint) => h.includes(hint));
}

function toResolved(voice: Voice | null | undefined, explicitlyFemale: boolean): ResolvedVoice {
  if (!voice) {
    return {
      identifier: null,
      name: 'default',
      language: LANGUAGE,
      explicitlyFemale: false,
    };
  }
  return {
    identifier: voice.identifier ?? null,
    name: voice.name || voice.identifier || 'unknown',
    language: voice.language || LANGUAGE,
    explicitlyFemale,
  };
}

/**
 * Voice pick order (kid UX):
 * a. Turkish + explicitly female
 * b. Any explicitly female voice (even en-*) — better than male TR
 * c. Turkish any ONLY if no female exists anywhere
 * d. Default (null identifier)
 */
function pickVoice(voices: Voice[]): ResolvedVoice {
  if (voices.length === 0) {
    return toResolved(null, false);
  }

  const turkish = voices.filter(isTurkishVoice);

  const turkishFemale = turkish.find((v) => isExplicitlyFemale(v) && !isExplicitlyMale(v));
  if (turkishFemale) return toResolved(turkishFemale, true);

  const anyFemale = voices.find((v) => isExplicitlyFemale(v) && !isExplicitlyMale(v));
  if (anyFemale) return toResolved(anyFemale, true);

  // Prefer tr-TR over bare tr when no gender hint is available.
  const trTR = turkish.find((v) => {
    const lang = (v.language ?? '').toLowerCase().replace('_', '-');
    return lang === 'tr-tr' || lang.startsWith('tr-tr');
  });
  if (trTR) return toResolved(trTR, false);

  if (turkish[0]) return toResolved(turkish[0], false);

  return toResolved(null, false);
}

/**
 * Resolve voices via expo-speech; on web, also merge / fall back to
 * speechSynthesis.getVoices() (Chrome loads voices asynchronously).
 */
async function loadVoices(): Promise<Voice[]> {
  if (Platform.OS === 'web') {
    await ensureWebVoicesReady();
  }

  let fromExpo: Voice[] = [];
  try {
    fromExpo = await Speech.getAvailableVoicesAsync();
  } catch {
    // fall through to web API
  }

  if (Platform.OS === 'web') {
    try {
      const synth = getWebSpeechSynthesis();
      if (synth) {
        const raw = synth.getVoices();
        const fromWeb: Voice[] = raw.map((v) => ({
          identifier: v.voiceURI,
          name: v.name,
          language: v.lang,
          quality: Speech.VoiceQuality.Default,
        }));
        if (fromWeb.length > 0) {
          // Prefer the richer of the two lists; merge by identifier.
          const byId = new Map<string, Voice>();
          for (const v of [...fromExpo, ...fromWeb]) {
            const key = v.identifier || `${v.name}|${v.language}`;
            if (!byId.has(key)) byId.set(key, v);
          }
          return [...byId.values()];
        }
      }
    } catch {
      // ignore web merge failure
    }
  }

  return fromExpo;
}

async function resolvePreferredVoice(): Promise<ResolvedVoice> {
  if (cachedVoice !== undefined) return cachedVoice;
  try {
    const voices = await loadVoices();
    // Voices can be empty on first web paint — retry next speak instead of caching forever.
    if (voices.length === 0) {
      return toResolved(null, false);
    }
    cachedVoice = pickVoice(voices);
  } catch {
    cachedVoice = toResolved(null, false);
  }
  return cachedVoice;
}

function pitchAndRate(explicitlyFemale: boolean): { pitch: number; rate: number } {
  if (explicitlyFemale) {
    return { pitch: FEMALE_PITCH, rate: FEMALE_RATE };
  }
  return { pitch: MALE_FALLBACK_PITCH, rate: MALE_FALLBACK_RATE };
}

/**
 * Speak a short kid-friendly Turkish prompt.
 * Stops any in-flight utterance first. Fails silently if TTS is unavailable or muted.
 */
export async function speakKidPrompt(text: string): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed || !voiceEnabled) return;
  if (!speechAvailable()) return;

  try {
    await Speech.stop();
    const resolved = await resolvePreferredVoice();
    const { pitch, rate } = pitchAndRate(resolved.explicitlyFemale);

    if (!loggedVoiceOnce) {
      loggedVoiceOnce = true;
      console.log(
        '[speakKidPrompt] voice=',
        resolved.name,
        'lang=',
        resolved.language,
        'pitch=',
        pitch,
        'female=',
        resolved.explicitlyFemale,
      );
    }

    Speech.speak(trimmed, {
      language: LANGUAGE,
      pitch,
      rate,
      ...(resolved.identifier ? { voice: resolved.identifier } : {}),
      onError: () => undefined,
    });
  } catch {
    // Fail silently — parental flow must not break if TTS is missing
  }
}

/** Brief praise on correct answers; throttled to avoid spam. */
export async function speakPraise(): Promise<void> {
  if (!voiceEnabled) return;
  const now = Date.now();
  if (now - lastPraiseAt < PRAISE_MIN_GAP_MS) return;
  lastPraiseAt = now;
  const phrase = PRAISE[Math.floor(Math.random() * PRAISE.length)]!;
  await speakKidPrompt(phrase);
}
