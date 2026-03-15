import { Platform } from 'react-native';
import { supabase } from './supabase';

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let Constants: typeof import('expo-constants') | null = null;

try { Notifications = require('expo-notifications'); } catch {}
try { Device = require('expo-device'); } catch {}
try { Constants = require('expo-constants'); } catch {}

const PROJECT_ID = 'af4b0142-d6fb-4393-a5db-b9b591984053';

// Configure how notifications appear when app is in foreground
export function setupNotificationHandler() {
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Register for push notifications and save token to Supabase
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!Notifications || !Device || Platform.OS === 'web') return null;

  // Physical device only
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Check permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  // Get token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
    });
    const token = tokenData.data;

    // Save to Supabase
    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    return token;
  } catch (e) {
    console.warn('Failed to get push token:', e);
    return null;
  }
}

// Clear push token on logout
export async function clearPushToken(userId: string) {
  await supabase
    .from('profiles')
    .update({ expo_push_token: null })
    .eq('id', userId);
}

// Clear badge count
export async function clearBadge() {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch {}
}

// Mark notification as read
export async function markAsRead(notificationId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
}

// Mark all as read
export async function markAllAsRead(userId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  await clearBadge();
}

// Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count ?? 0;
}

// Listen for notification taps — returns cleanup function
export function onNotificationTap(callback: (data: Record<string, any>) => void): () => void {
  if (!Notifications) return () => {};

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data) callback(data as Record<string, any>);
  });

  return () => sub.remove();
}

// Listen for foreground notifications — returns cleanup function
export function onNotificationReceived(callback: (title: string, body: string, data: Record<string, any>) => void): () => void {
  if (!Notifications) return () => {};

  const sub = Notifications.addNotificationReceivedListener((notification) => {
    const { title, body, data } = notification.request.content;
    callback(title ?? '', body ?? '', (data ?? {}) as Record<string, any>);
  });

  return () => sub.remove();
}
