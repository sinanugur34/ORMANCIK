import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'sun' | 'coral' | 'sky' | 'quiet';
  style?: ViewStyle;
  disabled?: boolean;
  /** Larger kid-friendly CTA (default true for primary actions). */
  large?: boolean;
};

const tones = {
  primary: colors.forest,
  sun: colors.sun,
  coral: colors.coralStrong,
  sky: colors.sky,
  quiet: colors.white,
};

const labelColors = {
  primary: colors.white,
  sun: colors.forestDeep,
  coral: colors.white,
  sky: colors.forestDeep,
  quiet: colors.forestDeep,
};

export function PrimaryButton({
  label,
  onPress,
  tone = 'primary',
  style,
  disabled,
  large = true,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        large ? styles.btnLarge : styles.btnCompact,
        tone === 'quiet' && styles.quiet,
        {
          backgroundColor: tones[tone],
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          cursor: disabled ? 'default' : 'pointer',
        } as object,
        style,
      ]}
    >
      <Text style={[styles.label, large && styles.labelLarge, { color: labelColors[tone] }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  btnLarge: {
    paddingVertical: 18,
    paddingHorizontal: 26,
    minHeight: 64,
    borderRadius: 24,
  },
  btnCompact: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  label: {
    fontWeight: '800',
    fontSize: 17,
  },
  labelLarge: {
    fontSize: 22,
    letterSpacing: 0.2,
  },
  quiet: {
    borderWidth: 2,
    borderColor: 'rgba(15,61,46,0.18)',
  },
});
