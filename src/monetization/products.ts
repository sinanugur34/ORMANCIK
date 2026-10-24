/** Store product IDs — replace with real App Store / Play Console IDs before release. */
export const PRODUCTS = {
  coins_small: {
    id: 'com.tinygrove.coins.small',
    coins: 80,
    label: 'Küçük Torba',
    priceLabel: '₺29,99',
  },
  coins_medium: {
    id: 'com.tinygrove.coins.medium',
    coins: 220,
    label: 'Orta Torba',
    priceLabel: '₺79,99',
  },
  coins_large: {
    id: 'com.tinygrove.coins.large',
    coins: 600,
    label: 'Büyük Torba',
    priceLabel: '₺149,99',
  },
  premium: {
    id: 'com.tinygrove.premium',
    label: 'Premium',
    priceLabel: '₺199,99',
    bonusCoins: 150,
  },
} as const;

export type CoinPackKey = 'coins_small' | 'coins_medium' | 'coins_large';
