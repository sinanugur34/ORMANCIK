import React, { useEffect } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    <Animated.View entering={entering} exiting={FadeOut} style={style}>
      {children}
    </Animated.View>
  );
}

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
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.94, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      onPress={onPress}
      style={[anim, style]}
    >
      {children}
    </AnimatedPressable>
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
  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}
