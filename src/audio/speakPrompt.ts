import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Platform } from 'react-native';

/** Kid-friendly Turkish TTS defaults (ages ~3–10): clear pace, lightly warm. */
const KID_PITCH = 1.1;
const KID_RATE = 0.8;
const LANGUAGE = 'tr-TR';

/** Common Turkish / locale female voice name hints across OS / browser engines. */
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
] as const;

const MALE_NAME_HINTS = [
  'male',
  'erkek',
  'man',
  'tolga',
  'ahmet',
  'mehmet',
] as const;

const PRAISE = ['Harika!', 'Aferin!', 'Bravo!'] as const;

/** Module gate synced from GameContext — default ON. */
let voiceEnabled = true;

/** Cached preferred Turkish voice identifier (null = none found / use default). */
let cachedVoiceId: string | null | undefined;

/** Throttle success praise so rapid correct taps are not spammy. */
let lastPraiseAt = 0;
const PRAISE_MIN_GAP_MS = 1400;

export function setVoiceNarrationEnabled(enabled: boolean): void {
  voiceEnabled = enabled;
  if (!enabled) {
    void stopSpeaking();
  }
}

export function isVoiceNarrationEnabled(): boolean {
  return voiceEnabled;
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

/**
 * Prefer a female Turkish voice when the OS/browser exposes one; else any tr voice.
 * Returns the voice `identifier` for Speech.speak, or null to use the engine default.
 */
function pickTurkishVoice(voices: Voice[]): string | null {
  const turkish = voices.filter(isTurkishVoice);
  if (turkish.length === 0) return null;

  const female = turkish.find((v) => isExplicitlyFemale(v) && !isExplicitlyMale(v));
  if (female?.identifier) return female.identifier;

  // Prefer tr-TR over bare tr when no gender hint is available.
  const trTR = turkish.find((v) => {
    const lang = (v.language ?? '').toLowerCase().replace('_', '-');
    return lang === 'tr-tr' || lang.startsWith('tr-tr');
  });
  if (trTR?.identifier) return trTR.identifier;

  return turkish[0]?.identifier ?? null;
}

/**
 * Resolve voices via expo-speech; on web, also try speechSynthesis if the list is empty
 * (voices can load asynchronously after first paint).
 */
async function loadVoices(): Promise<Voice[]> {
  try {
    const fromExpo = await Speech.getAvailableVoicesAsync();
    if (fromExpo.length > 0) return fromExpo;
  } catch {
    // fall through to web API
  }

  if (Platform.OS === 'web' && typeof globalThis !== 'undefined') {
    try {
      const synth = (globalThis as typeof globalThis & { speechSynthesis?: SpeechSynthesis })
        .speechSynthesis;
      if (!synth) return [];
      const raw = synth.getVoices();
      return raw.map((v) => ({
        identifier: v.voiceURI,
        name: v.name,
        language: v.lang,
        quality: Speech.VoiceQuality.Default,
      }));
    } catch {
      return [];
    }
  }

  return [];
}

async function resolvePreferredVoiceId(): Promise<string | null> {
  if (cachedVoiceId !== undefined) return cachedVoiceId;
  try {
    const voices = await loadVoices();
    // Voices can be empty on first web paint — retry next speak instead of caching null forever.
    if (voices.length === 0) return null;
    cachedVoiceId = pickTurkishVoice(voices);
  } catch {
    cachedVoiceId = null;
  }
  return cachedVoiceId ?? null;
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
    const voice = await resolvePreferredVoiceId();
    Speech.speak(trimmed, {
      language: LANGUAGE,
      pitch: KID_PITCH,
      rate: KID_RATE,
      ...(voice ? { voice } : {}),
      onError: () => undefined,
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // Helps smoke-test that narration is invoked (web console / Metro).
      console.log('[speakKidPrompt]', trimmed, voice ? `{voice:${voice}}` : '{default voice}');
    }
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
