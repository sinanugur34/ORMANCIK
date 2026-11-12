import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { speakKidPrompt, type SpeakOptions } from '../audio/speakPrompt';
import { getLanguage, useT } from '../i18n';
import type { Language } from '../i18n';
import { colors } from '../theme/colors';

type Props = {
  text: string;
  clipId?: string;
  lang?: Language;
};

export function ListenBar({ text, clipId, lang }: Props) {
  const t = useT();
  const speak = (slow: boolean) => {
    const options: SpeakOptions = { lang: lang ?? getLanguage(), clipId, slow };
    void speakKidPrompt(text, options);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('level.replay')}
        onPress={() => speak(false)}
        style={styles.btn}
      >
        <Text style={styles.label}>{t('level.replay')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('level.slow')}
        onPress={() => speak(true)}
        style={styles.btn}
      >
        <Text style={styles.label}>{t('level.slow')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  btn: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontWeight: '800', color: colors.forestDeep, fontSize: 15 },
});
