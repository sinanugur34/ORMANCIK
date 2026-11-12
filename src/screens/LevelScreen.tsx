import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { speakKidPrompt } from '../audio/speakPrompt';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { LevelPlay } from '../components/LevelPlay';
import { BouncePress } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { SparkleBurst } from '../components/SparkleBurst';
import { knownWordIds } from '../data/learning';
import { lessonVisit } from '../data/lessonVisit';
import { displayIslandName, islandForLevel } from '../data/islands';
import { buildLevel } from '../data/levels';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Level'>;

const FRIEND_STEPS = [
  { emoji: '🐱', say: 'Call the cat.', label: 'level.friendsStepCat' },
  { emoji: '🐶', say: 'The cat is here. Call the dog.', label: 'level.friendsStepDog' },
  { emoji: '🐰', say: 'The dog is here. Call the rabbit.', label: 'level.friendsStepRabbit' },
] as const;

function FriendsFinale() {
  const t = useT();
  const [called, setCalled] = useState(0);
  const together = called >= FRIEND_STEPS.length;

  React.useEffect(() => {
    const line = together
      ? 'The cat, the dog, and the rabbit are together.'
      : FRIEND_STEPS[called]?.say;
    if (!line) return;
    void speakKidPrompt(line, { lang: 'en' });
  }, [called, together]);

  return (
    <View style={styles.finale}>
      <View style={styles.rug}>
        {FRIEND_STEPS.slice(0, called).map((friend) => (
          <Text key={friend.emoji} style={styles.friend}>
            {friend.emoji}
          </Text>
        ))}
      </View>
      {together ? (
        <Text style={styles.modalSub}>{t('level.friendsTogether')}</Text>
      ) : (
        <BouncePress
          onPress={() => setCalled((n) => Math.min(FRIEND_STEPS.length, n + 1))}
          style={styles.callFriend}
        >
          <Text style={styles.friend}>{FRIEND_STEPS[called]?.emoji}</Text>
          <Text style={styles.callLabel}>{t(FRIEND_STEPS[called]!.label)}</Text>
        </BouncePress>
      )}
    </View>
  );
}

function StarRow({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          entering={ZoomIn.delay(120 * i).springify()}
          style={[styles.star, i <= stars ? styles.starOn : styles.starOff]}
        >
          <Text style={styles.starGlyph}>★</Text>
        </Animated.View>
      ))}
    </View>
  );
}

export function LevelScreen({ navigation, route }: Props) {
  const t = useT();
  const { levelId } = route.params;
  const {
    ageBand,
    clearLevel,
    hintsEnabled,
    isLevelUnlocked,
    language,
    recordLearning,
    englishLevel,
    wordProgress,
    sessionLimit,
    sittingCount,
    dismissSitting,
  } = useGame();
  const band = ageBand ?? '3-5';
  const [visit] = useState(() =>
    lessonVisit(null, `${levelId}:${band}:${language}:${englishLevel}`, knownWordIds(wordProgress)),
  );
  const level = useMemo(
    () => buildLevel(levelId, band, language, { englishLevel, knownIds: visit.knownIds }),
    [levelId, band, language, englishLevel, visit],
  );
  const island = islandForLevel(levelId);
  const islandLabel = displayIslandName(island);
  const [won, setWon] = useState(false);
  const [breakAsk, setBreakAsk] = useState(false);
  const [stars, setStars] = useState<1 | 2 | 3>(3);
  const [awarded, setAwarded] = useState(level.reward);
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (!won) return;
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      true,
    );
    if (levelId === 8) return;
    void speakKidPrompt(t('level.bravo'));
  }, [won, pulse, t, levelId]);

  const devamStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (!isLevelUnlocked(levelId)) {
    return (
      <AnimatedBackground>
        <SafeAreaView style={styles.center}>
          <Text style={styles.lock}>{t('level.locked')}</Text>
          <PrimaryButton label={t('level.backMap')} onPress={() => navigation.goBack()} />
        </SafeAreaView>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground variant="sunset" calm>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>{t('common.backArrow')}</Text>
          </BouncePress>
          <View style={{ flex: 1 }}>
            <Text style={styles.island}>
              {island.emoji} {islandLabel}
            </Text>
            <Text style={styles.title}>{level.title}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.cardWrap}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
          <LevelPlay
            level={level}
            band={band}
            hintsEnabled={hintsEnabled}
            wordProgress={wordProgress}
            onWin={(result) => {
              const coins = clearLevel(levelId, level.reward, result.stars);
              recordLearning(result.words);
              setAwarded(coins);
              setStars(result.stars);
              setWon(true);
            }}
          />
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={won} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Animated.View entering={ZoomIn.springify()} style={styles.modalCard}>
            <LinearGradient colors={[colors.forest, colors.forestDeep]} style={styles.modalHero}>
              <SparkleBurst active={won} tone="good" count={16} />
              <Animated.Text entering={FadeIn.delay(80)} style={styles.modalTitle}>
                {t('level.bravo')}
              </Animated.Text>
              <Text style={styles.modalSub}>
                {t('level.rewardSub', { island: islandLabel, reward: awarded })}
              </Text>
              {levelId === 8 ? <FriendsFinale /> : null}
              <StarRow stars={stars} />
            </LinearGradient>
            <View style={styles.modalActions}>
              {breakAsk ? (
                <View style={{ marginBottom: 8 }}>
                  <Text style={styles.breakTitle}>{t('home.breakTitle')}</Text>
                  <Text style={styles.breakBody}>{t('home.breakBody')}</Text>
                </View>
              ) : null}
              {levelId < 80 ? (
                <Animated.View style={devamStyle}>
                  <PrimaryButton
                    label={breakAsk ? t('home.breakContinue') : t('level.continue')}
                    tone="sun"
                    onPress={() => {
                      if (!breakAsk && sessionLimit > 0 && sittingCount >= sessionLimit) {
                        setBreakAsk(true);
                        return;
                      }
                      if (breakAsk) dismissSitting();
                      setBreakAsk(false);
                      setWon(false);
                      navigation.replace('Level', { levelId: levelId + 1 });
                    }}
                  />
                </Animated.View>
              ) : null}
              <PrimaryButton
                label={t('level.map')}
                large={false}
                style={{ marginTop: 12 }}
                onPress={() => {
                  navigation.reset({
                    index: 1,
                    routes: [{ name: 'Home' }, { name: 'Map' }],
                  });
                }}
              />
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  lock: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  back: {
    minWidth: 64,
    height: 56,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 16, fontWeight: '800', color: colors.forestDeep },
  island: { fontWeight: '700', color: colors.muted },
  title: { fontSize: 20, fontWeight: '900', color: colors.forestDeep },
  scroll: { flex: 1 },
  cardWrap: { padding: 16, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 16,
    paddingBottom: 28,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(15,61,46,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.cream,
  },
  modalHero: {
    padding: 32,
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  modalTitle: { marginTop: 4, fontSize: 34, fontWeight: '900', color: colors.white },
  modalSub: { marginTop: 6, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  finale: { alignItems: 'center', marginTop: 10 },
  rug: {
    minHeight: 54,
    minWidth: 180,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  friend: { fontSize: 32 },
  callFriend: { marginTop: 8, alignItems: 'center' },
  callLabel: { color: colors.white, fontWeight: '800', marginTop: 2 },
  starRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  star: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starOn: { backgroundColor: colors.sun },
  starOff: { backgroundColor: 'rgba(255,255,255,0.25)' },
  starGlyph: { fontSize: 22, color: colors.forestDeep, fontWeight: '900' },
  modalActions: { padding: 20 },
  breakTitle: { fontSize: 20, fontWeight: '900', color: colors.forestDeep, textAlign: 'center' },
  breakBody: { marginTop: 4, color: colors.muted, fontWeight: '700', textAlign: 'center' },
});
