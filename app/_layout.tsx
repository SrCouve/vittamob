import { useEffect, useState } from 'react';
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
import { SplashTransition } from '../src/components/SplashTransition';
import { useAuthStore } from '../src/stores/authStore';
import { useUserStore } from '../src/stores/userStore';
import { usePointsStore } from '../src/stores/pointsStore';
import { useStravaStore } from '../src/stores/stravaStore';
import {
  setupNotificationHandler,
  registerPushToken,
  onNotificationTap,
  clearBadge,
} from '../src/lib/notifications';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

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
  const { checkConnection } = useStravaStore();
  const [showSplash, setShowSplash] = useState(true);

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

  // Fetch profile + points + register push when user logs in
  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id);
      fetchBalance(session.user.id);
      checkConnection(session.user.id);
      registerPushToken(session.user.id);
      clearBadge();
    }
  }, [session?.user?.id]);

  // Handle notification taps → deep link
  useEffect(() => {
    const cleanup = onNotificationTap((data) => {
      if (data?.type === 'follow' && data?.follower_id) {
        router.push(`/user/${data.follower_id}` as any);
      } else if (data?.type === 'follow_request' && data?.requester_id) {
        router.push('/social/requests' as any);
      } else if (data?.type === 'follow_accepted' && data?.user_id) {
        router.push(`/user/${data.user_id}` as any);
      } else if (data?.type === 'friend' && data?.follower_id) {
        router.push(`/user/${data.follower_id}` as any);
      } else if (data?.type === 'mention' && data?.post_id) {
        router.push('/(tabs)/comunidade' as any);
      } else {
        router.push('/(tabs)/comunidade' as any);
      }
    });
    return cleanup;
  }, []);

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
        {showSplash && <SplashTransition onFinish={() => setShowSplash(false)} />}
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
