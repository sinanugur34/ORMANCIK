import { t } from '../i18n';
import { USE_MOCK_MONETIZATION } from './config';
import { CoinPackKey, PRODUCTS } from './products';

export type PurchaseResult =
  | { ok: true; productId: string; coins?: number; premium?: boolean; mock: boolean }
  | { ok: false; reason: string; mock: boolean };

/**
 * Mock StoreKit / Play Billing.
 *
 * PRODUCTION SWAP:
 * 1. Set USE_MOCK_MONETIZATION = false in config.ts
 * 2. Add react-native-iap (or Expo in-app-purchases) + native build (EAS)
 * 3. Call requestPurchase with PRODUCTS.*.id; validate receipts server-side if needed
 * 4. Wire restorePurchases to getAvailablePurchases / getPurchaseHistory
 * 5. Keep ParentalGate in ShopScreen / PremiumScreen / SettingsScreen — do not remove
 */
export async function purchaseCoinPack(key: CoinPackKey): Promise<PurchaseResult> {
  if (!USE_MOCK_MONETIZATION) {
    return { ok: false, reason: t('money.iapMissing'), mock: false };
  }
  await new Promise((r) => setTimeout(r, 700));
  const pack = PRODUCTS[key];
  return { ok: true, productId: pack.id, coins: pack.coins, mock: true };
}

export async function purchasePremium(): Promise<PurchaseResult> {
  if (!USE_MOCK_MONETIZATION) {
    return { ok: false, reason: t('money.iapMissing'), mock: false };
  }
  await new Promise((r) => setTimeout(r, 800));
  return {
    ok: true,
    productId: PRODUCTS.premium.id,
    premium: true,
    coins: PRODUCTS.premium.bonusCoins,
    mock: true,
  };
}

export async function restorePurchases(
  savedPremium = false,
): Promise<{ premium: boolean; mock: boolean }> {
  if (!USE_MOCK_MONETIZATION) {
    return { premium: false, mock: false };
  }
  await new Promise((r) => setTimeout(r, 400));
  // Demo has no store receipt. The only entitlement we can restore is the one saved on this device.
  return { premium: savedPremium, mock: true };
}
