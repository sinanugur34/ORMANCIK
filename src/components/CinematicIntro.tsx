import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';

const FRAMES = [
  { src: require('../../assets/art/hero-grove.jpg'), line: 'Bir koru uyanıyor…' },
  { src: require('../../assets/art/world-map.jpg'), line: 'Adalar seni çağırıyor' },
  { src: require('../../assets/art/mascot.jpg'), line: 'Dostun hazır!' },
];

type Props = {
  onDone: () => void;
};

/** Short animated “trailer” using crossfading key art (premium feel without a video file). */
export function CinematicIntro({ onDone }: Props) {
  const [frame, setFrame] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: FRAMES.length * 1600 });
    const timers = FRAMES.map((_, i) =>
      setTimeout(() => {
        if (i < FRAMES.length - 1) setFrame(i + 1);
        else setTimeout(onDone, 700);
      }, (i + 1) * 1600),
    );
    return () => timers.forEach(clearTimeout);
  }, [onDone, progress]);

  const bar = useAnimatedStyle(() => ({
    width: `${Math.max(8, progress.value * 100)}%`,
  }));

  const current = FRAMES[frame];

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
        <Text style={styles.brand}>Tiny Grove</Text>
        <Animated.Text key={`l-${frame}`} entering={FadeIn} style={styles.line}>
          {current.line}
        </Animated.Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
        <Pressable accessibilityRole="button" onPress={onDone} style={styles.skip}>
          <Text style={styles.skipText}>Atla →</Text>
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});
