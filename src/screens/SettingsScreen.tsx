import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { StatusBanner } from '../components/StatusBanner';
import { MONETIZATION_COPY, USE_MOCK_MONETIZATION } from '../monetization/config';
import { restorePurchases } from '../monetization/mockIap';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const AGES = [3, 4, 5, 6, 7, 8, 9, 10];

type GateKind = 'age' | 'restore' | 'reset' | null;

export function SettingsScreen({ navigation }: Props) {
  const {
    childAge,
    setChildAge,
    premium,
    setPremium,
    voiceEnabled,
    setVoiceEnabled,
    resetProgress,
    ownCosmetic,
  } = useGame();
  const [ageDraft, setAgeDraft] = useState(childAge ?? 5);
  const [gate, setGate] = useState<GateKind>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ message: string; tone: 'ok' | 'error' | 'info' } | null>(
    null,
  );

  const runGate = async () => {
    const kind = gate;
    setGate(null);
    if (!kind) return;

    if (kind === 'age') {
      setChildAge(ageDraft);
      setBanner({ message: `Yaş ${ageDraft} olarak kaydedildi.`, tone: 'ok' });
      return;
    }

    if (kind === 'reset') {
      resetProgress();
      setBanner({ message: 'İlerleme sıfırlandı. Yaş kurulumuna dönülüyor.', tone: 'info' });
      navigation.reset({ index: 0, routes: [{ name: 'AgeSetup' }] });
      return;
    }

    setBusy(true);
    try {
      const res = await restorePurchases();
      if (res.premium) {
        setPremium(true);
        const { COSMETICS } = await import('../data/cosmetics');
        COSMETICS.forEach((c) => ownCosmetic(c.id));
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
      setBanner({ message: 'Geri yükleme başarısız. Tekrar dene.', tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const gateTitle =
    gate === 'age'
      ? 'Yaş değiştirme onayı'
      : gate === 'restore'
        ? 'Satın alma geri yükleme'
        : 'İlerlemeyi sıfırla';

  return (
    <AnimatedBackground variant="forest">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </BouncePress>
          <Text style={styles.title}>Ayarlar</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {USE_MOCK_MONETIZATION ? (
            <StatusBanner message={MONETIZATION_COPY.mockBadge} tone="warn" style={{ marginBottom: 12 }} />
          ) : null}
          {banner ? (
            <StatusBanner message={banner.message} tone={banner.tone} style={{ marginBottom: 12 }} />
          ) : null}

          <FadeInView style={styles.card}>
            <Text style={styles.h}>Sesli yönergeler</Text>
            <Text style={styles.sub}>
              Seviye talimatları ve kısa övgüler sesli okunur. Varsayılan: açık.
            </Text>
            <BouncePress
              onPress={() => setVoiceEnabled(!voiceEnabled)}
              style={[styles.toggleRow, voiceEnabled ? styles.toggleOn : styles.toggleOff]}
            >
              <Text style={[styles.toggleLabel, voiceEnabled && styles.toggleLabelOn]}>
                {voiceEnabled ? 'Açık' : 'Kapalı'}
              </Text>
              <View style={[styles.toggleKnob, voiceEnabled && styles.toggleKnobOn]} />
            </BouncePress>
          </FadeInView>

          <FadeInView delay={40} style={styles.card}>
            <Text style={styles.h}>Çocuk yaşı</Text>
            <Text style={styles.sub}>Değişiklik ebeveyn onayı ister. Şu an: {childAge ?? '—'}</Text>
            <View style={styles.grid}>
              {AGES.map((a) => {
                const active = a === ageDraft;
                return (
                  <BouncePress
                    key={a}
                    onPress={() => setAgeDraft(a)}
                    style={[styles.age, active && styles.ageOn]}
                  >
                    <Text style={[styles.ageText, active && styles.ageTextOn]}>{a}</Text>
                  </BouncePress>
                );
              })}
            </View>
            <PrimaryButton
              label="Yaşı kaydet"
              onPress={() => setGate('age')}
              disabled={ageDraft === childAge}
              style={{ marginTop: 8 }}
            />
          </FadeInView>

          <FadeInView delay={80} style={styles.card}>
            <Text style={styles.h}>Satın almalar</Text>
            <Text style={styles.sub}>
              Premium: {premium ? 'aktif' : 'kapalı'} · {MONETIZATION_COPY.parentalRequired}
            </Text>
            <PrimaryButton
              label={busy ? '…' : 'Satın almaları geri yükle'}
              tone="sky"
              disabled={busy}
              onPress={() => setGate('restore')}
              style={{ marginTop: 10 }}
            />
          </FadeInView>

          <FadeInView delay={120} style={styles.card}>
            <Text style={styles.h}>Güvenlik & gizlilik</Text>
            <PrimaryButton
              label="Gizlilik politikası"
              tone="coral"
              onPress={() => navigation.navigate('Privacy')}
              style={{ marginTop: 10 }}
            />
            <Text style={[styles.sub, { marginTop: 12 }]}>{MONETIZATION_COPY.noTargeting}</Text>
          </FadeInView>

          <FadeInView delay={160} style={styles.card}>
            <Text style={styles.h}>Geliştirici</Text>
            <Text style={styles.sub}>Tüm ilerlemeyi siler (ebeveyn onayı).</Text>
            <PrimaryButton
              label="İlerlemeyi sıfırla"
              tone="coral"
              onPress={() => setGate('reset')}
              style={{ marginTop: 10 }}
            />
          </FadeInView>
        </ScrollView>
      </SafeAreaView>

      <ParentalGate
        visible={!!gate}
        title={gateTitle}
        onCancel={() => setGate(null)}
        onSuccess={runGate}
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
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
  },
  h: { fontWeight: '900', fontSize: 18, color: colors.forestDeep },
  sub: { marginTop: 6, color: colors.muted, fontWeight: '600', lineHeight: 20 },
  toggleRow: {
    marginTop: 14,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleOn: { backgroundColor: colors.forest },
  toggleOff: { backgroundColor: colors.mint },
  toggleLabel: { fontWeight: '800', fontSize: 16, color: colors.forestDeep },
  toggleLabelOn: { color: colors.white },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    opacity: 0.85,
  },
  toggleKnobOn: { opacity: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 8 },
  age: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageOn: { backgroundColor: colors.forest },
  ageText: { fontWeight: '800', fontSize: 18, color: colors.forestDeep },
  ageTextOn: { color: colors.white },
});
