import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { CoinBadge } from '../components/CoinBadge';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { COSMETICS, KIND_LABEL, CosmeticKind } from '../data/cosmetics';
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

  const buyCosmetic = (id: string, price: number) => {
    if (premium || ownedCosmeticIds.includes(id)) {
      equipCosmetic(id);
      return;
    }
    if (!spendCoins(price)) {
      Alert.alert('Jeton yetmiyor', 'Bölüm oyna, reklam izle veya jeton paketi al.');
      return;
    }
    ownCosmetic(id);
    equipCosmetic(id);
  };

  const runGateSuccess = async () => {
    const action = gate;
    setGate(null);
    if (!action) return;
    setBusy(true);
    try {
      if (action.type === 'ad') {
        if (premium) {
          addCoins(REWARDED_COIN_AMOUNT);
        } else {
          const res = await showRewardedAd();
          if (res.rewarded) addCoins(REWARDED_COIN_AMOUNT);
        }
      } else {
        const res = await purchaseCoinPack(action.key);
        if (res.ok && res.coins) addCoins(res.coins);
      }
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
          <Text style={styles.title}>Dükkan</Text>
          <CoinBadge coins={coins} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FadeInView>
            <View style={styles.earnCard}>
              <Text style={styles.earnTitle}>Jeton kazan</Text>
              <Text style={styles.earnSub}>
                {premium
                  ? 'Premium: ödül jetonları reklamsız'
                  : 'Ödüllü reklam (ebeveyn onayı)'}
              </Text>
              <PrimaryButton
                label={busy ? '…' : `+${REWARDED_COIN_AMOUNT} jeton`}
                tone="sun"
                disabled={busy}
                onPress={() => setGate({ type: 'ad' })}
                style={{ marginTop: 12 }}
              />
            </View>
          </FadeInView>

          <FadeInView delay={80}>
            <Text style={styles.section}>Jeton paketleri</Text>
            <View style={styles.packs}>
              {(Object.keys(PRODUCTS) as Array<keyof typeof PRODUCTS>)
                .filter((k) => k !== 'premium')
                .map((key) => {
                  const pack = PRODUCTS[key as CoinPackKey];
                  return (
                    <BouncePress
                      key={key}
                      style={styles.pack}
                      onPress={() => setGate({ type: 'pack', key: key as CoinPackKey })}
                    >
                      <Text style={styles.packCoins}>{pack.coins} 🪙</Text>
                      <Text style={styles.packLabel}>{pack.label}</Text>
                      <Text style={styles.packPrice}>{pack.priceLabel}</Text>
                    </BouncePress>
                  );
                })}
            </View>
          </FadeInView>

          {kinds.map((kind, ki) => (
            <FadeInView key={kind} delay={120 + ki * 40}>
              <Text style={styles.section}>{KIND_LABEL[kind]}</Text>
              <View style={styles.grid}>
                {COSMETICS.filter((c) => c.kind === kind).map((c) => {
                  const owned = premium || ownedCosmeticIds.includes(c.id);
                  return (
                    <BouncePress
                      key={c.id}
                      style={styles.item}
                      onPress={() => buyCosmetic(c.id, c.price)}
                    >
                      <Text style={styles.itemEmoji}>{c.emoji}</Text>
                      <Text style={styles.itemName}>{c.name}</Text>
                      <Text style={styles.itemPrice}>
                        {owned ? 'Tak' : c.price === 0 ? 'Ücretsiz' : `${c.price} 🪙`}
                      </Text>
                    </BouncePress>
                  );
                })}
              </View>
            </FadeInView>
          ))}

          <PrimaryButton
            label="Premium'a bak"
            tone="coral"
            onPress={() => navigation.navigate('Premium')}
            style={{ marginTop: 8, marginBottom: 24 }}
          />
        </ScrollView>
      </SafeAreaView>

      <ParentalGate
        visible={!!gate}
        title={gate?.type === 'ad' ? 'Reklam / ödül onayı' : 'Satın alma onayı'}
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
