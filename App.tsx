import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStackParamList } from './src/navigation/types';
import { AgeSetupScreen } from './src/screens/AgeSetupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LevelScreen } from './src/screens/LevelScreen';
import { MapScreen } from './src/screens/MapScreen';
import { PlayRoomScreen } from './src/screens/PlayRoomScreen';
import { PremiumScreen } from './src/screens/PremiumScreen';
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
  const { ready, childAge } = useGame();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator size="large" color={colors.forest} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={childAge == null ? 'AgeSetup' : 'Home'}
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="AgeSetup" component={AgeSetupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Map" component={MapScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Level" component={LevelScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="PlayRoom" component={PlayRoomScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="Shop" component={ShopScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Premium" component={PremiumScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <RootNav />
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
