import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { speakKidPrompt } from '../audio/speakPrompt';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { CinematicHero } from '../components/CinematicHero';
import { CoinBadge } from '../components/CoinBadge';
import { BouncePress, FadeInView, Pulse } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { TOTAL_LEVELS } from '../data/islands';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const {
    coins,
    premium,
    ageBand,
    childAge,
    childName,
    activeProfileId,
    clearedLevelIds,
    highestUnlocked,
    voiceEnabled,
  } = useGame();
  const soft = ageBand === '3-5';
  const greetedId = useRef<string | null>(null);

  const nextLevel = (() => {
    for (let i = 1; i <= Math.min(highestUnlocked, TOTAL_LEVELS); i++) {
      if (!clearedLevelIds.includes(i)) return i;
    }
    return Math.min(Math.max(highestUnlocked, 1), TOTAL_LEVELS);
  })();

  useEffect(() => {
    if (!activeProfileId || !childName || !voiceEnabled) return;
    if (greetedId.current === activeProfileId) return;
    greetedId.current = activeProfileId;
    void speakKidPrompt(`Merhaba, ${childName}!`);
  }, [activeProfileId, childName, voiceEnabled]);

  return (
    <AnimatedBackground variant="forest">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.topBar}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.brand}>Tiny Grove</Text>
              <Text style={styles.hello}>Merhaba, {childName ?? 'kaşif'}!</Text>
              <Text style={styles.meta}>
                {soft
                  ? `Yaş ${childAge}`
                  : `Yaş ${childAge} · ${clearedLevelIds.length}/${TOTAL_LEVELS}`}
              </Text>
            </View>
            <View style={styles.topRight}>
              <BouncePress onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
                <Text style={styles.settingsText}>Ayar</Text>
              </BouncePress>
              <CoinBadge coins={coins} />
              {premium ? (
                <View style={styles.premPill}>
                  <Text style={styles.premText}>Premium</Text>
                </View>
              ) : null}
            </View>
          </View>

          <FadeInView>
            <View style={styles.heroCard}>
              <CinematicHero height={soft ? 260 : 280} />
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, soft && { fontSize: 26 }]}>
                  {soft ? 'Hadi ormana!' : 'Orman seni bekliyor'}
                </Text>
                {!soft ? (
                  <Text style={styles.heroSub}>80 bölüm · kostümler · sihirli odalar</Text>
                ) : (
                  <Text style={styles.heroSub}>Dokun ve oyna</Text>
                )}
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={100} style={styles.actions}>
            <Pulse>
              <PrimaryButton
                label={soft ? 'Oyna' : 'Haritaya Git'}
                onPress={() =>
                  soft
                    ? navigation.navigate('Level', { levelId: nextLevel })
                    : navigation.navigate('Map')
                }
              />
            </Pulse>
            <PrimaryButton
              label={soft ? 'Harita' : 'Oyun Odası'}
              tone="sky"
              onPress={() =>
                soft ? navigation.navigate('Map') : navigation.navigate('PlayRoom')
              }
              style={{ marginTop: 14 }}
            />
            {soft ? (
              <PrimaryButton
                label="Oyun Odası"
                tone="sun"
                large={false}
                onPress={() => navigation.navigate('PlayRoom')}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </FadeInView>

          {!soft ? (
            <FadeInView delay={180}>
              <Text style={styles.section}>Keşfet</Text>
              <View style={styles.row}>
                <BouncePress style={styles.tile} onPress={() => navigation.navigate('Shop')}>
                  <Image source={require('../../assets/art/mascot.jpg')} style={styles.tileImg} />
                  <Text style={styles.tileTitle}>Dükkan</Text>
                  <Text style={styles.tileSub}>Kostüm & dostlar</Text>
                </BouncePress>
                <BouncePress style={styles.tile} onPress={() => navigation.navigate('Premium')}>
                  <Image source={require('../../assets/art/world-map.jpg')} style={styles.tileImg} />
                  <Text style={styles.tileTitle}>Premium</Text>
                  <Text style={styles.tileSub}>Reklamsız + her şey</Text>
                </BouncePress>
              </View>
            </FadeInView>
          ) : (
            <FadeInView delay={180} style={styles.softExplore}>
              <BouncePress style={styles.softTile} onPress={() => navigation.navigate('Shop')}>
                <Text style={styles.softTileText}>Dükkan</Text>
              </BouncePress>
            </FadeInView>
          )}

          <BouncePress style={styles.privacyLink} onPress={() => navigation.navigate('Privacy')}>
            <Text style={styles.privacyText}>Gizlilik politikası</Text>
          </BouncePress>
        </ScrollView>
      </SafeAreaView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: { fontSize: 30, fontWeight: '900', color: colors.forestDeep, letterSpacing: -0.5 },
  hello: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: colors.forest,
  },
  meta: { color: colors.muted, fontWeight: '600', marginTop: 2, fontSize: 13 },
  topRight: { alignItems: 'flex-end', gap: 6 },
  settingsBtn: {
    minWidth: 56,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  settingsText: { fontSize: 13, fontWeight: '800', color: colors.forestDeep },
  premPill: {
    backgroundColor: colors.sun,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  premText: { fontWeight: '800', fontSize: 11, color: colors.forestDeep },
  privacyLink: { alignSelf: 'center', marginTop: 22, padding: 12, minHeight: 44 },
  privacyText: { color: colors.muted, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },
  heroCard: {
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.forestDeep,
  },
  heroCopy: { padding: 18, marginTop: -8 },
  heroTitle: { color: colors.white, fontSize: 24, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  actions: { paddingHorizontal: 20, marginTop: 22 },
  section: {
    marginTop: 28,
    marginHorizontal: 20,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '800',
    color: colors.forestDeep,
  },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  tile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    overflow: 'hidden',
    paddingBottom: 14,
    minHeight: 160,
  },
  tileImg: { width: '100%', height: 100 },
  tileTitle: {
    marginTop: 10,
    marginHorizontal: 12,
    fontWeight: '800',
    fontSize: 16,
    color: colors.forestDeep,
  },
  tileSub: { marginHorizontal: 12, color: colors.muted, fontSize: 12, marginTop: 2 },
  softExplore: { paddingHorizontal: 20, marginTop: 24 },
  softTile: {
    backgroundColor: colors.card,
    borderRadius: 22,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softTileText: { fontSize: 18, fontWeight: '800', color: colors.forestDeep },
});
