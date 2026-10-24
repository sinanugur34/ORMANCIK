import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ImageBackground,
  ScrollView,
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
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AgeSetup'>;

const AGES = [3, 4, 5, 6, 7, 8, 9, 10];

export function AgeSetupScreen({ navigation }: Props) {
  const { setChildAge } = useGame();
  const [age, setAge] = useState(5);
  const [gate, setGate] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const { height } = useWindowDimensions();

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
        style={{ height: height * 0.48 }}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(15,61,46,0.1)', 'rgba(15,61,46,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.heroSafe}>
          <FadeInView>
            <Text style={styles.brand}>Tiny Grove</Text>
            <Text style={styles.tagline}>Renkli bir dünya, senin yaşında</Text>
          </FadeInView>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.sheetInner} showsVerticalScrollIndicator={false}>
          <FadeInView delay={120}>
            <Text style={styles.label}>Ebeveyn · çocuğun yaşı</Text>
            <Text style={styles.hint}>İçerik ve zorluk bu yaşa göre güncellenir.</Text>
          </FadeInView>

          <View style={styles.grid}>
            {AGES.map((a, i) => {
              const active = a === age;
              return (
                <FadeInView key={a} delay={80 + i * 40} style={styles.cell}>
                  <BouncePress onPress={() => setAge(a)} style={[styles.age, active && styles.ageOn]}>
                    <Text style={[styles.ageText, active && styles.ageTextOn]}>{a}</Text>
                  </BouncePress>
                </FadeInView>
              );
            })}
          </View>

          <PrimaryButton label="Başla" onPress={() => setGate(true)} style={{ marginTop: 8 }} />
        </ScrollView>
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
  heroSafe: { flex: 1, justifyContent: 'flex-end', padding: 24, paddingBottom: 36 },
  brand: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 17,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
  },
  sheetInner: { padding: 24, paddingBottom: 40 },
  label: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.forestDeep,
  },
  hint: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  cell: { width: '22%' },
  age: {
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(27,122,74,0.12)',
  },
  ageOn: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
    transform: [{ scale: 1.04 }],
  },
  ageText: { fontSize: 22, fontWeight: '800', color: colors.forestDeep },
  ageTextOn: { color: colors.white },
});
