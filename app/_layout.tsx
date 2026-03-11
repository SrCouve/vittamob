import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { BackgroundOrbs } from '../src/components/BackgroundOrbs';
import { useAuthStore } from '../src/stores/authStore';
import { useUserStore } from '../src/stores/userStore';
import { usePointsStore } from '../src/stores/pointsStore';

SplashScreen.preventAutoHideAsync();

const VittaTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FF6C24',
    background: 'transparent',
    card: 'transparent',
    text: '#FFFFFF',
    border: 'rgba(255,255,255,0.1)',
    notification: '#FF6C24',
  },
};

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { session, isInitialized, initialize } = useAuthStore();
  const { fetchProfile } = useUserStore();
  const { fetchBalance } = usePointsStore();

  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // Fetch profile + points when user logs in
  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id);
      fetchBalance(session.user.id);
    }
  }, [session?.user?.id]);

  // Hide splash when ready
  useEffect(() => {
    if (fontsLoaded && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitialized]);

  // Auth-based routing
  useEffect(() => {
    if (!isInitialized || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, isInitialized, fontsLoaded, segments]);

  if (!fontsLoaded || !isInitialized) return null;

  return (
    <ThemeProvider value={VittaTheme}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#0D0D0D', '#1A1008', '#181010', '#0D0D0D']}
          locations={[0, 0.4, 0.7, 1.0]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <BackgroundOrbs />
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade',
          }}
        />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
