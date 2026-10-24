import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { CinematicHero } from '../components/CinematicHero';
import { CoinBadge } from '../components/CoinBadge';
import { BouncePress, FadeInView } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { TOTAL_LEVELS } from '../data/islands';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { coins, premium, ageBand, childAge, clearedLevelIds } = useGame();

  return (
    <AnimatedBackground variant="forest">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.brand}>Tiny Grove</Text>
              <Text style={styles.meta}>
                Yaş {childAge} · {ageBand} · {clearedLevelIds.length}/{TOTAL_LEVELS}
              </Text>
            </View>
            <View style={styles.topRight}>
              <BouncePress onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
                <Text style={styles.settingsText}>⚙</Text>
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
              <CinematicHero height={280} />
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Orman seni bekliyor</Text>
                <Text style={styles.heroSub}>80 bölüm · kostümler · sihirli odalar</Text>
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={100} style={styles.actions}>
            <PrimaryButton label="Haritaya Git" onPress={() => navigation.navigate('Map')} />
            <PrimaryButton
              label="Oyun Odası"
              tone="sky"
              onPress={() => navigation.navigate('PlayRoom')}
              style={{ marginTop: 12 }}
            />
          </FadeInView>

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
            <BouncePress
              style={styles.privacyLink}
              onPress={() => navigation.navigate('Privacy')}
            >
              <Text style={styles.privacyText}>Gizlilik politikası</Text>
            </BouncePress>
          </FadeInView>
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
    alignItems: 'center',
  },
  brand: { fontSize: 28, fontWeight: '900', color: colors.forestDeep, letterSpacing: -0.5 },
  meta: { color: colors.muted, fontWeight: '600', marginTop: 2, fontSize: 13 },
  topRight: { alignItems: 'flex-end', gap: 6 },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  settingsText: { fontSize: 16 },
  premPill: {
    backgroundColor: colors.sun,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  premText: { fontWeight: '800', fontSize: 11, color: colors.forestDeep },
  privacyLink: { alignSelf: 'center', marginTop: 22, padding: 10 },
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
  actions: { paddingHorizontal: 20, marginTop: 20 },
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
});
