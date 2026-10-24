import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type Tone = 'info' | 'warn' | 'ok' | 'error';

const tones: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: 'rgba(78,205,196,0.22)', fg: colors.forestDeep },
  warn: { bg: 'rgba(255,200,87,0.35)', fg: colors.forestDeep },
  ok: { bg: 'rgba(168,230,207,0.55)', fg: colors.forestDeep },
  error: { bg: 'rgba(255,107,107,0.25)', fg: colors.berry },
};

export function StatusBanner({
  message,
  tone = 'info',
  style,
}: {
  message: string;
  tone?: Tone;
  style?: ViewStyle;
}) {
  if (!message) return null;
  const t = tones[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: {
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
