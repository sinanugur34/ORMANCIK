import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import { Platform } from 'react-native';
import { getLanguage, subscribeLanguage, type Language } from '../i18n';
import { bundledClip } from './bundledClips';

/** Microsoft Edge neural female Turkish — dev web proxy only. */
const EDGE_VOICE_TR = 'tr-TR-EmelNeural';
/** Microsoft Edge neural female English — dev web proxy only. */
const EDGE_VOICE_EN = 'en-US-JennyNeural';

/** Same-origin Metro proxy (see metro.config.js). Never used on a phone. */
const TTS_API_PATH = '/api/tts';

const FALLBACK_FEMALE_PITCH = 1.12;
const FALLBACK_FEMALE_RATE = 0.8;
const FALLBACK_MALE_PITCH = 1.4;
const FALLBACK_MALE_RATE = 0.78;
const SLOW_RATE = 0.78;

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
  'jenny',
  'aria',
] as const;

const MALE_NAME_HINTS = ['male', 'erkek', 'man', 'tolga', 'ahmet', 'david', 'daniel'] as const;

/** Module gate synced from GameContext — default ON. */
let voiceEnabled = true;

let lastPraiseAt = 0;
const PRAISE_MIN_GAP_MS = 1400;
/** Instructions outrank praise so a correct-tap cheer cannot cut the prompt. */
let lastInstructionAt = 0;

const audioUrlCache = new Map<string, string>();
const inflightSynth = new Map<string, Promise<string>>();

let currentPlayer: AudioPlayer | null = null;
let htmlAudio: HTMLAudioElement | null = null;
let audioModeReady = false;
/** Speech.stop() must finish before the next utterance, or it cancels that utterance. */
let haltChain: Promise<void> = Promise.resolve();

/**
 * Bumped by every new speak and by stopSpeaking.
 * A synth that finishes after stop or after a newer speak must not start playback.
 */
let generation = 0;

type ResolvedVoice = {
  identifier: string | null;
  name: string;
  language: string;
  explicitlyFemale: boolean;
};

let cachedFallbackVoice: ResolvedVoice | undefined;
let cachedFallbackLang: Language | undefined;

export type SpeakOptions = {
  /** Learning lines stay English even when the shell language is Turkish. */
  lang?: Language;
  /** Bundled clip id. Played offline, with no network and no child name. */
  clipId?: string;
  slow?: boolean;
};

subscribeLanguage(() => {
  cachedFallbackVoice = undefined;
  cachedFallbackLang = undefined;
});

export function edgeVoiceFor(lang: Language = getLanguage()): string {
  return lang === 'en' ? EDGE_VOICE_EN : EDGE_VOICE_TR;
}

export function speechLocaleFor(lang: Language = getLanguage()): string {
  return lang === 'en' ? 'en-US' : 'tr-TR';
}

export function setVoiceNarrationEnabled(enabled: boolean): void {
  voiceEnabled = enabled;
  if (!enabled) void stopSpeaking();
}

export function isVoiceNarrationEnabled(): boolean {
  return voiceEnabled;
}

export function getSelectedVoiceLabel(): string | null {
  return 'On-device + bundled English';
}

function haltPlayers(): void {
  try {
    if (htmlAudio) {
      htmlAudio.pause();
      htmlAudio.removeAttribute('src');
      htmlAudio.load();
      htmlAudio = null;
    }
  } catch {
    htmlAudio = null;
  }

  try {
    if (currentPlayer) {
      currentPlayer.pause();
      currentPlayer.remove();
      currentPlayer = null;
    }
  } catch {
    currentPlayer = null;
  }
}

function haltPlayback(): Promise<void> {
  haltPlayers();
  const pending = haltChain.then(async () => {
    try {
      await Speech.stop();
    } catch {
      // Speech may be unavailable on some web builds.
    }
  });
  haltChain = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

export async function stopSpeaking(): Promise<void> {
  generation += 1;
  await haltPlayback();
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'duckOthers',
      shouldPlayInBackground: false,
    });
    audioModeReady = true;
  } catch {
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

function devTtsUrl(): string | null {
  if (Platform.OS !== 'web' || typeof globalThis === 'undefined') return null;
  try {
    const origin = (globalThis as typeof globalThis & { location?: { origin?: string } }).location?.origin;
    if (!origin) return null;
    const host = new URL(origin).hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return null;
    return `${origin}${TTS_API_PATH}`;
  } catch {
    return null;
  }
}

function cacheKey(voice: string, text: string): string {
  return `${voice}|${text}`;
}

async function synthesizeEdgeUri(text: string, voice: string): Promise<string> {
  const endpoint = devTtsUrl();
  if (!endpoint) throw new Error('no dev tts endpoint');

  const key = cacheKey(voice, text);
  const cached = audioUrlCache.get(key);
  if (cached) return cached;

  const existing = inflightSynth.get(key);
  if (existing) return existing;

  const work = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, voice }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`TTS HTTP ${res.status} ${detail}`);
      }
      const blob = await res.blob();
      if (!blob || blob.size < 64) throw new Error('TTS returned empty audio');
      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
        throw new Error('object URL unavailable');
      }
      const uri = URL.createObjectURL(blob);
      audioUrlCache.set(key, uri);
      return uri;
    } finally {
      clearTimeout(timer);
      inflightSynth.delete(key);
    }
  })();

  inflightSynth.set(key, work);
  return work;
}

function stillCurrent(token: number): boolean {
  return token === generation && voiceEnabled;
}

async function playSource(source: string | number, token: number, rate: number): Promise<void> {
  if (!stillCurrent(token)) return;
  await ensureAudioMode();
  if (!stillCurrent(token)) return;

  if (Platform.OS === 'web' && typeof source === 'string') {
    type BrowserAudio = { new (src?: string): HTMLAudioElement };
    const DocAudio = (globalThis as typeof globalThis & { Audio?: BrowserAudio }).Audio;
    if (typeof DocAudio === 'function') {
      const el = new DocAudio(source);
      el.preload = 'auto';
      el.playbackRate = rate;
      htmlAudio = el;
      await new Promise<void>((resolve, reject) => {
        el.addEventListener('error', () => reject(new Error('HTMLAudio playback failed')), { once: true });
        el.addEventListener('playing', () => resolve(), { once: true });
        const started = el.play();
        if (started && typeof started.then === 'function') started.catch(reject);
      });
      if (!stillCurrent(token)) {
        el.pause();
        if (htmlAudio === el) htmlAudio = null;
      }
      return;
    }
  }

  const player = createAudioPlayer(source);
  player.playbackRate = rate;
  if (!stillCurrent(token)) {
    player.remove();
    return;
  }
  currentPlayer = player;
  player.play();
}

function hintMatches(haystack: string, hint: string): boolean {
  if (hint === 'male') return /(?:^|[^a-z])male(?:[^a-z]|$)/.test(haystack);
  if (hint === 'man') return /(?:^|[^a-z])man(?:[^a-z]|$)/.test(haystack);
  return haystack.includes(hint);
}

function haystack(voice: Voice): string {
  const extra = voice as Voice & { gender?: string; voiceURI?: string };
  return [voice.name, voice.identifier, extra.voiceURI, extra.gender].filter(Boolean).join(' ').toLowerCase();
}

function isExplicitlyFemale(voice: Voice): boolean {
  const extra = voice as Voice & { gender?: string };
  if (extra.gender && extra.gender.toLowerCase() === 'female') return true;
  const h = haystack(voice);
  return FEMALE_NAME_HINTS.some((hint) => hintMatches(h, hint));
}

function isExplicitlyMale(voice: Voice): boolean {
  const extra = voice as Voice & { gender?: string };
  if (extra.gender && extra.gender.toLowerCase() === 'male') return true;
  const h = haystack(voice);
  if (h.includes('female') || h.includes('woman')) return false;
  return MALE_NAME_HINTS.some((hint) => hintMatches(h, hint));
}

function matchesLocale(voice: { language?: string }, lang: Language): boolean {
  const code = (voice.language ?? '').toLowerCase().replace('_', '-');
  if (lang === 'en') return code === 'en' || code.startsWith('en-');
  return code === 'tr' || code.startsWith('tr-');
}

async function resolveFallbackVoice(lang: Language): Promise<ResolvedVoice> {
  if (cachedFallbackVoice && cachedFallbackLang === lang) return cachedFallbackVoice;
  const locale = speechLocaleFor(lang);
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const pool = voices.filter((v) => matchesLocale(v, lang));
    const female = pool.find((v) => isExplicitlyFemale(v) && !isExplicitlyMale(v));
    if (female) {
      cachedFallbackVoice = {
        identifier: female.identifier ?? null,
        name: female.name,
        language: female.language || locale,
        explicitlyFemale: true,
      };
      cachedFallbackLang = lang;
      return cachedFallbackVoice;
    }
    const any = pool[0];
    cachedFallbackVoice = {
      identifier: any?.identifier ?? null,
      name: any?.name ?? 'default',
      language: any?.language || locale,
      explicitlyFemale: false,
    };
  } catch {
    cachedFallbackVoice = {
      identifier: null,
      name: 'default',
      language: locale,
      explicitlyFemale: false,
    };
  }
  cachedFallbackLang = lang;
  return cachedFallbackVoice;
}

async function speakWithExpoSpeech(text: string, lang: Language, token: number, slow: boolean): Promise<void> {
  if (!speechAvailable() || !stillCurrent(token)) return;
  const resolved = await resolveFallbackVoice(lang);
  if (!stillCurrent(token)) return;
  const pitch = resolved.explicitlyFemale ? FALLBACK_FEMALE_PITCH : FALLBACK_MALE_PITCH;
  const base = resolved.explicitlyFemale ? FALLBACK_FEMALE_RATE : FALLBACK_MALE_RATE;
  Speech.speak(text, {
    language: speechLocaleFor(lang),
    pitch,
    rate: slow ? base * SLOW_RATE : base,
    ...(resolved.identifier ? { voice: resolved.identifier } : {}),
    onError: () => undefined,
  });
}

/**
 * Speak a short prompt.
 * Phones play a bundled clip or the device voice. They do not call 127.0.0.1.
 * A stop, mute, or newer request invalidates audio that is still being prepared.
 */
export async function speakKidPrompt(text: string, options?: SpeakOptions): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed || !voiceEnabled) return;

  const token = ++generation;
  lastInstructionAt = Date.now();
  await haltPlayback();
  if (!stillCurrent(token)) return;

  const lang = options?.lang ?? getLanguage();
  const rate = options?.slow ? SLOW_RATE : 1;
  const clip = bundledClip(options?.clipId);

  if (clip != null) {
    try {
      await playSource(clip, token, rate);
    } catch {
      if (stillCurrent(token)) await speakWithExpoSpeech(trimmed, lang, token, !!options?.slow);
    }
    return;
  }

  if (Platform.OS !== 'web') {
    try {
      await speakWithExpoSpeech(trimmed, lang, token, !!options?.slow);
    } catch {
      // Parental and play flows keep working if speech is missing.
    }
    return;
  }

  try {
    const uri = await synthesizeEdgeUri(trimmed, edgeVoiceFor(lang));
    if (!stillCurrent(token)) return;
    await playSource(uri, token, rate);
  } catch {
    if (!stillCurrent(token)) return;
    try {
      await speakWithExpoSpeech(trimmed, lang, token, !!options?.slow);
    } catch {
      // ignore
    }
  }
}

/** Brief praise. Skipped while a prompt was just started, so the instruction is not cut off. */
export async function speakPraise(): Promise<void> {
  if (!voiceEnabled) return;
  const now = Date.now();
  if (now - lastInstructionAt < 1600) return;
  if (now - lastPraiseAt < PRAISE_MIN_GAP_MS) return;
  lastPraiseAt = now;
  await speakKidPrompt('Yes!', { lang: 'en', clipId: 'praise-yes' });
}
