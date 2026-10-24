import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/** Kid-friendly Turkish TTS defaults (ages ~3–10). */
const KID_PITCH = 1.2;
const KID_RATE = 0.92;
const LANGUAGE = 'tr-TR';

const PRAISE = ['Harika!', 'Aferin!', 'Bravo!'] as const;

/** Module gate synced from GameContext — default ON. */
let voiceEnabled = true;

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
    Speech.speak(trimmed, {
      language: LANGUAGE,
      pitch: KID_PITCH,
      rate: KID_RATE,
      onError: () => undefined,
    });
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // Helps smoke-test that narration is invoked (web console / Metro).
      console.log('[speakKidPrompt]', trimmed);
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
