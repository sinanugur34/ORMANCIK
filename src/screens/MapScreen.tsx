import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CoinBadge } from '../components/CoinBadge';
import { BouncePress, FadeInView } from '../components/Motion';
import { Stage } from '../components/Stage';
import { displayIslandName, ISLANDS, islandForLevel, TOTAL_LEVELS, type Island } from '../data/islands';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';
import { visualLayer } from '../theme/presentation';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

function levelsOf(island: Island): number[] {
  return Array.from({ length: island.levelCount }, (_, i) => island.levelStart + i);
}

export function MapScreen({ navigation }: Props) {
  const t = useT();
  const { coins, clearedLevelIds, isLevelUnlocked, highestUnlocked, childAge } = useGame();
  const layer = visualLayer(childAge);
  const [showAll, setShowAll] = useState(layer === 'explorer');
  const nextLevel = (() => {
    for (let i = 1; i <= Math.min(highestUnlocked, TOTAL_LEVELS); i++) {
      if (!clearedLevelIds.includes(i)) return i;
    }
    return Math.min(Math.max(highestUnlocked, 1), TOTAL_LEVELS);
  })();

  const journey = (() => {
    if (layer === 'young' && nextLevel <= 8) return [1, 2, 3, 4, 5, 6, 7, 8];
    if (layer === 'explorer') return [];
    const island = islandForLevel(nextLevel);
    const all = levelsOf(island);
    const at = Math.max(0, all.indexOf(nextLevel));
    const span = layer === 'young' ? 4 : 5;
    return all.slice(Math.max(0, at - 1), Math.max(0, at - 1) + span);
  })();

  const stopLabel = (id: number) =>
    id >= 1 && id <= 8 ? t(`map.friend.${id}`) : t('map.levelStop', { n: id });

  return (
    <View style={styles.root}>
      <ImageBackground source={require('../../assets/art/world-map.jpg')} style={styles.banner} resizeMode="cover">
        <LinearGradient colors={['rgba(15,61,46,0.35)', 'rgba(15,61,46,0.82)']} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['top']}>
          <View style={styles.bannerBar}>
            <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>{t('common.backArrow')}</Text>
            </BouncePress>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('map.title')}</Text>
              <Text style={styles.sub}>{t('map.unlocked', { n: highestUnlocked })}</Text>
            </View>
            <CoinBadge coins={coins} />
          </View>
        </SafeAreaView>
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Stage>
          {journey.length > 0 ? (
            <View style={styles.pathCard}>
              <Text style={styles.pathTitle}>{t('map.journeyTitle')}</Text>
              <Text style={styles.pathPlace}>{displayIslandName(islandForLevel(nextLevel))}</Text>
              {journey.map((id) => {
                const unlocked = isLevelUnlocked(id);
                const done = clearedLevelIds.includes(id);
                const current = id === nextLevel && !done;
                const light = current || !unlocked;
                return (
                  <BouncePress
                    key={id}
                    disabled={!unlocked}
                    onPress={() => navigation.navigate('Level', { levelId: id })}
                    style={[styles.pathStop, current && styles.pathNow, done && styles.pathDone, !unlocked && styles.pathLocked]}
                  >
                    <Text style={[styles.pathNum, light && { color: colors.white }]}>
                      {done ? '✓ ' : ''}
                      {id}
                    </Text>
                    <Text style={[styles.pathName, light && { color: colors.white }]}>{stopLabel(id)}</Text>
                  </BouncePress>
                );
              })}
            </View>
          ) : null}

          {layer !== 'explorer' ? (
            <BouncePress onPress={() => setShowAll((open) => !open)} style={styles.fullToggle}>
              <Text style={styles.fullToggleText}>{showAll ? t('map.showPath') : t('map.showAll')}</Text>
            </BouncePress>
          ) : null}

          {showAll || layer === 'explorer'
            ? ISLANDS.map((island, idx) => {
                const levels = levelsOf(island);
                const cleared = levels.filter((id) => clearedLevelIds.includes(id)).length;
                return (
                  <FadeInView key={island.id} delay={idx * 40} style={styles.islandCard}>
                    <View style={styles.islandHead}>
                      <View style={[styles.accent, { backgroundColor: island.accent }]} />
                      <Text style={styles.islandEmoji}>{island.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.islandName}>{displayIslandName(island)}</Text>
                        <Text style={styles.islandProg}>
                          {t('map.done', { cleared, total: island.levelCount })}
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
                            style={[styles.levelDot, done && styles.levelDone, !unlocked && styles.levelLocked]}
                          >
                            <Text style={[styles.levelNum, (done || !unlocked) && { color: colors.white }]}>
                              {done ? '✓' : unlocked ? id : '🔒'}
                            </Text>
                          </BouncePress>
                        );
                      })}
                    </View>
                  </FadeInView>
                );
              })
            : null}
        </Stage>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  banner: { height: 168, justifyContent: 'flex-end' },
  bannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  back: {
    minWidth: 56,
    height: 56,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 16, fontWeight: '800', color: colors.forestDeep },
  title: { color: colors.white, fontSize: 24, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.92)', fontWeight: '600', marginTop: 2 },
  list: { padding: 16, paddingBottom: 48, gap: 14 },
  pathCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 14,
    gap: 8,
  },
  pathTitle: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
  pathPlace: { color: colors.muted, fontWeight: '600', marginBottom: 4 },
  pathStop: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: colors.cream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  pathNow: { backgroundColor: colors.forest },
  pathDone: { backgroundColor: colors.mint },
  pathLocked: { backgroundColor: 'rgba(92,107,115,0.45)' },
  pathNum: { fontWeight: '800', color: colors.forestDeep, fontSize: 18, minWidth: 36 },
  pathName: { fontWeight: '700', color: colors.forestDeep, fontSize: 17 },
  fullToggle: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  fullToggleText: { color: colors.forest, fontWeight: '700', fontSize: 16 },
  islandCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 10,
  },
  islandHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.cream,
  },
  accent: { width: 8, alignSelf: 'stretch', borderRadius: 8 },
  islandEmoji: { fontSize: 28 },
  islandName: { color: colors.forestDeep, fontWeight: '800', fontSize: 18 },
  islandProg: { color: colors.muted, fontWeight: '600', fontSize: 13, marginTop: 2 },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  levelDot: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelDone: { backgroundColor: colors.forest },
  levelLocked: { backgroundColor: 'rgba(92,107,115,0.45)' },
  levelNum: { fontWeight: '800', color: colors.forestDeep, fontSize: 15 },
});
