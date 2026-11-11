import React from 'react';
import { StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native';

/** Keeps a phone layout from stretching across a tablet. */
export function Stage({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  return (
    <View style={[{ width: '100%', maxWidth: width >= 720 ? 680 : undefined, alignSelf: 'center' }, style]}>
      {children}
    </View>
  );
}
