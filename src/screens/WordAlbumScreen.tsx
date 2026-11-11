import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { speakKidPrompt } from '../audio/speakPrompt';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { BouncePress } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { albumWord, listAlbumWords } from '../data/friendsUnit';
import { heardIndependentCount, isDue, mergeWordProgress, pictureIndependentCount } from '../data/learning';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'WordAlbum'>;

export function WordAlbumScreen({ navigation }: Props) {
  const t = useT();
  const { wordProgress, language } = useGame();
  const catalog = useMemo(() => listAlbumWords(), []);
  const progress = useMemo(() => mergeWordProgress(wordProgress), [wordProgress]);
  const ids = Array.from(new Set([...catalog.map((word) => word.id), ...Object.keys(progress)])).filter(
    (id) => !id.startsWith('room.') && (catalog.some((word) => word.id === id) || albumWord(id) != null),
  );
  const dueIds = ids.filter((id) => {
    const stat = progress[id];
    const word = albumWord(id);
    return (
      stat != null &&
      isDue(stat) &&
      stat.skill !== 'count-quantity' &&
      word != null &&
      !word.id.startsWith('count-')
    );
  });

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
          <Text style={styles.note}>{t('album.attemptsNote')}</Text>
          {dueIds.length > 0 ? (
            <PrimaryButton
              label={t('album.practiceDue')}
              onPress={() => navigation.navigate('Review', { wordIds: dueIds })}
            />
          ) : null}
          {ids.map((id) => {
            const stat = progress[id];
            const label = catalog.find((word) => word.id === id) ?? albumWord(id);
            const name = label ? (language === 'tr' ? `${label.en} · ${label.tr}` : label.en) : id;
            const due = stat != null && isDue(stat);
            const counting = stat?.skill === 'count-quantity' || id.startsWith('count-');
            return (
              <View key={id} style={styles.card}>
                <View style={styles.wordRow}>
                  {label?.swatch ? (
                    <View style={[styles.swatch, { backgroundColor: label.swatch }]} />
                  ) : label?.count != null ? (
                    <View style={styles.cluster}>
                      {Array.from({ length: label.count }, (_, i) => (
                        <Text key={i} style={styles.piece}>
                          {label.emoji}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.emoji,
                        label?.scale != null ? { fontSize: Math.round(22 * label.scale), width: 48 } : null,
                      ]}
                    >
                      {label?.emoji || '★'}
                    </Text>
                  )}
                  <Text style={styles.word}>{name}</Text>
                </View>
                {counting ? <Text style={styles.meta}>{t('album.skillCount')}</Text> : null}
                {stat ? (
                  <Text style={styles.meta}>
                    {counting
                      ? t('album.statsCount', { correct: stat.independent, attempts: stat.attempts })
                      : t('album.stats', {
                          heard: heardIndependentCount(stat),
                          seen: pictureIndependentCount(stat),
                          hinted: stat.hinted,
                          attempts: stat.attempts,
                        })}
                    {due ? ` · ${t('album.due')}` : ''}
                  </Text>
                ) : (
                  <Text style={styles.meta}>{t('album.empty')}</Text>
                )}
                <View style={styles.actions}>
                  {counting ? null : (
                    <BouncePress
                      style={styles.action}
                      onPress={() => {
                        const spoken = label?.en ?? id;
                        void speakKidPrompt(spoken, { lang: 'en', clipId: label?.clipId });
                      }}
                    >
                      <Text style={styles.actionText}>{t('album.listen')}</Text>
                    </BouncePress>
                  )}
                  {stat && !counting ? (
                    <BouncePress
                      style={styles.action}
                      onPress={() => navigation.navigate('Review', { wordIds: [id] })}
                    >
                      <Text style={styles.actionText}>{t('album.practice')}</Text>
                    </BouncePress>
                  ) : null}
                </View>
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
  lead: { color: colors.muted, fontWeight: '600' },
  note: { color: colors.forest, fontWeight: '700', marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 14 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 32, width: 48, textAlign: 'center' },
  cluster: {
    width: 88,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 1,
  },
  piece: { fontSize: 18, lineHeight: 22 },
  swatch: { width: 48, height: 48, borderRadius: 14 },
  word: { fontSize: 18, fontWeight: '900', color: colors.forestDeep, flex: 1 },
  meta: { marginTop: 4, color: colors.forest, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  action: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  actionText: { fontWeight: '800', color: colors.forestDeep },
});
