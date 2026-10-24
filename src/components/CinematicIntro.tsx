import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useT } from '../i18n';
import { colors } from '../theme/colors';

const FRAME_SRCS = [
  require('../../assets/art/hero-grove.jpg'),
  require('../../assets/art/world-map.jpg'),
  require('../../assets/art/mascot.jpg'),
] as const;

const FRAME_KEYS = ['intro.frame1', 'intro.frame2', 'intro.frame3'] as const;

type Props = {
  onDone: () => void;
};

/** Short animated “trailer” using crossfading key art (premium feel without a video file). */
export function CinematicIntro({ onDone }: Props) {
  const t = useT();
  const [frame, setFrame] = useState(0);
  const progress = useSharedValue(0);

  const frames = useMemo(
    () =>
      FRAME_SRCS.map((src, i) => ({
        src,
        line: t(FRAME_KEYS[i]!),
      })),
    [t],
  );

  useEffect(() => {
    progress.value = withTiming(1, { duration: frames.length * 1600 });
    const timers = frames.map((_, i) =>
      setTimeout(() => {
        if (i < frames.length - 1) setFrame(i + 1);
        else setTimeout(onDone, 700);
      }, (i + 1) * 1600),
    );
    return () => timers.forEach(clearTimeout);
  }, [onDone, progress, frames.length]);

  const bar = useAnimatedStyle(() => ({
    width: `${Math.max(8, progress.value * 100)}%`,
  }));

  const current = frames[frame]!;

  return (
    <View style={styles.root}>
      <Animated.View
        key={frame}
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(400)}
        style={StyleSheet.absoluteFill}
      >
        <Image source={current.src} style={styles.image} resizeMode="cover" />
      </Animated.View>
      <LinearGradient
        colors={['transparent', 'rgba(15,61,46,0.85)']}
        style={styles.grad}
      />
      <View style={styles.copy}>
        <Text style={styles.brand}>{t('brand.name')}</Text>
        <Animated.Text key={`l-${frame}`} entering={FadeIn} style={styles.line}>
          {current.line}
        </Animated.Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
        <Pressable accessibilityRole="button" onPress={onDone} style={styles.skip}>
          <Text style={styles.skipText}>{t('intro.skip')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forestDeep },
  image: { width: '100%', height: '100%' },
  grad: { ...StyleSheet.absoluteFill, top: '40%' },
  copy: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 64,
  },
  brand: {
    color: colors.sun,
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  line: {
    marginTop: 10,
    color: colors.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  track: {
    marginTop: 22,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.sun,
    borderRadius: 999,
  },
  skip: {
    alignSelf: 'flex-end',
    marginTop: 18,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
  },
  skipText: { color: colors.white, fontWeight: '800', fontSize: 17 },
});
