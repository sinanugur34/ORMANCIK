/** Mock rewarded ad — real SDK (AdMob / ironSource Kids) plugs in here later. */
export async function showRewardedAd(): Promise<{ rewarded: boolean }> {
  await new Promise((r) => setTimeout(r, 900));
  // Always succeed in mock so parents can demo the flow
  return { rewarded: true };
}

export const REWARDED_COIN_AMOUNT = 25;
