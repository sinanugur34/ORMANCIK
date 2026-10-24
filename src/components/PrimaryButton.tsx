import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'sun' | 'coral' | 'sky';
  style?: ViewStyle;
  disabled?: boolean;
};

const tones = {
  primary: colors.forest,
  sun: colors.sun,
  coral: colors.coral,
  sky: colors.sky,
};

export function PrimaryButton({
  label,
  onPress,
  tone = 'primary',
  style,
  disabled,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: tones[tone],
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1,
          cursor: disabled ? 'default' : 'pointer',
        } as object,
        style,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 20,
    alignItems: 'center',
  },
  label: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 17,
  },
});
