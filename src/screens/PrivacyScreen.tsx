import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { BouncePress, FadeInView } from '../components/Motion';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

const SECTION_KEYS = [
  { title: 'privacy.s1.title', body: 'privacy.s1.body' },
  { title: 'privacy.s2.title', body: 'privacy.s2.body' },
  { title: 'privacy.s3.title', body: 'privacy.s3.body' },
  { title: 'privacy.s4.title', body: 'privacy.s4.body' },
  { title: 'privacy.s5.title', body: 'privacy.s5.body' },
] as const;

export function PrivacyScreen({ navigation }: Props) {
  const t = useT();
  const sections = useMemo(
    () => SECTION_KEYS.map((s) => ({ title: t(s.title), body: t(s.body) })),
    [t],
  );

  return (
    <AnimatedBackground variant="ocean">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>←</Text>
          </BouncePress>
          <Text style={styles.title}>{t('privacy.title')}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <FadeInView>
            <Text style={styles.lead}>{t('privacy.lead')}</Text>
          </FadeInView>
          {sections.map((s, i) => (
            <FadeInView key={s.title} delay={60 + i * 40} style={styles.block}>
              <Text style={styles.h}>{s.title}</Text>
              <Text style={styles.p}>{s.body}</Text>
            </FadeInView>
          ))}
          <Text style={styles.foot}>{t('privacy.foot')}</Text>
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
