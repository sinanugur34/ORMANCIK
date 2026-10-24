import * as Localization from 'expo-localization';

/** ISO 639-1 language code of the device’s preferred locale (lowercase). */
export function getDeviceLanguageCode(): string {
  try {
    const code = Localization.getLocales()[0]?.languageCode;
    return (code ?? 'en').toLowerCase();
  } catch {
    return 'en';
  }
}

/** True when phone/tablet system language is Turkish. */
export function isDeviceTurkish(): boolean {
  return getDeviceLanguageCode() === 'tr';
}
