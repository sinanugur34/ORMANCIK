import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

const SPARKLE_COLORS = [colors.sun, colors.coral, colors.mint, colors.sky, colors.peach, colors.leaf];

type ParticleProps = {
  index: number;
  active: boolean;
  tone: 'good' | 'bad';
};

function Particle({ index, active, tone }: ParticleProps) {
  const progress = useSharedValue(0);
  const angle = ((index * 47) % 360) * (Math.PI / 180);
  const dist = 36 + (index % 5) * 14;
  const size = 8 + (index % 3) * 3;
  const color =
    tone === 'bad' ? colors.coral : SPARKLE_COLORS[index % SPARKLE_COLORS.length];

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      index * 18,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
    );
  }, [active, index, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const x = Math.cos(angle) * dist * p;
    const y = Math.sin(angle) * dist * p - 12 * p;
    return {
      opacity: p < 0.15 ? p * 6 : 1 - (p - 0.15) * 1.15,
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: 0.4 + p * 1.1 },
        { rotate: `${p * 120}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

type Props = {
  active: boolean;
  tone?: 'good' | 'bad';
  count?: number;
};

/** Soft sparkle / confetti burst for correct/wrong feedback (no emoji). */
export function SparkleBurst({ active, tone = 'good', count = 12 }: Props) {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {particles.map((i) => (
        <Particle key={i} index={i} active={active} tone={tone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  dot: {
    position: 'absolute',
  },
});
