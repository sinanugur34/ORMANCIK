import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { speakKidPrompt } from '../audio/speakPrompt';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { GroveMascot } from '../components/GroveMascot';
import { CoinBadge } from '../components/CoinBadge';
import { BouncePress, FadeInView, Pulse } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { Stage } from '../components/Stage';
import { displayIslandName, islandForLevel, TOTAL_LEVELS } from '../data/islands';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';
import { visualLayer } from '../theme/presentation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const t = useT();
  const {
    coins,
    premium,
    childAge,
    childName,
    activeProfileId,
    clearedLevelIds,
    highestUnlocked,
    voiceEnabled,
    language,
    sessionLimit,
    sittingCount,
    dismissSitting,
    saveIssue,
    friendsIntro,
    dismissFriendsIntro,
  } = useGame();
  const layer = visualLayer(childAge);
  const greetedId = useRef<string | null>(null);

  const nextLevel = (() => {
    for (let i = 1; i <= Math.min(highestUnlocked, TOTAL_LEVELS); i++) {
      if (!clearedLevelIds.includes(i)) return i;
    }
    return Math.min(Math.max(highestUnlocked, 1), TOTAL_LEVELS);
  })();
  const place = displayIslandName(islandForLevel(nextLevel));
  const stops: number[] = [];
  for (let id = Math.max(1, nextLevel - 1); id <= TOTAL_LEVELS && stops.length < 3; id++) stops.push(id);

  useEffect(() => {
    if (!activeProfileId || !childName || !voiceEnabled) return;
    if (greetedId.current === activeProfileId) return;
    greetedId.current = activeProfileId;
    void speakKidPrompt("Hello. Let's play.", { lang: 'en', clipId: 'greet' });
  }, [activeProfileId, childName, voiceEnabled, language, t]);

  const explorer = childName ?? t('common.explorer');
  const play = () => navigation.navigate('Level', { levelId: nextLevel });

  return (
    <AnimatedBackground variant="forest">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
          <Stage>
            <View style={styles.topBar}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.brand}>{t('brand.name')}</Text>
                <Text style={styles.hello}>{t('home.hello', { name: explorer })}</Text>
                <Text style={styles.meta}>
                  {layer === 'young'
                    ? t('home.layerYoung')
                    : layer === 'path'
                      ? t('home.layerPath')
                      : t('home.layerExplorer')}
                </Text>
              </View>
              <View style={styles.topRight}>
                <BouncePress onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
                  <Text style={styles.settingsText}>{t('home.settings')}</Text>
                </BouncePress>
                {layer === 'young' ? null : <CoinBadge coins={coins} />}
                {premium ? (
                  <View style={styles.premPill}>
                    <Text style={styles.premText}>{t('home.premium')}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {saveIssue === 'write' ? (
              <Text style={styles.warn}>{t('settings.saveWriteWarning')}</Text>
            ) : null}
            {friendsIntro ? (
              <FadeInView style={styles.breakCard}>
                <Text style={styles.breakTitle}>{t('home.friendsTitle')}</Text>
                <Text style={styles.breakBody}>{t('home.friendsBody')}</Text>
                <PrimaryButton
                  label={t('home.friendsStart')}
                  onPress={() => {
                    dismissFriendsIntro();
                    navigation.navigate('Level', { levelId: nextLevel <= 8 ? nextLevel : 1 });
                  }}
                  style={{ marginTop: 12 }}
                />
                <PrimaryButton
                  label={t('home.friendsLater')}
                  tone="quiet"
                  large={false}
                  onPress={dismissFriendsIntro}
                  style={{ marginTop: 8 }}
                />
              </FadeInView>
            ) : null}
            {sessionLimit > 0 && sittingCount >= sessionLimit ? (
              <FadeInView style={styles.breakCard}>
                <Text style={styles.breakTitle}>{t('home.breakTitle')}</Text>
                <Text style={styles.breakBody}>{t('home.breakBody')}</Text>
                <PrimaryButton
                  label={t('home.breakContinue')}
                  tone="sky"
                  onPress={() => {
                    dismissSitting();
                    navigation.navigate('Level', { levelId: nextLevel });
                  }}
                  style={{ marginTop: 12 }}
                />
              </FadeInView>
            ) : null}

            {layer === 'young' ? (
              <FadeInView>
                <Text style={styles.youngTitle}>{t('home.heroYoung')}</Text>
                <View style={styles.portrait}>
                  <GroveMascot size={168} />
                </View>
                <Pulse>
                  <PrimaryButton label={t('home.play')} onPress={play} style={styles.play} />
                </Pulse>
                <View style={styles.pair}>
                  <BouncePress style={styles.pairBtn} onPress={() => navigation.navigate('WordAlbum')}>
                    <Text style={styles.pairText}>{t('home.albumShort')}</Text>
                  </BouncePress>
                  <BouncePress style={styles.pairBtn} onPress={() => navigation.navigate('PlayRoom')}>
                    <Text style={styles.pairText}>{t('home.roomShort')}</Text>
                  </BouncePress>
                </View>
              </FadeInView>
            ) : null}

            {layer === 'path' ? (
              <FadeInView style={styles.panel}>
                <Text style={styles.panelTitle}>{t('home.todayPath')}</Text>
                <Text style={styles.panelBody}>{t('home.goal', { place, n: nextLevel })}</Text>
                <View style={styles.stops}>
                  {stops.map((id) => {
                    const done = clearedLevelIds.includes(id);
                    const now = id === nextLevel;
                    return (
                      <View key={id} style={[styles.stop, now && styles.stopNow, done && styles.stopDone]}>
                        <Text style={[styles.stopText, now && styles.stopTextNow]}>
                          {done ? '✓ ' : ''}
                          {id}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <PrimaryButton label={t('home.continueAdventure')} onPress={play} />
              </FadeInView>
            ) : null}

            {layer === 'explorer' ? (
              <FadeInView style={styles.panel}>
                <View style={styles.journalRow}>
                  <GroveMascot size={88} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.panelKicker}>{t('home.layerExplorer')}</Text>
                    <Text style={styles.panelTitle}>{t('home.journal')}</Text>
                    <Text style={styles.panelBody}>{t('home.goal', { place, n: nextLevel })}</Text>
                    <Text style={styles.meta}>
                      {t('home.ageProgress', {
                        age: childAge ?? '',
                        cleared: clearedLevelIds.length,
                        total: TOTAL_LEVELS,
                      })}
                    </Text>
                  </View>
                </View>
                <PrimaryButton label={t('home.continueAdventure')} onPress={play} />
              </FadeInView>
            ) : null}

            {layer === 'young' ? (
              <View style={styles.quietRow}>
                <BouncePress onPress={() => navigation.navigate('Map')} style={styles.quietBtn}>
                  <Text style={styles.quietText}>{t('home.map')}</Text>
                </BouncePress>
                <BouncePress onPress={() => navigation.navigate('Shop')} style={styles.quietBtn}>
                  <Text style={styles.quietText}>{t('home.shop')}</Text>
                </BouncePress>
              </View>
            ) : (
              <View style={styles.secondary}>
                <PrimaryButton label={t('home.map')} tone="quiet" large={false} onPress={() => navigation.navigate('Map')} />
                <PrimaryButton
                  label={t('home.albumShort')}
                  tone="quiet"
                  large={false}
                  onPress={() => navigation.navigate('WordAlbum')}
                />
                <PrimaryButton
                  label={t('home.roomShort')}
                  tone="quiet"
                  large={false}
                  onPress={() => navigation.navigate('PlayRoom')}
                />
              </View>
            )}

            <BouncePress style={styles.privacyLink} onPress={() => navigation.navigate('Privacy')}>
              <Text style={styles.privacyText}>{t('home.privacy')}</Text>
            </BouncePress>
          </Stage>
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
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brand: { fontSize: 28, fontWeight: '800', color: colors.forestDeep, letterSpacing: -0.5 },
  hello: { marginTop: 4, fontSize: 18, fontWeight: '700', color: colors.forest },
  meta: { color: colors.muted, fontWeight: '600', marginTop: 2, fontSize: 14 },
  topRight: { alignItems: 'flex-end', gap: 6 },
  settingsBtn: {
    minWidth: 64,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: { fontSize: 15, fontWeight: '700', color: colors.forestDeep },
  premPill: {
    backgroundColor: colors.sun,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  premText: { fontWeight: '700', fontSize: 12, color: colors.forestDeep },
  youngTitle: {
    textAlign: 'center',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.forestDeep,
    marginTop: 8,
  },
  portrait: { alignItems: 'center', marginVertical: 4 },
  pair: { flexDirection: 'row', gap: 12, marginTop: 12, paddingHorizontal: 20 },
  pairBtn: {
    flex: 1,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(15,61,46,0.12)',
  },
  pairText: { fontSize: 18, fontWeight: '700', color: colors.forestDeep },
  panel: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 28,
    padding: 18,
  },
  panelKicker: { color: colors.forest, fontWeight: '700', fontSize: 14 },
  panelTitle: { fontSize: 26, fontWeight: '800', color: colors.forestDeep },
  panelBody: { marginTop: 4, marginBottom: 14, color: colors.muted, fontWeight: '600', fontSize: 16 },
  journalRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  stops: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stop: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNow: { backgroundColor: colors.forest },
  stopDone: { backgroundColor: colors.mint },
  play: { marginHorizontal: 20 },
  stopText: { fontWeight: '700', color: colors.forestDeep, fontSize: 16 },
  stopTextNow: { color: colors.white },
  secondary: { paddingHorizontal: 20, marginTop: 12, gap: 8 },
  quietRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
  quietBtn: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  quietText: { color: colors.forest, fontWeight: '700', fontSize: 16 },
  privacyLink: { alignSelf: 'center', marginTop: 12, padding: 12, minHeight: 44 },
  privacyText: { color: colors.muted, fontWeight: '600', fontSize: 14, textDecorationLine: 'underline' },
  warn: { marginHorizontal: 20, marginBottom: 8, color: colors.coralInk, fontWeight: '700' },
  breakCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
  },
  breakTitle: { fontSize: 18, fontWeight: '800', color: colors.forestDeep },
  breakBody: { marginTop: 4, color: colors.muted, fontWeight: '600' },
});
