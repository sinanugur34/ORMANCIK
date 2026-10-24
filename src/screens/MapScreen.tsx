import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoinBadge } from '../components/CoinBadge';
import { BouncePress, FadeInView } from '../components/Motion';
import { ISLANDS } from '../data/islands';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

export function MapScreen({ navigation }: Props) {
  const { coins, clearedLevelIds, isLevelUnlocked, highestUnlocked } = useGame();

  return (
    <View style={styles.root}>
      <ImageBackground source={require('../../assets/art/world-map.jpg')} style={styles.banner} resizeMode="cover">
        <LinearGradient colors={['rgba(15,61,46,0.35)', 'rgba(15,61,46,0.82)']} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']}>
          <View style={styles.bannerBar}>
            <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>←</Text>
            </BouncePress>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Dünya Haritası</Text>
              <Text style={styles.sub}>Açık: {highestUnlocked} / 80</Text>
            </View>
            <CoinBadge coins={coins} />
          </View>
        </SafeAreaView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {ISLANDS.map((island, idx) => {
          const levels = Array.from({ length: island.levelCount }, (_, i) => island.levelStart + i);
          const cleared = levels.filter((id) => clearedLevelIds.includes(id)).length;
          return (
            <FadeInView key={island.id} delay={idx * 60} style={styles.islandCard}>
              <View style={[styles.islandHead, { backgroundColor: island.accent }]}>
                <Text style={styles.islandEmoji}>{island.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.islandName}>{island.name}</Text>
                  <Text style={styles.islandProg}>
                    {cleared}/{island.levelCount} tamam
                  </Text>
                </View>
              </View>
              <View style={styles.levelGrid}>
                {levels.map((id) => {
                  const unlocked = isLevelUnlocked(id);
                  const done = clearedLevelIds.includes(id);
                  return (
                    <BouncePress
                      key={id}
                      disabled={!unlocked}
                      onPress={() => navigation.navigate('Level', { levelId: id })}
                      style={[
                        styles.levelDot,
                        done && styles.levelDone,
                        !unlocked && styles.levelLocked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelNum,
                          (done || !unlocked) && { color: colors.white },
                        ]}
                      >
                        {unlocked ? id : '🔒'}
                      </Text>
                    </BouncePress>
                  );
                })}
              </View>
            </FadeInView>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  banner: { height: 180, justifyContent: 'flex-end' },
  bannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
  title: { color: colors.white, fontSize: 24, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', marginTop: 2 },
  list: { padding: 16, paddingBottom: 48, gap: 14 },
  islandCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
  },
  islandHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  islandEmoji: { fontSize: 28 },
  islandName: { color: colors.white, fontWeight: '900', fontSize: 18 },
  islandProg: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 12, marginTop: 2 },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  levelDot: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDone: { backgroundColor: colors.forest },
  levelLocked: { backgroundColor: 'rgba(92,107,115,0.45)' },
  levelNum: { fontWeight: '800', color: colors.forestDeep, fontSize: 13 },
});
