import { t } from '../i18n';

/**
 * Monetization mode flag.
 * Keep `true` until real AdMob / StoreKit / Play Billing SDKs are wired.
 * UI shows a clear "DEMO" badge when mock is active so store review
 * and parents never confuse mock flows with production charges.
 */
export const USE_MOCK_MONETIZATION = true;

/** Localized monetization UI strings (resolve at call time). */
export const MONETIZATION_COPY = {
  get mockBadge() {
    return t('money.mockBadge');
  },
  get mockAdNote() {
    return t('money.mockAdNote');
  },
  get mockIapNote() {
    return t('money.mockIapNote');
  },
  get noTargeting() {
    return t('money.noTargeting');
  },
  get parentalRequired() {
    return t('money.parentalRequired');
  },
} as const;
