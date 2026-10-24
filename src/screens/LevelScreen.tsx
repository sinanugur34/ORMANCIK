import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
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
import { AnimatedBackground } from '../components/AnimatedBackground';
import { LevelPlay } from '../components/LevelPlay';
import { BouncePress, FadeInView } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { SparkleBurst } from '../components/SparkleBurst';
import { islandForLevel } from '../data/islands';
import { buildLevel } from '../data/levels';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Level'>;

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
  const { levelId } = route.params;
  const { ageBand, clearLevel, isLevelUnlocked } = useGame();
  const band = ageBand ?? '3-5';
  const level = useMemo(() => buildLevel(levelId, band), [levelId, band]);
  const island = islandForLevel(levelId);
  const [won, setWon] = useState(false);
  const [stars, setStars] = useState<1 | 2 | 3>(3);
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    if (!won) return;
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      true,
    );
  }, [won, pulse]);

  const devamStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (!isLevelUnlocked(levelId)) {
    return (
      <AnimatedBackground>
        <SafeAreaView style={styles.center}>
          <Text style={styles.lock}>Bu bölüm henüz kilitli</Text>
          <PrimaryButton label="Haritaya dön" onPress={() => navigation.goBack()} />
        </SafeAreaView>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground variant="sunset">
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Geri</Text>
          </BouncePress>
          <View style={{ flex: 1 }}>
            <Text style={styles.island}>
              {island.emoji} {island.name}
            </Text>
            <Text style={styles.title}>{level.title}</Text>
          </View>
        </View>

        <FadeInView style={styles.card}>
          <LevelPlay
            level={level}
            band={band}
            onWin={(earned) => {
              clearLevel(levelId, level.reward);
              setStars(earned);
              setWon(true);
            }}
          />
        </FadeInView>
      </SafeAreaView>

      <Modal visible={won} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Animated.View entering={ZoomIn.springify()} style={styles.modalCard}>
            <LinearGradient colors={[island.accent, colors.forest]} style={styles.modalHero}>
              <SparkleBurst active={won} tone="good" count={16} />
              <Animated.Text entering={FadeIn.delay(80)} style={styles.modalTitle}>
                Bravo!
              </Animated.Text>
              <Text style={styles.modalSub}>{island.name} · +{level.reward} jeton</Text>
              <StarRow stars={stars} />
            </LinearGradient>
            <View style={styles.modalActions}>
              {levelId < 80 ? (
                <Animated.View style={devamStyle}>
                  <PrimaryButton
                    label="Devam"
                    tone="sun"
                    onPress={() => {
                      setWon(false);
                      navigation.replace('Level', { levelId: levelId + 1 });
                    }}
                  />
                </Animated.View>
              ) : null}
              <PrimaryButton
                label="Harita"
                large={false}
                style={{ marginTop: 12 }}
                onPress={() => {
                  setWon(false);
                  navigation.navigate('Map');
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
  card: {
    margin: 16,
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 16,
    flexGrow: 1,
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
  modalSub: { marginTop: 6, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 16 },
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
});
