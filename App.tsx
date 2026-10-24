import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/navigation/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelScreen } from './src/screens/LevelScreen';
import { MapScreen } from './src/screens/MapScreen';
import { PlayRoomScreen } from './src/screens/PlayRoomScreen';
import { PremiumScreen } from './src/screens/PremiumScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { ProfileSetupScreen } from './src/screens/ProfileSetupScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ShopScreen } from './src/screens/ShopScreen';
import { GameProvider, useGame } from './src/store/GameContext';
import { colors } from './src/theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.cream,
    card: colors.cream,
    text: colors.forestDeep,
    primary: colors.forest,
    border: 'transparent',
  },
};

function RootNav() {
  const { ready, activeProfile } = useGame();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.cream,
          gap: 16,
          padding: 32,
        }}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            backgroundColor: colors.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={colors.forest} />
        </View>
        <Text style={{ color: colors.forestDeep, fontWeight: '900', fontSize: 22 }}>Ormancık</Text>
        <Text style={{ color: colors.muted, fontWeight: '600', textAlign: 'center' }}>
          Orman hazırlanıyor…
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={activeProfile == null ? 'ProfileSetup' : 'Home'}
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Map" component={MapScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Level" component={LevelScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="PlayRoom" component={PlayRoomScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Shop" component={ShopScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Premium" component={PremiumScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'Ormancık';
    }
  }, []);

  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer
          theme={navTheme}
          documentTitle={{ enabled: true, formatter: () => 'Ormancık' }}
        >
          <StatusBar style="dark" />
          <RootNav />
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
