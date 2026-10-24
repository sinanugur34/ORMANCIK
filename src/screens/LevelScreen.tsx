import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { LevelPlay } from '../components/LevelPlay';
import { BouncePress, FadeInView } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { islandForLevel } from '../data/islands';
import { buildLevel } from '../data/levels';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Level'>;

export function LevelScreen({ navigation, route }: Props) {
  const { levelId } = route.params;
  const { ageBand, clearLevel, isLevelUnlocked } = useGame();
  const band = ageBand ?? '3-5';
  const level = useMemo(() => buildLevel(levelId, band), [levelId, band]);
  const island = islandForLevel(levelId);
  const [won, setWon] = useState(false);

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
            <Text style={styles.backText}>←</Text>
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
            onWin={() => {
              clearLevel(levelId, level.reward);
              setWon(true);
            }}
          />
        </FadeInView>
      </SafeAreaView>

      <Modal visible={won} transparent animationType="fade">
        <View style={styles.modalBg}>
          <Animated.View entering={ZoomIn.springify()} style={styles.modalCard}>
            <LinearGradient colors={[island.accent, colors.forest]} style={styles.modalHero}>
              <Text style={styles.modalEmoji}>🎉</Text>
              <Text style={styles.modalTitle}>Bölüm bitti!</Text>
              <Text style={styles.modalSub}>+{level.reward} jeton</Text>
            </LinearGradient>
            <View style={styles.modalActions}>
              <PrimaryButton
                label="Harita"
                onPress={() => {
                  setWon(false);
                  navigation.navigate('Map');
                }}
              />
              {levelId < 80 ? (
                <PrimaryButton
                  label="Sonraki"
                  tone="sun"
                  style={{ marginTop: 10 }}
                  onPress={() => {
                    setWon(false);
                    // clearLevel already unlocked levelId+1
                    navigation.replace('Level', { levelId: levelId + 1 });
                  }}
                />
              ) : null}
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
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
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
    maxWidth: 360,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.cream,
  },
  modalHero: { padding: 28, alignItems: 'center' },
  modalEmoji: { fontSize: 48 },
  modalTitle: { marginTop: 8, fontSize: 28, fontWeight: '900', color: colors.white },
  modalSub: { marginTop: 4, color: 'rgba(255,255,255,0.9)', fontWeight: '700', fontSize: 16 },
  modalActions: { padding: 20 },
});
