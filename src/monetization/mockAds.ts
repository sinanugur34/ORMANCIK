import { t } from '../i18n';
import { USE_MOCK_MONETIZATION } from './config';

export const REWARDED_COIN_AMOUNT = 25;

export type AdResult = { rewarded: boolean; mock: boolean; error?: string };

/**
 * Mock rewarded ad.
 *
 * PRODUCTION SWAP:
 * 1. Set USE_MOCK_MONETIZATION = false in config.ts
 * 2. Install a Kids-compliant SDK (e.g. react-native-google-mobile-ads with
 *    tagForChildDirectedTreatment / underAgeOfConsent, or ironSource Kids).
 * 3. Replace the body below with SDK show() + reward callback.
 * 4. Never show forced interstitials for under-13 / Kids category builds.
 */
export async function showRewardedAd(): Promise<AdResult> {
  if (!USE_MOCK_MONETIZATION) {
    return {
      rewarded: false,
      mock: false,
      error: t('money.adSdkMissing'),
    };
  }
  await new Promise((r) => setTimeout(r, 900));
  // Mock always succeeds so parents can demo the parental-gate → reward loop.
  return { rewarded: true, mock: true };
}
