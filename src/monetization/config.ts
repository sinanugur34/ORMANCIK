/**
 * Monetization mode flag.
 * Keep `true` until real AdMob / StoreKit / Play Billing SDKs are wired.
 * UI shows a clear "DEMO" badge when mock is active so store review
 * and parents never confuse mock flows with production charges.
 */
export const USE_MOCK_MONETIZATION = true;

export const MONETIZATION_COPY = {
  mockBadge: 'DEMO · gerçek ödeme yok',
  mockAdNote: 'Bu bir deneme ödüllü reklamıdır. Gerçek AdMob Kids SDK sonra bağlanır.',
  mockIapNote: 'Bu bir deneme satın almasıdır. Gerçek StoreKit / Play Billing sonra bağlanır.',
  noTargeting: 'Çocuklara davranışsal reklam hedeflemesi yapılmaz.',
  parentalRequired: 'Satın alma, reklam ve yaş değişimi ebeveyn onayı ister.',
} as const;
