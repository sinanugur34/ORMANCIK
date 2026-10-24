/**
 * Store product catalog.
 *
 * Before release, create matching products in:
 * - App Store Connect → In-App Purchases (non-consumable Premium + consumable coin packs)
 * - Google Play Console → Monetize → In-app products
 *
 * Keep `id` values identical across both stores (recommended) or map per-platform
 * in mockIap.ts when swapping to react-native-iap.
 *
 * Kids / Families rules:
 * - No real-money paywall on levels (levels unlock by play, not IAP).
 * - Coin packs & Premium are optional cosmetics / ads-free.
 * - Every purchase flow must pass ParentalGate in the UI layer.
 */
export const PRODUCTS = {
  coins_small: {
    id: 'com.tinygrove.coins.small',
    type: 'consumable' as const,
    coins: 80,
    label: 'Küçük Torba',
    priceLabel: '₺29,99',
  },
  coins_medium: {
    id: 'com.tinygrove.coins.medium',
    type: 'consumable' as const,
    coins: 220,
    label: 'Orta Torba',
    priceLabel: '₺79,99',
  },
  coins_large: {
    id: 'com.tinygrove.coins.large',
    type: 'consumable' as const,
    coins: 600,
    label: 'Büyük Torba',
    priceLabel: '₺149,99',
  },
  premium: {
    id: 'com.tinygrove.premium',
    type: 'non_consumable' as const,
    label: 'Premium',
    priceLabel: '₺199,99',
    bonusCoins: 150,
  },
} as const;

export type CoinPackKey = 'coins_small' | 'coins_medium' | 'coins_large';

export const ALL_PRODUCT_IDS = Object.values(PRODUCTS).map((p) => p.id);
