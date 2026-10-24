import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusBanner } from '../components/StatusBanner';
import { MONETIZATION_COPY, USE_MOCK_MONETIZATION } from '../monetization/config';
import { purchasePremium, restorePurchases } from '../monetization/mockIap';
import { PRODUCTS } from '../monetization/products';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;

const PERKS = [
  'Reklamsız oyun',
  'Tüm kostüm, oda ve dostlar',
  `+${PRODUCTS.premium.bonusCoins} bonus jeton`,
  'Tek seferlik satın alma',
  'Bölümler yine ücretsiz açılır',
];

type GateKind = 'buy' | 'restore' | null;

export function PremiumScreen({ navigation }: Props) {
  const { premium, setPremium, addCoins, ownCosmetic } = useGame();
  const [gate, setGate] = useState<GateKind>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: 'ok' | 'error' | 'info' | 'warn' } | null>(
    null,
  );

  const unlockAllCosmetics = async () => {
    const { COSMETICS } = await import('../data/cosmetics');
    COSMETICS.forEach((c) => ownCosmetic(c.id));
  };

  const buy = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await purchasePremium();
      if (res.ok) {
        setPremium(true);
        if (res.coins) addCoins(res.coins);
        await unlockAllCosmetics();
        setBanner({
          message: res.mock
            ? `Premium aktif · ${MONETIZATION_COPY.mockIapNote}`
            : 'Premium aktif!',
          tone: 'ok',
        });
      } else {
        setBanner({ message: res.reason, tone: 'error' });
      }
    } catch {
      setBanner({ message: 'Satın alma başarısız. Tekrar dene.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await restorePurchases();
      if (res.premium) {
        setPremium(true);
        await unlockAllCosmetics();
        setBanner({ message: 'Premium geri yüklendi.', tone: 'ok' });
      } else {
        setBanner({
          message: USE_MOCK_MONETIZATION
            ? 'Demo: geri yüklenecek satın alma yok.'
            : 'Geri yüklenecek satın alma bulunamadı.',
          tone: 'info',
        });
      }
    } catch {
      setBanner({ message: 'Geri yükleme başarısız.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={require('../../assets/art/hero-grove.jpg')} style={{ flex: 1 }}>
        <LinearGradient
          colors={['rgba(15,61,46,0.45)', 'rgba(15,61,46,0.88)']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.top}>
            <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>←</Text>
            </BouncePress>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {USE_MOCK_MONETIZATION ? (
              <StatusBanner message={MONETIZATION_COPY.mockBadge} tone="warn" style={{ marginBottom: 14 }} />
            ) : null}
            {banner ? (
              <StatusBanner message={banner.message} tone={banner.tone} style={{ marginBottom: 14 }} />
            ) : null}

            <FadeInView>
              <Text style={styles.eyebrow}>Tiny Grove</Text>
              <Text style={styles.title}>Premium</Text>
              <Text style={styles.sub}>
                Reklamsız, tüm kozmetikler açık — ebeveyn onaylı tek seferlik. Bölümler parayla
                kilitlenmez.
              </Text>
            </FadeInView>

            <FadeInView delay={100} style={styles.card}>
              {PERKS.map((p) => (
                <View key={p} style={styles.perk}>
                  <Text style={styles.check}>✓</Text>
                  <Text style={styles.perkText}>{p}</Text>
                </View>
              ))}
              <Text style={styles.price}>{PRODUCTS.premium.priceLabel}</Text>
              {premium ? (
                <View style={styles.owned}>
                  <Text style={styles.ownedText}>Premium aktif ✨</Text>
                </View>
              ) : (
                <PrimaryButton
                  label={busy ? 'İşleniyor…' : 'Premium al'}
                  tone="sun"
                  disabled={busy}
                  onPress={() => setGate('buy')}
                  style={{ marginTop: 8 }}
                />
              )}
              <PrimaryButton
                label={busy ? '…' : 'Satın almaları geri yükle'}
                tone="sky"
                disabled={busy}
                onPress={() => setGate('restore')}
                style={{ marginTop: 10 }}
              />
            </FadeInView>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>

      <ParentalGate
        visible={!!gate}
        title={gate === 'restore' ? 'Geri yükleme onayı' : 'Premium satın alma'}
        onCancel={() => setGate(null)}
        onSuccess={() => {
          const kind = gate;
          setGate(null);
          if (kind === 'buy') buy();
          else if (kind === 'restore') restore();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forestDeep },
  top: { paddingHorizontal: 16, paddingTop: 8 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
  body: { padding: 24, paddingTop: 24 },
  eyebrow: {
    color: colors.sun,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  title: {
    marginTop: 8,
    fontSize: 48,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  sub: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    maxWidth: 340,
  },
  card: {
    marginTop: 28,
    backgroundColor: 'rgba(255,246,232,0.96)',
    borderRadius: 28,
    padding: 22,
  },
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  check: {
    width: 28,
    height: 28,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 28,
    backgroundColor: colors.mint,
    fontWeight: '900',
    color: colors.forestDeep,
  },
  perkText: { flex: 1, fontWeight: '700', color: colors.forestDeep, fontSize: 15 },
  price: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 28,
    fontWeight: '900',
    color: colors.berry,
    textAlign: 'center',
  },
  owned: {
    marginTop: 8,
    backgroundColor: colors.forest,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ownedText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
