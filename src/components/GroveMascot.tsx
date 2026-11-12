import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const mascot = require('../../assets/art/mascot.jpg');

type Props = {
  size?: number;
  outfitEmoji?: string;
  petEmoji?: string;
  fxEmoji?: string | null;
  hatEmoji?: string;
};

export function GroveMascot({ size = 160, outfitEmoji, petEmoji, fxEmoji, hatEmoji }: Props) {
  const bob = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    bob.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    sway.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(4, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
          withTiming(-4, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [bob, sway]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }, { rotate: `${sway.value}deg` }],
  }));

  return (
    <View pointerEvents="none" style={{ width: size + 40, height: size + 40, alignItems: 'center', justifyContent: 'center' }}>
      {fxEmoji ? <Animated.Text style={[styles.fx, { fontSize: size * 0.22 }]}>{fxEmoji}</Animated.Text> : null}
      <Animated.View style={body}>
        <Image source={mascot} style={{ width: size, height: size, borderRadius: size / 2 }} />
        {hatEmoji ? <Animated.Text style={[styles.hat, { fontSize: size * 0.34 }]}>{hatEmoji}</Animated.Text> : null}
        {outfitEmoji ? <Animated.Text style={[styles.outfit, { fontSize: size * 0.28 }]}>{outfitEmoji}</Animated.Text> : null}
      </Animated.View>
      {petEmoji ? <Animated.Text style={[styles.pet, { fontSize: size * 0.32 }]}>{petEmoji}</Animated.Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hat: { position: 'absolute', top: -18, left: 0, right: 0, textAlign: 'center' },
  outfit: { position: 'absolute', top: -6, right: -4 },
  pet: { position: 'absolute', bottom: 0, left: 0 },
  fx: { position: 'absolute', top: 8, left: 8, opacity: 0.9 },
});
