import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const hero = require('../../assets/art/hero-grove.jpg');

/** Ken Burns + soft vignette — living poster feel without a video file. */
export function CinematicHero({ height = 420 }: { height?: number }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [t]);

  const imageStyle = useAnimatedStyle(() => {
    const scale = interpolate(t.value, [0, 1], [1.08, 1.18]);
    const tx = interpolate(t.value, [0, 1], [-8, 10]);
    const ty = interpolate(t.value, [0, 1], [0, -14]);
    return { transform: [{ scale }, { translateX: tx }, { translateY: ty }] };
  });

  return (
    <View style={[styles.wrap, { height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, imageStyle]}>
        <Image source={hero} style={styles.image} resizeMode="cover" />
      </Animated.View>
      <LinearGradient
        colors={['transparent', 'rgba(15,61,46,0.15)', 'rgba(15,61,46,0.72)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.shine} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  image: { width: '100%', height: '100%' },
  shine: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
