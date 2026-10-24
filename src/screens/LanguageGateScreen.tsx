import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BouncePress, FadeInView } from '../components/Motion';
import { tFor, type Language } from '../i18n';
import { RootStackParamList } from '../navigation/types';
import { useGame } from '../store/GameContext';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'LanguageGate'>;

/**
 * First-entry language pick for Turkish-system devices only.
 * Shown before ProfileSetup; bilingual so both options are readable.
 */
export function LanguageGateScreen({ navigation }: Props) {
  const { chooseLanguage, activeProfile } = useGame();

  const pick = (lang: Language) => {
    chooseLanguage(lang);
    if (activeProfile == null) {
      navigation.replace('ProfileSetup');
    } else {
      navigation.replace('Home');
    }
  };

  return (
    <LinearGradient colors={['#E8F8EF', colors.cream, '#FFF0D6']} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <FadeInView style={styles.header}>
          <Text style={styles.brand}>{tFor('tr', 'common.brand')}</Text>
          <Text style={styles.prompt}>{tFor('tr', 'langGate.prompt')}</Text>
        </FadeInView>

        <View style={styles.actions}>
          <BouncePress onPress={() => pick('tr')} style={[styles.btn, styles.btnTr]}>
            <Text style={styles.btnText}>{tFor('tr', 'langGate.tr')}</Text>
          </BouncePress>
          <BouncePress onPress={() => pick('en')} style={[styles.btn, styles.btnEn]}>
            <Text style={[styles.btnText, styles.btnTextEn]}>{tFor('en', 'langGate.en')}</Text>
          </BouncePress>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 36,
  },
  header: { alignItems: 'center', gap: 14 },
  brand: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.forestDeep,
    letterSpacing: 0.5,
  },
  prompt: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.forest,
    textAlign: 'center',
  },
  actions: { gap: 16 },
  btn: {
    minHeight: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  btnTr: { backgroundColor: colors.forest },
  btnEn: { backgroundColor: colors.sun },
  btnText: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.white,
  },
  btnTextEn: { color: colors.forestDeep },
});
