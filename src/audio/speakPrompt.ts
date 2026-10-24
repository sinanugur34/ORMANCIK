import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Platform } from 'react-native';

/** Microsoft Edge neural female Turkish — primary kid voice. */
const EDGE_VOICE = 'tr-TR-EmelNeural';

/** Same-origin Metro proxy (see metro.config.js). */
const TTS_API_PATH = '/api/tts';

/** Offline / failure fallback: expo-speech pitch when only a male tr voice exists. */
const FALLBACK_FEMALE_PITCH = 1.12;
const FALLBACK_FEMALE_RATE = 0.8;
const FALLBACK_MALE_PITCH = 1.4;
const FALLBACK_MALE_RATE = 0.78;
const LANGUAGE = 'tr-TR';

const FEMALE_NAME_HINTS = [
  'female',
  'kadın',
  'kadin',
  'woman',
  'yelda',
  'emel',
  'filiz',
  'zeynep',
  'hazel',
  'zira',
  'samantha',
] as const;

const MALE_NAME_HINTS = [
  'male',
  'erkek',
  'man',
  'tolga',
  'ahmet',
  'david',
  'daniel',
] as const;

const PRAISE = ['Harika!', 'Aferin!', 'Bravo!'] as const;

/** Module gate synced from GameContext — default ON. */
let voiceEnabled = true;

/** Throttle success praise so rapid correct taps are not spammy. */
let lastPraiseAt = 0;
const PRAISE_MIN_GAP_MS = 1400;

/** In-memory blob/object URL cache keyed by prompt text. */
const audioUrlCache = new Map<string, string>();

/** In-flight synthesizes so duplicate prompts share one fetch. */
const inflightSynth = new Map<string, Promise<string>>();

let currentSound: Audio.Sound | null = null;
let htmlAudio: HTMLAudioElement | null = null;
let audioModeReady = false;
let loggedEngineOnce = false;

type ResolvedVoice = {
  identifier: string | null;
  name: string;
  language: string;
  explicitlyFemale: boolean;
};

let cachedFallbackVoice: ResolvedVoice | undefined;

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
  return `${EDGE_VOICE} (Edge neural)`;
}

export async function stopSpeaking(): Promise<void> {
  try {
    if (htmlAudio) {
      htmlAudio.pause();
      htmlAudio.removeAttribute('src');
      htmlAudio.load();
      htmlAudio = null;
    }
  } catch {
    // ignore
  }

  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch {
    // ignore
  }

  try {
    await Speech.stop();
  } catch {
    // Speech may be unavailable on some web/desktop builds
  }
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioModeReady = true;
  } catch {
    // Web / unsupported — still try to play
    audioModeReady = true;
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

function ttsApiUrl(): string {
  if (Platform.OS === 'web' && typeof globalThis !== 'undefined') {
    try {
      const origin = (globalThis as typeof globalThis & { location?: { origin?: string } }).location
        ?.origin;
      if (origin) return `${origin}${TTS_API_PATH}`;
    } catch {
      // fall through
    }
  }
  // Dev default when origin is unavailable (native / odd hosts).
  return `http://127.0.0.1:43123${TTS_API_PATH}`;
}

/**
 * Fetch EmelNeural MP3 from the Metro /api/tts proxy and return a playable URI.
 * Cached by exact prompt text so repeats are instant.
 */
async function synthesizeEdgeUri(text: string): Promise<string> {
  const cached = audioUrlCache.get(text);
  if (cached) return cached;

  const existing = inflightSynth.get(text);
  if (existing) return existing;

  const work = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(ttsApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`TTS HTTP ${res.status} ${detail}`);
      }
      const voiceHdr = res.headers.get('X-Ormancik-Voice') || EDGE_VOICE;
      const blob = await res.blob();
      if (!blob || blob.size < 64) {
        throw new Error('TTS returned empty audio');
      }

      let uri: string;
      if (Platform.OS === 'web' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
        uri = URL.createObjectURL(blob);
      } else {
        // Native: base64 data URI works with expo-av for short kid prompts.
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        if (typeof globalThis.btoa !== 'function') {
          throw new Error('base64 encoder unavailable for TTS audio');
        }
        uri = `data:audio/mpeg;base64,${globalThis.btoa(binary)}`;
      }

      audioUrlCache.set(text, uri);
      if (!loggedEngineOnce) {
        loggedEngineOnce = true;
        console.log('[speakKidPrompt] engine=edge-tts voice=', voiceHdr, 'female=true');
      }
      return uri;
    } finally {
      clearTimeout(timer);
      inflightSynth.delete(text);
    }
  })();

  inflightSynth.set(text, work);
  return work;
}

async function playUri(uri: string): Promise<void> {
  await ensureAudioMode();
  await stopSpeaking();

  if (Platform.OS === 'web') {
    // Prefer HTMLAudioElement on web for blob: URLs (reliable + low latency).
    type BrowserAudio = {
      new (src?: string): HTMLAudioElement;
    };
    const DocAudio = (globalThis as typeof globalThis & { Audio?: BrowserAudio }).Audio;
    if (typeof DocAudio === 'function') {
      const el = new DocAudio(uri);
      htmlAudio = el;
      el.preload = 'auto';
      await new Promise<void>((resolve, reject) => {
        el.addEventListener('error', () => reject(new Error('HTMLAudio playback failed')), {
          once: true,
        });
        // Resolve once playback starts so level UI is not blocked for the full clip.
        el.addEventListener('playing', () => resolve(), { once: true });
        const p = el.play();
        if (p && typeof p.then === 'function') {
          p.catch(reject);
        }
      });
      return;
    }
  }

  const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: 1 });
  currentSound = sound;
  // Fire-and-forget finish cleanup; don't block the caller on full duration.
  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      void sound.unloadAsync().catch(() => undefined);
      if (currentSound === sound) currentSound = null;
    }
  });
}

function haystack(voice: Voice): string {
  const extra = voice as Voice & { gender?: string; voiceURI?: string };
  return [voice.name, voice.identifier, extra.voiceURI, extra.gender]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function isExplicitlyFemale(voice: Voice): boolean {
  const h = haystack(voice);
  return FEMALE_NAME_HINTS.some((hint) => h.includes(hint));
}

function isExplicitlyMale(voice: Voice): boolean {
  const h = haystack(voice);
  return MALE_NAME_HINTS.some((hint) => h.includes(hint));
}

function isTurkishVoice(voice: { language?: string }): boolean {
  const lang = (voice.language ?? '').toLowerCase().replace('_', '-');
  return lang === 'tr' || lang.startsWith('tr-');
}

async function resolveFallbackVoice(): Promise<ResolvedVoice> {
  if (cachedFallbackVoice) return cachedFallbackVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const turkish = voices.filter(isTurkishVoice);
    const femaleTr = turkish.find((v) => isExplicitlyFemale(v) && !isExplicitlyMale(v));
    if (femaleTr) {
      cachedFallbackVoice = {
        identifier: femaleTr.identifier ?? null,
        name: femaleTr.name,
        language: femaleTr.language || LANGUAGE,
        explicitlyFemale: true,
      };
      return cachedFallbackVoice;
    }
    const anyTr = turkish[0];
    cachedFallbackVoice = {
      identifier: anyTr?.identifier ?? null,
      name: anyTr?.name ?? 'default',
      language: anyTr?.language || LANGUAGE,
      explicitlyFemale: false,
    };
  } catch {
    cachedFallbackVoice = {
      identifier: null,
      name: 'default',
      language: LANGUAGE,
      explicitlyFemale: false,
    };
  }
  return cachedFallbackVoice;
}

/** Last-resort OS speech when Edge TTS is offline / unreachable. */
async function speakWithExpoSpeech(text: string): Promise<void> {
  if (!speechAvailable()) return;
  await Speech.stop();
  const resolved = await resolveFallbackVoice();
  const pitch = resolved.explicitlyFemale ? FALLBACK_FEMALE_PITCH : FALLBACK_MALE_PITCH;
  const rate = resolved.explicitlyFemale ? FALLBACK_FEMALE_RATE : FALLBACK_MALE_RATE;
  console.warn(
    '[speakKidPrompt] edge-tts unavailable; fallback voice=',
    resolved.name,
    'female=',
    resolved.explicitlyFemale,
  );
  Speech.speak(text, {
    language: LANGUAGE,
    pitch,
    rate,
    ...(resolved.identifier ? { voice: resolved.identifier } : {}),
    onError: () => undefined,
  });
}

/**
 * Speak a short kid-friendly Turkish prompt via Edge neural Emel (female).
 * Stops any in-flight audio first. Fails silently if muted.
 * Falls back to OS TTS only when Edge synthesis itself is unreachable (offline).
 */
export async function speakKidPrompt(text: string): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed || !voiceEnabled) return;

  let uri: string;
  try {
    uri = await synthesizeEdgeUri(trimmed);
  } catch (err) {
    console.warn('[speakKidPrompt] edge synth failed:', err);
    try {
      await speakWithExpoSpeech(trimmed);
    } catch {
      // Fail silently — parental flow must not break if TTS is missing
    }
    return;
  }

  try {
    console.log('[speakKidPrompt]', trimmed, `{voice:${EDGE_VOICE}}`);
    await playUri(uri);
  } catch (err) {
    // Autoplay / playback glitch — do not fall back to male OS speech.
    console.warn('[speakKidPrompt] play failed (neural audio kept):', err);
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
