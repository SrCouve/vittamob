import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle, Polyline, Line } from 'react-native-svg';
import { router } from 'expo-router';
import { GlassCard } from '../../src/components/GlassCard';
import { Logo } from '../../src/components/Logo';
import { FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/stores/authStore';
import { useUserStore } from '../../src/stores/userStore';
import { usePointsStore } from '../../src/stores/pointsStore';

// Icons
function SettingsIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

function LogOutIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Polyline points="16 17 21 12 16 7" />
      <Line x1="21" y1="12" x2="9" y2="12" />
    </Svg>
  );
}

function BookOpenIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </Svg>
  );
}

function ClockIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round">
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function AwardIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FF6C24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="8" r="6" />
      <Path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </Svg>
  );
}

function ChevronRight({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeLinecap="round">
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

const menuItems = [
  'Editar perfil',
  'Notificações',
  'Assinatura',
  'Ajuda & Suporte',
  'Termos de Uso',
];

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthStore();
  const { profile } = useUserStore();
  const { balance } = usePointsStore();

  const displayName = profile?.name ?? 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();
  const totalLessons = profile?.total_lessons?.toString() ?? '0';
  const totalHours = profile?.total_hours?.toString() ?? '0';
  const streakDays = profile?.streak_days ? `${profile.streak_days} dias` : '0';

  const stats = [
    { label: 'Aulas', value: totalLessons, Icon: BookOpenIcon },
    { label: 'Horas', value: totalHours, Icon: ClockIcon },
    { label: 'Streak', value: streakDays, Icon: AwardIcon },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: () => signOut() },
      ]
    );
  };

  // Format join date
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    : '';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={styles.pageTitle}>Perfil</Text>
        <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
          <SettingsIcon />
        </TouchableOpacity>
      </Animated.View>

      {/* Avatar & Info */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)} style={styles.avatarSection}>
        <View style={styles.avatarWrap}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          ) : (
            <>
              <LinearGradient colors={['#FF6C24', '#FFAC7D']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={styles.avatarText}>{initial}</Text>
            </>
          )}
        </View>
        <Text style={styles.userName}>{displayName}</Text>
        {joinDate ? <Text style={styles.userSince}>Membro desde {joinDate}</Text> : null}
        {balance > 0 && (
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>{balance.toLocaleString()} pts</Text>
          </View>
        )}
      </Animated.View>

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statsRow}>
        {stats.map((stat) => {
          const { Icon } = stat;
          return (
            <GlassCard key={stat.label} style={styles.statCard}>
              <View style={styles.statContent}>
                <Icon size={20} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            </GlassCard>
          );
        })}
      </Animated.View>

      {/* Subscription tier */}
      {profile?.subscription_tier && profile.subscription_tier !== 'free' && (
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={{ marginBottom: 24 }}>
          <GlassCard style={styles.tierCard}>
            <LinearGradient
              colors={['rgba(255,108,36,0.15)', 'rgba(255,108,36,0.05)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Text style={styles.tierLabel}>Plano</Text>
            <Text style={styles.tierValue}>VITTA {profile.subscription_tier.toUpperCase()}</Text>
          </GlassCard>
        </Animated.View>
      )}

      {/* Menu */}
      <Animated.View entering={FadeInDown.delay(150).duration(500)}>
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item}
              activeOpacity={0.7}
              style={[styles.menuItem, i < menuItems.length - 1 && styles.menuItemBorder]}
              onPress={() => {
                if (item === 'Editar perfil') router.push('/(tabs)/editar-perfil' as any);
              }}
            >
              <Text style={styles.menuItemText}>{item}</Text>
              <ChevronRight />
            </TouchableOpacity>
          ))}
        </GlassCard>
      </Animated.View>

      {/* Logout */}
      <Animated.View entering={FadeInDown.delay(200).duration(500)}>
        <TouchableOpacity activeOpacity={0.7} style={styles.logoutBtn} onPress={handleLogout}>
          <LogOutIcon />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.footer}>
        <Logo variant="gradient" size="sm" />
        <Text style={styles.version}>Versão 1.0.0</Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', fontSize: 24 },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 16, shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 20 },
  avatarText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 30, zIndex: 1 },
  userName: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 20 },
  userSince: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 },

  pointsBadge: { marginTop: 10, backgroundColor: 'rgba(255,108,36,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.3)' },
  pointsBadgeText: { fontFamily: 'Montserrat_700Bold', color: '#FF6C24', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: { flex: 1, padding: 16 },
  statContent: { alignItems: 'center' },
  statValue: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 18, marginTop: 8 },
  statLabel: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

  tierCard: { padding: 16, borderRadius: 16, overflow: 'hidden', alignItems: 'center' },
  tierLabel: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  tierValue: { fontFamily: 'Montserrat_700Bold', color: '#FF6C24', fontSize: 18, marginTop: 4 },

  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, minHeight: 44 },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)' },
  menuItemText: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.8)', fontSize: 14 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 24, minHeight: 44 },
  logoutText: { fontFamily: 'Montserrat_500Medium', color: 'rgba(239,68,68,0.7)', fontSize: 14 },

  footer: { alignItems: 'center', marginTop: 32, marginBottom: 16 },
  version: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 8 },
});
