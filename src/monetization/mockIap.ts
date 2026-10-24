import { CoinPackKey, PRODUCTS } from './products';

export type PurchaseResult =
  | { ok: true; productId: string; coins?: number; premium?: boolean }
  | { ok: false; reason: string };

/** Mock StoreKit / Play Billing. Swap for react-native-iap in production builds. */
export async function purchaseCoinPack(key: CoinPackKey): Promise<PurchaseResult> {
  await new Promise((r) => setTimeout(r, 700));
  const pack = PRODUCTS[key];
  return { ok: true, productId: pack.id, coins: pack.coins };
}

export async function purchasePremium(): Promise<PurchaseResult> {
  await new Promise((r) => setTimeout(r, 800));
  return {
    ok: true,
    productId: PRODUCTS.premium.id,
    premium: true,
    coins: PRODUCTS.premium.bonusCoins,
  };
}

export async function restorePurchases(): Promise<{ premium: boolean }> {
  await new Promise((r) => setTimeout(r, 400));
  return { premium: false };
}
