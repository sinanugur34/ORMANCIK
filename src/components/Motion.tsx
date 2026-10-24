import React, { useEffect } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function FadeInView({
  children,
  delay = 0,
  from = 'up',
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: 'up' | 'down';
  style?: StyleProp<ViewStyle>;
}) {
  const entering = from === 'up' ? FadeInUp.delay(delay).springify() : FadeInDown.delay(delay).springify();
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

/** Web-safe pressable: native Pressable + animated wrapper (AnimatedPressable breaks clicks on RN Web). */
export function BouncePress({
  children,
  onPress,
  style,
  disabled,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={anim}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        }}
        onPress={onPress}
        style={({ pressed }) => [
          style,
          { cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : pressed ? 0.9 : 1 } as ViewStyle,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function Pulse({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withTiming(1.06, {
      duration: 900,
      easing: Easing.inOut(Easing.sin),
    });
    const id = setInterval(() => {
      s.value = withTiming(s.value > 1.03 ? 1 : 1.06, {
        duration: 900,
        easing: Easing.inOut(Easing.sin),
      });
    }, 900);
    return () => clearInterval(id);
  }, [s]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[anim, style]} pointerEvents="box-none">{children}</Animated.View>;
}
