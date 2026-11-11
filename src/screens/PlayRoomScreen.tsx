import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { speakKidPrompt } from '../audio/speakPrompt';
import { GroveMascot } from '../components/GroveMascot';
import { ListenBar } from '../components/ListenBar';
import { BouncePress, FadeInView } from '../components/Motion';
import { PrimaryButton } from '../components/PrimaryButton';
import { COSMETICS } from '../data/cosmetics';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PlayRoom'>;

const ROOM_ART: Record<string, number> = {
  'room-meadow': require('../../assets/art/room-meadow.jpg'),
  'room-treehouse': require('../../assets/art/room-meadow.jpg'),
  'room-undersea': require('../../assets/art/room-undersea.jpg'),
  'room-night': require('../../assets/art/room-night.jpg'),
};

export function PlayRoomScreen({ navigation }: Props) {
  const t = useT();
  const { equipped, ownedCosmeticIds, premium, equipCosmetic } = useGame();

  const outfit = COSMETICS.find((c) => c.id === equipped.outfit);
  const pet = COSMETICS.find((c) => c.id === equipped.pet);
  const fx = equipped.fx ? COSMETICS.find((c) => c.id === equipped.fx) : null;
  const roomArt = ROOM_ART[equipped.room] ?? ROOM_ART['room-meadow'];
  const treehouse = equipped.room === 'room-treehouse';
  const [hatOn, setHatOn] = useState(false);

  useEffect(() => {
    void speakKidPrompt('Put on the hat.', { lang: 'en', clipId: 'room-hat' });
  }, []);

  const ownedOutfits = useMemo(
    () =>
      COSMETICS.filter(
        (c) => c.kind === 'outfit' && (premium || ownedCosmeticIds.includes(c.id)),
      ),
    [ownedCosmeticIds, premium],
  );

  return (
    <View style={styles.root}>
      <ImageBackground source={roomArt} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={
            treehouse
              ? ['rgba(92,58,26,0.45)', 'rgba(47,27,12,0.72)']
              : ['rgba(15,61,46,0.25)', 'rgba(15,61,46,0.55)']
          }
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.safe}>
          <View style={styles.top}>
            <BouncePress onPress={() => navigation.goBack()} style={styles.back}>
              <Text style={styles.backText}>←</Text>
            </BouncePress>
            <Text style={styles.title}>{t('playRoom.title')}</Text>
            <BouncePress onPress={() => navigation.navigate('Shop')} style={styles.back}>
              <Text style={{ fontSize: 18 }}>🛍️</Text>
            </BouncePress>
          </View>

          <FadeInView style={styles.stage}>
            <GroveMascot
              size={180}
              outfitEmoji={outfit?.emoji}
              petEmoji={pet?.emoji}
              fxEmoji={fx?.emoji}
            />
            <Text style={styles.caption}>{hatOn ? t('playRoom.taskDone') : t('playRoom.task')}</Text>
            <ListenBar text="Put on the hat." clipId="room-hat" lang="en" />
          </FadeInView>

          <View style={styles.tray}>
            <Text style={styles.trayLabel}>{t('playRoom.outfits')}</Text>
            {ownedOutfits.length === 0 ? (
              <Text style={styles.empty}>{t('playRoom.empty')}</Text>
            ) : (
              <View style={styles.trayRow}>
                {ownedOutfits.map((c) => (
                  <BouncePress
                    key={c.id}
                    onPress={() => {
                      equipCosmetic(c.id);
                      setHatOn(c.id === 'outfit-leaf');
                    }}
                    style={[styles.chip, equipped.outfit === c.id && styles.chipOn]}
                  >
                    <Text style={styles.chipEmoji}>{c.emoji}</Text>
                  </BouncePress>
                ))}
              </View>
            )}
            <PrimaryButton
              label={t('playRoom.goShop')}
              tone="coral"
              style={{ marginTop: 14 }}
              onPress={() => navigation.navigate('Shop')}
            />
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forestDeep },
  bg: { flex: 1 },
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '800', color: colors.forestDeep },
  title: { color: colors.white, fontSize: 22, fontWeight: '900' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  caption: {
    marginTop: 8,
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 8,
  },
  tray: {
    margin: 16,
    backgroundColor: 'rgba(255,246,232,0.95)',
    borderRadius: 28,
    padding: 18,
  },
  trayLabel: { fontWeight: '800', color: colors.forestDeep, marginBottom: 10 },
  empty: { color: colors.muted, fontWeight: '600', marginBottom: 4 },
  trayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.forest },
  chipEmoji: { fontSize: 26 },
});
