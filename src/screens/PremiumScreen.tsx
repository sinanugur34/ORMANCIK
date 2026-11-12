import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusBanner } from '../components/StatusBanner';
import { useT } from '../i18n';
import { MONETIZATION_COPY, USE_MOCK_MONETIZATION } from '../monetization/config';
import { purchasePremium, restorePurchases } from '../monetization/mockIap';
import { PRODUCTS } from '../monetization/products';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Premium'>;

type GateKind = 'buy' | 'restore' | 'view' | null;

export function PremiumScreen({ navigation }: Props) {
  const t = useT();
  const { premium, setPremium, addCoinsToProfile, ownCosmetic, activeProfileId, parentOpen, lockParent } = useGame();
  const grown = parentOpen;
  const [gate, setGate] = useState<GateKind>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: 'ok' | 'error' | 'info' | 'warn' } | null>(
    null,
  );

  const perks = useMemo(
    () => [
      t('premium.perk.ads'),
      t('premium.perk.cosmetics'),
      t('premium.perk.bonus', { n: PRODUCTS.premium.bonusCoins }),
      t('premium.perk.once'),
      t('premium.perk.levels'),
    ],
    [t],
  );

  const unlockAllCosmetics = async () => {
    const { COSMETICS } = await import('../data/cosmetics');
    COSMETICS.forEach((c) => ownCosmetic(c.id));
  };

  const buy = async () => {
    const buyer = activeProfileId;
    setBusy(true);
    setBanner(null);
    try {
      const res = await purchasePremium();
      if (res.ok) {
        setPremium(true);
        if (res.coins && buyer) addCoinsToProfile(buyer, res.coins);
        await unlockAllCosmetics();
        setBanner({
          message: res.mock
            ? t('premium.activeMock', { note: MONETIZATION_COPY.mockIapNote })
            : t('premium.active'),
          tone: 'ok',
        });
      } else {
        setBanner({ message: res.reason, tone: 'error' });
      }
    } catch {
      setBanner({ message: t('premium.buyFail'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const res = await restorePurchases(premium);
      if (res.premium) {
        setPremium(true);
        await unlockAllCosmetics();
        setBanner({ message: t('premium.restored'), tone: 'ok' });
      } else {
        setBanner({
          message: USE_MOCK_MONETIZATION
            ? t('premium.restoreEmptyMock')
            : t('premium.restoreEmpty'),
          tone: 'info',
        });
      }
    } catch {
      setBanner({ message: t('premium.restoreFail'), tone: 'error' });
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

            {grown ? (
            <FadeInView>
              <PrimaryButton
                label={t('shop.leaveGrownups')}
                tone="sky"
                large={false}
                onPress={lockParent}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.eyebrow}>{t('brand.name')}</Text>
              <Text style={styles.title}>{t('premium.title')}</Text>
              <Text style={styles.sub}>{t('premium.sub')}</Text>
            </FadeInView>
            ) : null}

            <FadeInView delay={100} style={styles.card}>
              {!grown ? (
                <PrimaryButton label={t('shop.grownups')} tone="sun" onPress={() => setGate('view')} />
              ) : (
                <>
              {perks.map((p) => (
                <View key={p} style={styles.perk}>
                  <Text style={styles.check}>✓</Text>
                  <Text style={styles.perkText}>{p}</Text>
                </View>
              ))}
              <Text style={styles.price}>{t('money.demoNoPrice')}</Text>
              {premium ? (
                <View style={styles.owned}>
                  <Text style={styles.ownedText}>{t('premium.owned')}</Text>
                </View>
              ) : (
                <PrimaryButton
                  label={busy ? t('common.busy') : t('premium.buy')}
                  tone="sun"
                  disabled={busy}
                  onPress={() => setGate('buy')}
                  style={{ marginTop: 8 }}
                />
              )}
              <PrimaryButton
                label={busy ? '…' : t('premium.restore')}
                tone="sky"
                disabled={busy}
                onPress={() => setGate('restore')}
                style={{ marginTop: 10 }}
              />
                </>
              )}
            </FadeInView>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>

      <ParentalGate
        visible={!!gate}
        title={gate === 'restore' ? t('premium.gateRestore') : t('premium.gateBuy')}
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
