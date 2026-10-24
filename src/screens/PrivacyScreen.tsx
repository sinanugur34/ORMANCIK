import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { BouncePress, FadeInView } from '../components/Motion';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Kimler için',
    body: 'Tiny Grove 3–10 yaş çocuklar için tasarlanmıştır. Ebeveyn yaş seçer; satın alma, reklam ve yaş değişimi ebeveyn onayı ister.',
  },
  {
    title: 'Topladığımız veriler',
    body: 'Oyun ilerlemesi, jeton ve kozmetik tercihleri cihazında (AsyncStorage) saklanır. Hesap zorunlu değildir. Çocuk kimliği, konum veya reklam kimliği toplanmaz.',
  },
  {
    title: 'Reklamlar',
    body: 'Yalnızca ebeveyn onaylı ödüllü reklamlar (isteğe bağlı). Zorunlu ara reklam yok. Davranışsal hedefleme / yeniden pazarlama yok. Üretimde Kids / Families uyumlu reklam SDK kullanılır.',
  },
  {
    title: 'Satın almalar',
    body: 'Dijital içerik yalnızca Apple App Store / Google Play faturalandırması ile. Bölümler gerçek parayla kilitlenmez. Premium tek seferliktir (reklamsız + kozmetik).',
  },
  {
    title: 'İletişim',
    body: 'Gizlilik talepleri: privacy@tinygrove.app (yayın öncesi gerçek iletişim adresinizle değiştirin). Bu ekran mağaza gönderimi için taslak politikadır; yasal metni avukatınızla kesinleştirin.',
  },
];

export function PrivacyScreen({ navigation }: Props) {
  return (
    <AnimatedBackground variant="ocean">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </BouncePress>
          <Text style={styles.title}>Gizlilik</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FadeInView>
            <Text style={styles.lead}>
              Tiny Grove çocuk güvenliği ve mağaza aile politikalarına uygun olacak şekilde tasarlandı.
            </Text>
          </FadeInView>
          {SECTIONS.map((s, i) => (
            <FadeInView key={s.title} delay={60 + i * 40} style={styles.block}>
              <Text style={styles.h}>{s.title}</Text>
              <Text style={styles.p}>{s.body}</Text>
            </FadeInView>
          ))}
          <Text style={styles.foot}>Son güncelleme: 2026-10-24 · v1.0.0 taslak</Text>
        </ScrollView>
      </SafeAreaView>
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
  content: { padding: 20, paddingBottom: 48 },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.forestDeep,
    marginBottom: 16,
  },
  block: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  h: { fontWeight: '900', fontSize: 16, color: colors.forest, marginBottom: 6 },
  p: { color: colors.ink, lineHeight: 22, fontWeight: '500', fontSize: 14 },
  foot: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
  },
});
