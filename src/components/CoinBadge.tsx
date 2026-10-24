import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function CoinBadge({ coins }: { coins: number }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🪙</Text>
      <Text style={styles.value}>{coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  icon: { fontSize: 16 },
  value: {
    fontWeight: '800',
    color: colors.forestDeep,
    fontSize: 16,
  },
});
