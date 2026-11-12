import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CinematicIntro } from '../components/CinematicIntro';
import { BouncePress, FadeInView } from '../components/Motion';
import { ParentalGate } from '../components/ParentalGate';
import { PrimaryButton } from '../components/PrimaryButton';
import { useT } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { MAX_PROFILES, PROFILE_NAME_MAX, useGame } from '../store/GameContext';
import { ageToBand, colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

const BAND_IDS = [
  { id: '3-5' as const, ages: [3, 4, 5] },
  { id: '6-8' as const, ages: [6, 7, 8] },
  { id: '9-10' as const, ages: [9] },
];

export function ProfileSetupScreen({ navigation, route }: Props) {
  const t = useT();
  const { createProfile, profiles } = useGame();
  const mode = route.params?.mode ?? (profiles.length === 0 ? 'first' : 'add');
  const isAdd = mode === 'add';

  const [name, setName] = useState('');
  const [age, setAge] = useState(5);
  const [gate, setGate] = useState(false);
  const [introDone, setIntroDone] = useState(isAdd);
  const { height } = useWindowDimensions();
  const heroH = Math.min(height * 0.28, 220);
  const band = ageToBand(age);

  const nameOk = name.trim().length > 0;
  const canAdd = profiles.length < MAX_PROFILES;
  const canSubmit = nameOk && (isAdd ? canAdd : true);

  const title = useMemo(
    () => (isAdd ? t('profile.titleAdd') : t('profile.titleFirst')),
    [isAdd, t],
  );

  const bands = useMemo(
    () =>
      BAND_IDS.map((b) => ({
        ...b,
        title: t(`profile.band.${b.id}.title`),
        hint: t(`profile.band.${b.id}.hint`),
      })),
    [t],
  );

  const confirm = () => {
    const created = createProfile(name, age);
    if (!created) return;
    if (isAdd) {
      navigation.goBack();
    } else {
      navigation.replace('Home');
    }
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
            <Text style={styles.brand}>{t('brand.name')}</Text>
            <Text style={styles.tagline}>
              {isAdd ? t('profile.taglineAdd') : t('profile.taglineFirst')}
            </Text>
          </FadeInView>
        </SafeAreaView>
      </ImageBackground>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeInView delay={80}>
          <Text style={styles.label}>{title}</Text>
          <Text style={styles.hint}>{t('profile.hint')}</Text>
        </FadeInView>

        <Text style={styles.fieldLabel}>{t('profile.nameLabel')}</Text>
        <TextInput
          value={name}
          onChangeText={(txt) => setName(txt.slice(0, PROFILE_NAME_MAX))}
          placeholder={t('profile.namePlaceholder')}
          placeholderTextColor={colors.muted}
          style={styles.nameInput}
          maxLength={PROFILE_NAME_MAX}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
        <Text style={styles.charCount}>
          {name.trim().length}/{PROFILE_NAME_MAX}
        </Text>

        <Text style={[styles.fieldLabel, { marginTop: 8 }]}>{t('profile.ageLabel')}</Text>
        <View style={styles.bandCol}>
          {bands.map((b) => {
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

        {isAdd && !canAdd ? (
          <Text style={styles.warn}>{t('profile.warnMax', { n: MAX_PROFILES })}</Text>
        ) : null}

        <View style={styles.actions}>
          {isAdd ? (
            <PrimaryButton
              label={t('common.cancel')}
              tone="coral"
              large={false}
              onPress={() => navigation.goBack()}
              style={{ flex: 1 }}
            />
          ) : null}
          <PrimaryButton
            label={isAdd ? t('profile.save') : t('common.start')}
            onPress={() => setGate(true)}
            disabled={!canSubmit}
            style={{ flex: 1, marginTop: isAdd ? 0 : 8 }}
          />
        </View>
      </ScrollView>

      <ParentalGate
        visible={gate}
        title={isAdd ? t('profile.gateAdd') : t('profile.gateFirst')}
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
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
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
  fieldLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forestDeep,
    marginBottom: 8,
  },
  nameInput: {
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(27,122,74,0.18)',
    paddingHorizontal: 18,
    fontSize: 22,
    fontWeight: '800',
    color: colors.forestDeep,
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
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
  warn: {
    color: colors.coralInk,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4, alignItems: 'stretch' },
});
