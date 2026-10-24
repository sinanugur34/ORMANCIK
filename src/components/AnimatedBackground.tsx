import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

type Blob = { size: number; left: number; top: number; color: string; delay: number };

const BLOBS: Blob[] = [
  { size: 180, left: -40, top: 40, color: 'rgba(255,107,107,0.28)', delay: 0 },
  { size: 220, left: 220, top: 120, color: 'rgba(78,205,196,0.26)', delay: 400 },
  { size: 160, left: 40, top: 420, color: 'rgba(255,200,87,0.22)', delay: 800 },
  { size: 200, left: 180, top: 560, color: 'rgba(108,92,231,0.2)', delay: 200 },
];

function FloatingBlob({ size, left, top, color, delay }: Blob) {
  const y = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withTiming(-28, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1.12, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [delay, scale, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.blob,
        { width: size, height: size, borderRadius: size / 2, left, top, backgroundColor: color },
        style,
      ]}
    />
  );
}

function Sparkle({ left, top, delay }: { left: number; top: number; delay: number }) {
  const o = useSharedValue(0.2);
  useEffect(() => {
    o.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [delay, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.Text style={[styles.sparkle, { left, top }, style]}>✦</Animated.Text>;
}

type Props = {
  children?: React.ReactNode;
  variant?: 'forest' | 'sunset' | 'ocean';
};

const GRADIENTS = {
  forest: [colors.mint, '#E8FFF5', colors.cream] as const,
  sunset: ['#FFE0C2', '#FFD6E0', colors.cream] as const,
  ocean: ['#C9F0FF', '#E8FFF8', colors.cream] as const,
};

export function AnimatedBackground({ children, variant = 'forest' }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={[...GRADIENTS[variant]]} style={StyleSheet.absoluteFill} />
      {BLOBS.map((b, i) => (
        <FloatingBlob key={i} {...b} />
      ))}
      <Sparkle left={40} top={90} delay={0} />
      <Sparkle left={280} top={160} delay={500} />
      <Sparkle left={120} top={300} delay={900} />
      <Sparkle left={250} top={480} delay={300} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute' },
  sparkle: {
    position: 'absolute',
    fontSize: 18,
    color: colors.sun,
  },
});
