import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { LessonPlay } from '../components/LessonPlay';
import { BouncePress } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { buildReviewLevel } from '../data/friendsUnit';
import { isDue } from '../data/learning';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Review'>;

export function ReviewScreen({ navigation, route }: Props) {
  const t = useT();
  const { ageBand, hintsEnabled, language, recordLearning, wordProgress } = useGame();
  const band = ageBand ?? '3-5';
  const [done, setDone] = useState(false);
  const wordIds = useMemo(() => {
    const requested = route.params?.wordIds ?? [];
    if (requested.length) return requested;
    return Object.values(wordProgress)
      .filter((stat) => isDue(stat))
      .map((stat) => stat.id);
  }, [route.params?.wordIds, wordProgress]);
  const level = useMemo(() => buildReviewLevel(wordIds, band, language), [wordIds, band, language]);

  return (
    <AnimatedBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>{t('common.backArrow')}</Text>
          </BouncePress>
          <Text style={styles.title}>{t('album.reviewTitle')}</Text>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {done ? (
            <>
              <Text style={styles.done}>{t('level.bravo')}</Text>
              <PrimaryButton label={t('common.backArrow')} onPress={() => navigation.goBack()} />
            </>
          ) : level ? (
            <LessonPlay
              level={level}
              band={band}
              hintsEnabled={hintsEnabled}
              onWin={(result) => {
                recordLearning(result.words);
                setDone(true);
              }}
            />
          ) : (
            <>
              <Text style={styles.done}>{t('album.empty')}</Text>
              <PrimaryButton label={t('common.backArrow')} onPress={() => navigation.goBack()} />
            </>
          )}
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
  scroll: { flex: 1 },
  body: {
    margin: 16,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    paddingBottom: 40,
  },
  done: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.forestDeep,
    textAlign: 'center',
    marginBottom: 16,
  },
});
