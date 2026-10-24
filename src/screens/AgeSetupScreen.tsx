import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CinematicIntro } from '../components/CinematicIntro';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { ageToBand, colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AgeSetup'>;

const BANDS: { id: '3-5' | '6-8' | '9-10'; title: string; hint: string; ages: number[] }[] = [
  { id: '3-5', title: 'Küçük kaşif', hint: 'Büyük düğmeler · az seçenek', ages: [3, 4, 5] },
  { id: '6-8', title: 'Orman gezgini', hint: 'Orta zorluk · daha çok oyun', ages: [6, 7, 8] },
  { id: '9-10', title: 'Koru ustası', hint: 'Daha zor · zamanlı turlar', ages: [9, 10] },
];

export function AgeSetupScreen({ navigation }: Props) {
  const { setChildAge } = useGame();
  const [age, setAge] = useState(5);
  const [gate, setGate] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const { height } = useWindowDimensions();
  const heroH = Math.min(height * 0.34, 260);
  const band = ageToBand(age);

  const confirm = () => {
    setChildAge(age);
    navigation.replace('Home');
  };

  if (!introDone) {
    return <CinematicIntro onDone={() => setIntroDone(true)} />;
  }

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../../assets/art/hero-grove.jpg')}
        style={{ height: heroH }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(15,61,46,0.1)', 'rgba(15,61,46,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.heroSafe}>
          <FadeInView>
            <Text style={styles.brand}>Tiny Grove</Text>
            <Text style={styles.tagline}>Yaşına göre yumuşak bir macera</Text>
          </FadeInView>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.sheet}>
        <FadeInView delay={80}>
          <Text style={styles.label}>Ebeveyn · çocuğun yaşı</Text>
          <Text style={styles.hint}>Gruba göre büyük düğmeler ve zorluk ayarlanır.</Text>
        </FadeInView>

        <View style={styles.bandCol}>
          {BANDS.map((b) => {
            const active = band === b.id;
            return (
              <View key={b.id} style={[styles.bandCard, active && styles.bandCardOn]}>
                <Text style={styles.bandTitle}>{b.title}</Text>
                <Text style={[styles.bandHint, active && styles.bandHintOn]}>{b.hint}</Text>
                <View style={styles.ageRow}>
                  {b.ages.map((a) => {
                    const on = a === age;
                    return (
                      <BouncePress
                        key={a}
                        onPress={() => setAge(a)}
                        style={[styles.age, on && styles.ageOn]}
                      >
                        <Text style={[styles.ageText, on && styles.ageTextOn]}>{a}</Text>
                      </BouncePress>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        <PrimaryButton label="Başla" onPress={() => setGate(true)} style={{ marginTop: 8 }} />
      </View>

      <ParentalGate
        visible={gate}
        title="Yaşı kaydetmek için onay"
        onCancel={() => setGate(false)}
        onSuccess={() => {
          setGate(false);
          confirm();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  heroSafe: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 28 },
  brand: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 16,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  sheet: {
    flex: 1,
    marginTop: -24,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  label: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.forestDeep,
  },
  hint: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    marginBottom: 14,
  },
  bandCol: { gap: 12, marginBottom: 12 },
  bandCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(27,122,74,0.1)',
  },
  bandCardOn: {
    borderColor: colors.forest,
    backgroundColor: 'rgba(168,230,207,0.35)',
  },
  bandTitle: { fontSize: 17, fontWeight: '900', color: colors.forestDeep },
  bandHint: { marginTop: 2, marginBottom: 12, fontSize: 13, color: colors.muted, fontWeight: '600' },
  bandHintOn: { color: colors.forest },
  ageRow: { flexDirection: 'row', gap: 10 },
  age: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(27,122,74,0.12)',
  },
  ageOn: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  ageText: { fontSize: 22, fontWeight: '800', color: colors.forestDeep },
  ageTextOn: { color: colors.white },
});
