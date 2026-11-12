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
  /** Praise and other asides do not count as the question the child is answering. */
  countsAsPrompt?: boolean;
};

/** played: the line finished. muted: sound is off. failed: nothing started. cut: it stopped early. */
export type SpeakOutcome = 'played' | 'muted' | 'failed' | 'cut';

type SpeakWaiter = { token: number; finish: (outcome: SpeakOutcome) => void };

let waiter: SpeakWaiter | null = null;
let lastOutcome: SpeakOutcome | null = null;
/** True after this question's line has actually begun, including a replay. A new question clears it. */
let promptAudible = false;
let countAudible = true;

export function resetPromptAudible(): void {
  promptAudible = false;
}

export function promptHasStarted(): boolean {
  return promptAudible;
}

function markPromptAudible(): void {
  if (countAudible) promptAudible = true;
}

export function lastPromptOutcome(): SpeakOutcome | null {
  return lastOutcome;
}

function completeWaiter(token: number, outcome: SpeakOutcome): void {
  if (!waiter || waiter.token !== token) return;
  const finish = waiter.finish;
  waiter = null;
  lastOutcome = outcome;
  finish(outcome);
}

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
  if (waiter) {
    const current = waiter;
    waiter = null;
    lastOutcome = 'cut';
    current.finish('cut');
  }
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

async function playSource(source: string | number, token: number, rate: number): Promise<SpeakOutcome> {
  if (!stillCurrent(token)) return 'cut';
  await ensureAudioMode();
  if (!stillCurrent(token)) return 'cut';

  if (Platform.OS === 'web' && typeof source === 'string') {
    type BrowserAudio = { new (src?: string): HTMLAudioElement };
    const DocAudio = (globalThis as typeof globalThis & { Audio?: BrowserAudio }).Audio;
    if (typeof DocAudio === 'function') {
      const el = new DocAudio(source);
      el.preload = 'auto';
      el.playbackRate = rate;
      htmlAudio = el;
      return await new Promise<SpeakOutcome>((resolve, reject) => {
        let settled = false;
        const finish = (outcome: SpeakOutcome) => {
          if (settled) return;
          settled = true;
          resolve(outcome);
        };
        el.addEventListener('error', () => {
          if (!settled) {
            settled = true;
            reject(new Error('HTMLAudio playback failed'));
          }
        }, { once: true });
        el.addEventListener('playing', () => {
          if (stillCurrent(token)) markPromptAudible();
        }, { once: true });
        el.addEventListener('ended', () => finish(stillCurrent(token) ? 'played' : 'cut'), { once: true });
        el.addEventListener('pause', () => {
          if (!stillCurrent(token)) finish('cut');
        });
        const started = el.play();
        if (started && typeof started.then === 'function') started.catch((error: unknown) => {
          if (!settled) {
            settled = true;
            reject(error instanceof Error ? error : new Error('HTMLAudio playback failed'));
          }
        });
      });
    }
  }

  const player = createAudioPlayer(source);
  player.playbackRate = rate;
  if (!stillCurrent(token)) {
    player.remove();
    return 'cut';
  }
  currentPlayer = player;
  return await new Promise<SpeakOutcome>((resolve) => {
    let settled = false;
    let started = false;
    let subscription: { remove: () => void } | null = null;
    const finish = (outcome: SpeakOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      subscription?.remove();
      resolve(outcome);
    };
    const timer = setTimeout(() => finish(stillCurrent(token) ? (started ? 'played' : 'failed') : 'cut'), 12000);
    subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!stillCurrent(token)) {
        finish('cut');
        return;
      }
      if (status.playing) {
        started = true;
        markPromptAudible();
      }
      const ended =
        status.didJustFinish ||
        (started && status.duration > 0 && !status.playing && status.currentTime >= status.duration - 0.05);
      if (ended) finish('played');
    });
    player.play();
  });
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

function speakWithExpoSpeech(text: string, lang: Language, token: number, slow: boolean): Promise<SpeakOutcome> {
  if (!speechAvailable() || !stillCurrent(token)) return Promise.resolve(stillCurrent(token) ? 'failed' : 'cut');
  return new Promise((resolve) => {
    void resolveFallbackVoice(lang).then((resolved) => {
      if (!stillCurrent(token)) {
        resolve('cut');
        return;
      }
      let settled = false;
      const finish = (outcome: SpeakOutcome) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(outcome);
      };
      const timer = setTimeout(() => finish(stillCurrent(token) ? 'failed' : 'cut'), 12000);
      const pitch = resolved.explicitlyFemale ? FALLBACK_FEMALE_PITCH : FALLBACK_MALE_PITCH;
      const base = resolved.explicitlyFemale ? FALLBACK_FEMALE_RATE : FALLBACK_MALE_RATE;
      try {
        Speech.speak(text, {
          language: speechLocaleFor(lang),
          pitch,
          rate: slow ? base * SLOW_RATE : base,
          ...(resolved.identifier ? { voice: resolved.identifier } : {}),
          onStart: () => {
            if (stillCurrent(token)) markPromptAudible();
          },
          onDone: () => finish(stillCurrent(token) ? 'played' : 'cut'),
          onStopped: () => finish('cut'),
          onError: () => finish(stillCurrent(token) ? 'failed' : 'cut'),
        });
      } catch {
        finish(stillCurrent(token) ? 'failed' : 'cut');
      }
    }).catch(() => resolve(stillCurrent(token) ? 'failed' : 'cut'));
  });
}

/**
 * Speak a short prompt.
 * Phones play a bundled clip or the device voice. They do not call 127.0.0.1.
 * A stop, mute, or newer request invalidates audio that is still being prepared.
 */
export async function speakKidPrompt(text: string, options?: SpeakOptions): Promise<SpeakOutcome> {
  const trimmed = text?.trim();
  countAudible = options?.countsAsPrompt !== false;
  if (!trimmed || !voiceEnabled) {
    lastOutcome = 'muted';
    return 'muted';
  }

  if (waiter) {
    const previous = waiter;
    waiter = null;
    lastOutcome = 'cut';
    previous.finish('cut');
  }

  const token = ++generation;
  lastInstructionAt = Date.now();
  await haltPlayback();
  if (!stillCurrent(token)) {
    lastOutcome = 'cut';
    return 'cut';
  }

  const lang = options?.lang ?? getLanguage();
  const rate = options?.slow ? SLOW_RATE : 1;
  const clip = bundledClip(options?.clipId);

  return await new Promise<SpeakOutcome>((resolve) => {
    waiter = {
      token,
      finish: (outcome) => {
        lastOutcome = outcome;
        resolve(outcome);
      },
    };
    void runSpeech(trimmed, lang, token, rate, clip, !!options?.slow).then(
      (outcome) => completeWaiter(token, outcome),
      () => completeWaiter(token, stillCurrent(token) ? 'failed' : 'cut'),
    );
  });
}

async function runSpeech(
  text: string,
  lang: Language,
  token: number,
  rate: number,
  clip: number | undefined,
  slow: boolean,
): Promise<SpeakOutcome> {
  if (clip != null) {
    try {
      return await playSource(clip, token, rate);
    } catch {
      if (!stillCurrent(token)) return 'cut';
      return speakWithExpoSpeech(text, lang, token, slow);
    }
  }

  if (Platform.OS !== 'web') return speakWithExpoSpeech(text, lang, token, slow);

  try {
    const uri = await synthesizeEdgeUri(text, edgeVoiceFor(lang));
    if (!stillCurrent(token)) return 'cut';
    return await playSource(uri, token, rate);
  } catch {
    if (!stillCurrent(token)) return 'cut';
    return speakWithExpoSpeech(text, lang, token, slow);
  }
}

/** Brief praise. Skipped while a prompt was just started, so the instruction is not cut off. */
export async function speakPraise(): Promise<void> {
  if (!voiceEnabled) return;
  const now = Date.now();
  if (now - lastInstructionAt < 1600) return;
  if (now - lastPraiseAt < PRAISE_MIN_GAP_MS) return;
  lastPraiseAt = now;
  await speakKidPrompt('Yes!', { lang: 'en', clipId: 'praise-yes', countsAsPrompt: false });
}
