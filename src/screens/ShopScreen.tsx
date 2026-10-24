import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { CoinBadge } from '../components/CoinBadge';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusBanner } from '../components/StatusBanner';
import { COSMETICS, displayCosmeticName, kindLabel, CosmeticKind } from '../data/cosmetics';
import { productLabel, useT } from '../i18n';
import { MONETIZATION_COPY, USE_MOCK_MONETIZATION } from '../monetization/config';
import { REWARDED_COIN_AMOUNT, showRewardedAd } from '../monetization/mockAds';
import { purchaseCoinPack } from '../monetization/mockIap';
import { PRODUCTS, CoinPackKey } from '../monetization/products';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Shop'>;

type GateAction =
  | { type: 'ad' }
  | { type: 'pack'; key: CoinPackKey }
  | null;

export function ShopScreen({ navigation }: Props) {
  const t = useT();
  const {
    coins,
    premium,
    ownedCosmeticIds,
    spendCoins,
    addCoins,
    ownCosmetic,
    equipCosmetic,
  } = useGame();
  const [gate, setGate] = useState<GateAction>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: 'ok' | 'error' | 'info' | 'warn' } | null>(
    null,
  );

  const buyCosmetic = (id: string, price: number) => {
    if (premium || ownedCosmeticIds.includes(id)) {
      equipCosmetic(id);
      setBanner({ message: t('shop.equipped'), tone: 'ok' });
      return;
    }
    if (!spendCoins(price)) {
      setBanner({
        message: t('shop.notEnough'),
        tone: 'warn',
      });
      return;
    }
    ownCosmetic(id);
    equipCosmetic(id);
    setBanner({ message: t('shop.bought'), tone: 'ok' });
  };

  const runGateSuccess = async () => {
    const action = gate;
    setGate(null);
    if (!action) return;
    setBusy(true);
    setBanner(null);
    try {
      if (action.type === 'ad') {
        if (premium) {
          addCoins(REWARDED_COIN_AMOUNT);
          setBanner({
            message: t('shop.rewardPremium', { n: REWARDED_COIN_AMOUNT }),
            tone: 'ok',
          });
        } else {
          const res = await showRewardedAd();
          if (res.rewarded) {
            addCoins(REWARDED_COIN_AMOUNT);
            setBanner({
              message: res.mock
                ? t('shop.rewardMock', {
                    n: REWARDED_COIN_AMOUNT,
                    note: MONETIZATION_COPY.mockAdNote,
                  })
                : t('shop.rewardOk', { n: REWARDED_COIN_AMOUNT }),
              tone: 'ok',
            });
          } else {
            setBanner({ message: res.error ?? t('shop.rewardFail'), tone: 'error' });
          }
        }
      } else {
        const res = await purchaseCoinPack(action.key);
        if (res.ok && res.coins) {
          addCoins(res.coins);
          setBanner({
            message: res.mock
              ? t('shop.rewardMock', { n: res.coins, note: MONETIZATION_COPY.mockIapNote })
              : t('shop.packOk', { n: res.coins }),
            tone: 'ok',
          });
        } else if (!res.ok) {
          setBanner({ message: res.reason, tone: 'error' });
        }
      }
    } catch {
      setBanner({ message: t('shop.error'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const kinds: CosmeticKind[] = ['outfit', 'room', 'pet', 'fx'];

  return (
    <AnimatedBackground variant="ocean">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </BouncePress>
          <Text style={styles.title}>{t('shop.title')}</Text>
          <CoinBadge coins={coins} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {USE_MOCK_MONETIZATION ? (
            <StatusBanner message={MONETIZATION_COPY.mockBadge} tone="warn" style={{ marginBottom: 10 }} />
          ) : null}
          {banner ? (
            <StatusBanner message={banner.message} tone={banner.tone} style={{ marginBottom: 10 }} />
          ) : null}

          <FadeInView>
            <View style={styles.earnCard}>
              <Text style={styles.earnTitle}>{t('shop.earnTitle')}</Text>
              <Text style={styles.earnSub}>
                {premium ? t('shop.earnPremium') : t('shop.earnAd')}
              </Text>
              <PrimaryButton
                label={busy ? t('common.loading') : t('shop.earnBtn', { n: REWARDED_COIN_AMOUNT })}
                tone="sun"
                disabled={busy}
                onPress={() => setGate({ type: 'ad' })}
                style={{ marginTop: 12 }}
              />
            </View>
          </FadeInView>

          <FadeInView delay={80}>
            <Text style={styles.section}>{t('shop.packs')}</Text>
            <View style={styles.packs}>
              {(Object.keys(PRODUCTS) as Array<keyof typeof PRODUCTS>)
                .filter((k) => k !== 'premium')
                .map((key) => {
                  const pack = PRODUCTS[key as CoinPackKey];
                  return (
                    <BouncePress
                      key={key}
                      disabled={busy}
                      style={styles.pack}
                      onPress={() => setGate({ type: 'pack', key: key as CoinPackKey })}
                    >
                      <Text style={styles.packCoins}>{pack.coins} 🪙</Text>
                      <Text style={styles.packLabel}>{productLabel(key)}</Text>
                      <Text style={styles.packPrice}>{pack.priceLabel}</Text>
                    </BouncePress>
                  );
                })}
            </View>
          </FadeInView>

          {kinds.map((kind, ki) => {
            const items = COSMETICS.filter((c) => c.kind === kind);
            return (
              <FadeInView key={kind} delay={120 + ki * 40}>
                <Text style={styles.section}>{kindLabel(kind)}</Text>
                {items.length === 0 ? (
                  <StatusBanner message={t('shop.emptyCategory')} tone="info" />
                ) : (
                  <View style={styles.grid}>
                    {items.map((c) => {
                      const owned = premium || ownedCosmeticIds.includes(c.id);
                      return (
                        <BouncePress
                          key={c.id}
                          style={styles.item}
                          onPress={() => buyCosmetic(c.id, c.price)}
                        >
                          <Text style={styles.itemEmoji}>{c.emoji}</Text>
                          <Text style={styles.itemName}>{displayCosmeticName(c)}</Text>
                          <Text style={styles.itemPrice}>
                            {owned
                              ? t('shop.equip')
                              : c.price === 0
                                ? t('shop.free')
                                : `${c.price} 🪙`}
                          </Text>
                        </BouncePress>
                      );
                    })}
                  </View>
                )}
              </FadeInView>
            );
          })}

          <PrimaryButton
            label={t('shop.seePremium')}
            tone="coral"
            onPress={() => navigation.navigate('Premium')}
            style={{ marginTop: 8, marginBottom: 24 }}
          />
        </ScrollView>
      </SafeAreaView>

      <ParentalGate
        visible={!!gate}
        title={gate?.type === 'ad' ? t('shop.gateAd') : t('shop.gateBuy')}
        onCancel={() => setGate(null)}
        onSuccess={runGateSuccess}
      />
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
  title: { flex: 1, fontSize: 24, fontWeight: '900', color: colors.forestDeep },
  content: { padding: 16, paddingBottom: 40 },
  earnCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 18,
    marginBottom: 8,
  },
  earnTitle: { fontWeight: '900', fontSize: 18, color: colors.forestDeep },
  earnSub: { marginTop: 4, color: colors.muted, fontWeight: '600' },
  section: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: '800',
    color: colors.forestDeep,
  },
  packs: { flexDirection: 'row', gap: 10 },
  pack: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
  },
  packCoins: { fontWeight: '900', fontSize: 16, color: colors.forest },
  packLabel: { marginTop: 4, fontWeight: '700', fontSize: 12, color: colors.ink },
  packPrice: { marginTop: 6, fontWeight: '800', color: colors.berry, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    width: '30.5%',
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  itemEmoji: { fontSize: 28 },
  itemName: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.forestDeep,
    textAlign: 'center',
  },
  itemPrice: { marginTop: 4, fontSize: 11, fontWeight: '800', color: colors.muted },
});
