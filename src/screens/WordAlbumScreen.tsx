import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { BouncePress } from '../components/Motion';
import { FRIENDS_WORD_IDS } from '../data/friendsUnit';
import { isDue } from '../data/learning';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'WordAlbum'>;

const LABELS: Record<string, { en: string; tr: string; emoji: string }> = {
  hello: { en: 'hello', tr: 'merhaba', emoji: '🙋' },
  bye: { en: 'bye', tr: 'hoşça kal', emoji: '👋' },
  cat: { en: 'cat', tr: 'kedi', emoji: '🐱' },
  dog: { en: 'dog', tr: 'köpek', emoji: '🐶' },
  rabbit: { en: 'rabbit', tr: 'tavşan', emoji: '🐰' },
};

export function WordAlbumScreen({ navigation }: Props) {
  const t = useT();
  const { wordProgress, language } = useGame();
  const ids = Array.from(new Set([...FRIENDS_WORD_IDS, ...Object.keys(wordProgress)]));

  return (
    <AnimatedBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>{t('common.backArrow')}</Text>
          </BouncePress>
          <Text style={styles.title}>{t('album.title')}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.lead}>{t('album.lead')}</Text>
          {ids.map((id) => {
            const stat = wordProgress[id];
            const label = LABELS[id];
            const name = label ? (language === 'tr' ? `${label.en} · ${label.tr}` : label.en) : id;
            return (
              <View key={id} style={styles.card}>
                <Text style={styles.word}>
                  {label?.emoji ?? '★'} {name}
                </Text>
                {stat ? (
                  <Text style={styles.meta}>
                    {t('album.stats', {
                      independent: stat.independent,
                      hinted: stat.hinted,
                      attempts: stat.attempts,
                    })}
                    {isDue(stat) ? ` · ${t('album.due')}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.meta}>{t('album.empty')}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  back: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  backText: { fontWeight: '800', color: colors.forestDeep },
  title: { fontSize: 22, fontWeight: '900', color: colors.forestDeep },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  lead: { color: colors.muted, fontWeight: '600', marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  word: { fontSize: 18, fontWeight: '900', color: colors.forestDeep },
  meta: { marginTop: 4, color: colors.forest, fontWeight: '700' },
});
