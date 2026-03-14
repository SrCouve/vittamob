import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Dimensions,
  Image,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle, Polyline } from 'react-native-svg';
import LottieView from 'lottie-react-native';
import { Logo } from '../../src/components/Logo';
import { FONTS, COLORS } from '../../src/constants/theme';
import { useScrollY } from '../../src/context/ScrollContext';
import { useAuthStore } from '../../src/stores/authStore';
import { useStravaStore, type StravaRun } from '../../src/stores/stravaStore';
// Lazy-load native modules
let ImagePicker: any = null;
let Sharing: any = null;
let ViewShot: any = null;
let MediaLibrary: any = null;
let RNShare: any = null;
let FileSystem: any = null;
let RecordingViewComp: any = null;
let useViewRecorderHook: (() => any) | null = null;
try { ImagePicker = require('expo-image-picker'); } catch {}
try { Sharing = require('expo-sharing'); } catch {}
try { ViewShot = require('react-native-view-shot').default; } catch {}
try { MediaLibrary = require('expo-media-library'); } catch {}
try { RNShare = require('react-native-share').default; } catch {}
try { FileSystem = require('expo-file-system'); } catch {}
try {
  const vr = require('react-native-view-recorder');
  RecordingViewComp = vr.RecordingView;
  useViewRecorderHook = vr.useViewRecorder;
} catch {}

const isWeb = Platform.OS === 'web';
const { width: SW } = Dimensions.get('window');

const webGlass = isWeb
  ? ({
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    } as any)
  : {};

const THUNDER_ANIM = require('../../assets/thunder-energia.json');
const RUNNING_ANIM = require('../../assets/running.json');
const RUNNING_SHOE_ICON = require('../../assets/icon-running-shoe.png');

// ─── Icons ───────────────────────────────────────────────────────

function SparkIcon({ size = 16, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}

function RunIcon({ size = 18, color = 'rgba(255,255,255,0.5)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <SvgCircle cx="13.5" cy="6.5" r="2.5" />
      <Path d="M10 22 6.5 13 4 15" />
      <Path d="M19.5 9.5 14 14l-3-3" />
      <Path d="m14 14 5.5 8" />
      <Path d="M6.5 13 10 10l3 3" />
    </Svg>
  );
}

function ClockIcon({ size = 13, color = 'rgba(255,255,255,0.35)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <SvgCircle cx="12" cy="12" r="10" />
      <Polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

function DownloadIcon({ size = 18, color = 'rgba(255,255,255,0.6)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" />
      <Path d="M12 15V3" />
    </Svg>
  );
}

function ShareIcon({ size = 16, color = 'rgba(255,255,255,0.4)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <Polyline points="16 6 12 2 8 6" />
      <Path d="M12 2v13" />
    </Svg>
  );
}

function SyncIcon({ size = 16, color = '#FF6C24' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <Path d="M3 3v5h5" />
      <Path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <Path d="M16 16h5v5" />
    </Svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

function formatPace(avgSpeed: number): string {
  if (avgSpeed === 0) return '—';
  const paceSeconds = 1000 / avgSpeed;
  const mins = Math.floor(paceSeconds / 60);
  const secs = Math.floor(paceSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/km`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return weekdays[date.getDay()];
}

// ─── Stats Hero ──────────────────────────────────────────────────

function StatsHero({ runs, totalSparks }: { runs: StravaRun[]; totalSparks: number }) {
  const totalKm = runs.reduce((sum, r) => sum + r.distance_km, 0);
  const totalTime = runs.reduce((sum, r) => sum + r.moving_time_seconds, 0);

  return (
    <Animated.View entering={FadeInDown.delay(100).duration(600)} style={s.heroCard}>
      {!isWeb && <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />}
      <LinearGradient
        colors={['rgba(255,108,36,0.14)', 'rgba(255,108,36,0.04)', 'rgba(255,255,255,0.04)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Specular */}
      <LinearGradient
        colors={['transparent', 'rgba(255,180,130,0.1)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.heroSpecular}
      />

      <View style={s.heroTop}>
        <View style={s.heroLottie}>
          <LottieView
            source={RUNNING_ANIM}
            autoPlay
            loop
            speed={0.7}
            style={{ width: 64, height: 64 }}
          />
        </View>

        {/* Mini VITTA UP badge */}
        <View style={s.heroBrandPill}>
          <Text style={s.heroBrandVitta}>VITTA</Text>
          <Text style={s.heroBrandUp}>UP</Text>
        </View>

        <View style={s.heroSparksBox}>
          <LottieView source={THUNDER_ANIM} autoPlay loop speed={0.8} style={{ width: 40, height: 40 }} />
          <Text style={s.heroSparksValue}>{totalSparks}</Text>
          <Text style={s.heroSparksLabel}>sparks ganhos</Text>
        </View>
      </View>

      <View style={s.heroStatsRow}>
        <View style={s.heroStat}>
          <Text style={s.heroStatValue}>{totalKm.toFixed(1)}</Text>
          <Text style={s.heroStatLabel}>km corridos</Text>
        </View>
        <View style={s.heroStatDivider} />
        <View style={s.heroStat}>
          <Text style={s.heroStatValue}>{runs.length}</Text>
          <Text style={s.heroStatLabel}>corridas</Text>
        </View>
        <View style={s.heroStatDivider} />
        <View style={s.heroStat}>
          <Text style={s.heroStatValue}>{Math.round(totalTime / 3600)}h</Text>
          <Text style={s.heroStatLabel}>tempo total</Text>
        </View>
      </View>

      {/* Powered by Strava */}
      <View style={s.heroPowered}>
        <View style={s.heroPoweredLine} />
        <View style={s.heroPoweredBadge}>
          <Text style={s.heroPoweredText}>powered by</Text>
          <Svg width={10} height={10} viewBox="0 0 16 16" fill="#FC5200">
            <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
          </Svg>
          <Text style={s.heroPoweredStrava}>Strava</Text>
        </View>
        <View style={s.heroPoweredLine} />
      </View>
    </Animated.View>
  );
}

// ─── Story Share ─────────────────────────────────────────────────

const STORY_W = SW * 0.9;
const STORY_H = STORY_W * (16 / 9);

function StoryCard({ run, bgUri }: { run: StravaRun; bgUri: string | null }) {
  return (
    <View style={storyStyles.card}>
      {/* Background — photo takes full space */}
      {bgUri ? (
        <Image source={{ uri: bgUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#1A1008', '#0D0D0D', '#201510']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Subtle gradient only at bottom for the bar */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
        locations={[0, 0.65, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top: VITTA UP + powered by Strava */}
      <View style={storyStyles.topSection}>
        <View style={storyStyles.logoRow}>
          <Text style={storyStyles.logoVitta}>VITTA</Text>
          <Text style={storyStyles.logoUp}>UP</Text>
        </View>
        <View style={storyStyles.stravaPill}>
          <Text style={storyStyles.stravaText}>powered by </Text>
          <Svg width={8} height={8} viewBox="0 0 16 16" fill="#FC5200">
            <Path d="M6.731 0 2 9.125h2.788L6.73 5.497l1.93 3.628h2.766zm4.694 9.125-1.372 2.756L8.66 9.125H6.547L10.053 16l3.484-6.875z" />
          </Svg>
          <Text style={storyStyles.stravaName}>Strava</Text>
        </View>
      </View>

      {/* Bottom bar ~20% — glass strip with all info */}
      <View style={storyStyles.bottomBar}>
        {!isWeb && <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
          style={StyleSheet.absoluteFill}
        />
        {/* Top specular */}
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 0.5 }}
        />

        {/* Run name + sparks row */}
        <View style={storyStyles.barTop}>
          <View style={{ flex: 1 }}>
            <Text style={storyStyles.runName} numberOfLines={1}>{run.activity_name}</Text>
            <Text style={storyStyles.date}>{formatDate(run.activity_date)} · {formatDateFull(run.activity_date)}</Text>
          </View>
          <View style={storyStyles.sparksBadge}>
            <LottieView source={THUNDER_ANIM} autoPlay loop speed={0.8} style={{ width: 24, height: 24 }} />
            <Text style={storyStyles.sparksValue}>+{run.sparks_awarded}</Text>
          </View>
        </View>

        {/* Runner + Stats row */}
        <View style={storyStyles.statsRow}>
          <View style={storyStyles.runnerPill}>
            <LinearGradient
              colors={['rgba(255,108,36,0.2)', 'rgba(255,108,36,0.08)']}
              style={StyleSheet.absoluteFill}
            />
            <LottieView source={RUNNING_ANIM} autoPlay loop speed={1} style={{ width: 36, height: 36 }} />
          </View>

          <View style={storyStyles.statItem}>
            <Text style={storyStyles.statValue}>{run.distance_km.toFixed(2)}</Text>
            <Text style={storyStyles.statLabel}>km</Text>
          </View>
          <View style={storyStyles.statDivider} />
          <View style={storyStyles.statItem}>
            <Text style={storyStyles.statValue}>{formatDuration(run.moving_time_seconds)}</Text>
            <Text style={storyStyles.statLabel}>tempo</Text>
          </View>
          <View style={storyStyles.statDivider} />
          <View style={storyStyles.statItem}>
            <Text style={storyStyles.statValue}>{formatPace(run.average_speed)}</Text>
            <Text style={storyStyles.statLabel}>pace</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ShareModal({ run, visible, onClose }: { run: StravaRun | null; visible: boolean; onClose: () => void }) {
  const viewShotRef = useRef<any>(null);
  const [bgUri, setBgUri] = useState<string | null>(null);
  const [sharing, setSharing] = useState<'ig' | 'share' | 'dl' | null>(null);
  const [dots, setDots] = useState('.');

  // Video recorder — only used for download button
  const recorder = useViewRecorderHook ? useViewRecorderHook() : null;

  // Animated dots: . → .. → ... → .
  React.useEffect(() => {
    if (!sharing) return;
    const iv = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.');
    }, 500);
    return () => clearInterval(iv);
  }, [sharing]);

  if (!run) return null;

  const pickPhoto = () => {
    if (!ImagePicker) {
      Alert.alert('Indisponível', 'Requer build nativo.');
      return;
    }
    Alert.alert('Foto de fundo', 'Escolha de onde pegar a foto', [
      {
        text: 'Galeria',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.9,
          });
          if (!result.canceled && result.assets?.[0]) setBgUri(result.assets[0].uri);
        },
      },
      {
        text: 'Tirar foto',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permissão', 'Precisamos de acesso à câmera.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.9,
          });
          if (!result.canceled && result.assets?.[0]) setBgUri(result.assets[0].uri);
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  // Capture static image of the StoryCard
  const captureMedia = async (): Promise<string | null> => {
    if (viewShotRef.current?.capture) {
      try {
        return await viewShotRef.current.capture();
      } catch (e) {
        console.warn('ViewShot capture failed:', e);
      }
    }
    return null;
  };

  const handleStories = async () => {
    setSharing('ig');
    try {
      const uri = await captureMedia();
      if (!uri) { Alert.alert('Erro', 'Não foi possível capturar a imagem.'); setSharing(null); return; }

      // Save to gallery
      if (MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') await MediaLibrary.saveToLibraryAsync(uri);
      }

      // Share via share sheet — user picks Instagram Stories from there
      if (Sharing && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.image' });
      } else {
        Alert.alert('Salvo!', 'A imagem foi salva na galeria. Abra o Instagram e compartilhe!');
      }
    } catch { Alert.alert('Erro', 'Não foi possível compartilhar.'); }
    setSharing(null);
  };

  const handleShare = async () => {
    setSharing('share');
    try {
      const uri = await captureMedia();
      if (!uri) { Alert.alert('Erro', 'Não foi possível capturar a imagem.'); setSharing(null); return; }

      if (MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') await MediaLibrary.saveToLibraryAsync(uri);
      }

      if (Sharing && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.image' });
      } else {
        Alert.alert('Salvo!', 'Imagem salva na galeria.');
      }
    } catch { Alert.alert('Erro', 'Não foi possível compartilhar.'); }
    setSharing(null);
  };

  const handleDownload = async () => {
    setSharing('dl');
    try {
      let uri: string | null = null;
      let isVideo = false;

      // Try video recording first (4s animated clip)
      if (recorder && RecordingViewComp && FileSystem) {
        try {
          const output = FileSystem.cacheDirectory + `story_${Date.now()}.mp4`;
          const recordPromise = recorder.record({
            output,
            fps: 30,
            codec: 'h264',
            width: Math.round(STORY_W * 2),
            height: Math.round(STORY_H * 2),
          });
          await new Promise(r => setTimeout(r, 4000));
          recorder.stop();
          uri = await recordPromise;
          isVideo = true;
        } catch (e) {
          console.warn('Video recording failed, saving image instead:', e);
        }
      }

      // Fallback: static image
      if (!uri) uri = await captureMedia();
      if (!uri) { Alert.alert('Erro', 'Não foi possível capturar.'); setSharing(null); return; }

      if (MediaLibrary) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert('Salvo!', isVideo ? 'Vídeo salvo na sua galeria!' : 'Imagem salva na sua galeria.');
        } else {
          Alert.alert('Permissão', 'Permita o acesso à galeria para salvar.');
        }
      }
    } catch { Alert.alert('Erro', 'Não foi possível salvar.'); }
    setSharing(null);
  };

  const handleClose = () => {
    setBgUri(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={storyStyles.modalOverlay}>
        <View style={storyStyles.modalContent}>
          {/* Header */}
          <View style={storyStyles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={storyStyles.modalCloseBtn}>
              <Text style={storyStyles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
            <Text style={storyStyles.modalTitle}>Compartilhar</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Preview — RecordingView wraps for video download, ViewShot always inside */}
          <View style={storyStyles.previewWrap}>
            {recorder && RecordingViewComp ? (
              <RecordingViewComp sessionId={recorder.sessionId} style={storyStyles.viewShot}>
                {ViewShot ? (
                  <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={{ flex: 1 }}>
                    <StoryCard run={run} bgUri={bgUri} />
                  </ViewShot>
                ) : (
                  <StoryCard run={run} bgUri={bgUri} />
                )}
              </RecordingViewComp>
            ) : ViewShot ? (
              <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={storyStyles.viewShot}>
                <StoryCard run={run} bgUri={bgUri} />
              </ViewShot>
            ) : (
              <View style={storyStyles.viewShot}>
                <StoryCard run={run} bgUri={bgUri} />
              </View>
            )}
            {/* Photo picker overlay */}
            {!bgUri && (
              <TouchableOpacity onPress={pickPhoto} style={storyStyles.pickOverlay} activeOpacity={0.7}>
                <View style={storyStyles.pickOverlayBtn}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <SvgCircle cx="12" cy="13" r="4" />
                  </Svg>
                  <Text style={storyStyles.pickOverlayText}>Escolher foto</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Actions */}
          <View style={storyStyles.actionsCol}>
            {/* Loading — runner + animated dots */}
            {sharing && (
              <Animated.View entering={FadeIn.duration(250)} style={storyStyles.loadingFloat}>
                <LottieView source={RUNNING_ANIM} autoPlay loop speed={1.2} style={{ width: 48, height: 48 }} />
                <Text style={storyStyles.loadingText}>Preparando{dots}</Text>
              </Animated.View>
            )}

            <View style={storyStyles.actionsRow}>
              {/* Download — icon only */}
              <TouchableOpacity
                onPress={handleDownload}
                activeOpacity={0.85}
                disabled={!!sharing}
                style={[storyStyles.dlBtn, sharing === 'dl' && storyStyles.btnActive]}
              >
                {!isWeb && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
                <LinearGradient
                  colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={[StyleSheet.absoluteFill, { borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)' }]} />
                <DownloadIcon size={20} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>

              {/* Instagram Stories */}
              <TouchableOpacity
                onPress={handleStories}
                activeOpacity={0.85}
                disabled={!!sharing}
                style={[storyStyles.igBtn, sharing === 'ig' && storyStyles.btnActive]}
              >
                {!isWeb && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
                <LinearGradient
                  colors={['rgba(225,48,108,0.22)', 'rgba(188,24,136,0.14)', 'rgba(81,52,212,0.18)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.6 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: 0.5 }}
                />
                <View style={[StyleSheet.absoluteFill, { borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(225,48,108,0.3)' }]} />
                <View style={storyStyles.btnInner}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" />
                    <SvgCircle cx="12" cy="12" r="4.5" />
                    <SvgCircle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.85)" />
                  </Svg>
                  <Text style={storyStyles.igBtnText}>Stories</Text>
                </View>
              </TouchableOpacity>

              {/* Compartilhar */}
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.85}
                disabled={!!sharing}
                style={[storyStyles.shareBtn, sharing === 'share' && storyStyles.btnActive]}
              >
                {!isWeb && <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />}
                <LinearGradient
                  colors={['rgba(255,108,36,0.22)', 'rgba(255,133,64,0.14)', 'rgba(255,172,125,0.18)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 0.6 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(255,210,180,0.3)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: 0.5 }}
                />
                <View style={[StyleSheet.absoluteFill, { borderRadius: 18, borderWidth: 0.5, borderColor: 'rgba(255,140,80,0.3)' }]} />
                <View style={storyStyles.btnInner}>
                  <ShareIcon size={17} color="rgba(255,133,64,0.85)" />
                  <Text style={storyStyles.shareBtnText}>Compartilhar</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Run Card ────────────────────────────────────────────────────

function RunCard({ run, index, onShare }: { run: StravaRun; index: number; onShare: (run: StravaRun) => void }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 60, 400)).duration(450)}
      style={s.runCard}
    >
      {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Specular */}
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.runSpecular}
      />

      {/* Header */}
      <View style={s.runHeader}>
        <View style={s.runIconWrap}>
          <Image source={RUNNING_SHOE_ICON} style={s.runShoeIcon} />
        </View>
        <View style={s.runHeaderText}>
          <Text style={s.runName} numberOfLines={1}>{run.activity_name}</Text>
          <View style={s.runDateRow}>
            <Text style={s.runDate}>{formatDate(run.activity_date)}</Text>
            <Text style={s.runDateDot}>·</Text>
            <Text style={s.runDate}>{formatDateFull(run.activity_date)}</Text>
          </View>
        </View>

        {/* Sparks badge */}
        <View style={s.sparksBadge}>
          <SparkIcon size={13} color="#FF6C24" />
          <Text style={s.sparksBadgeText}>+{run.sparks_awarded}</Text>
        </View>
      </View>

      {/* Stats + Share */}
      <View style={s.runStats}>
        <View style={s.runStatItem}>
          <Text style={s.runStatValue}>{run.distance_km.toFixed(2)}</Text>
          <Text style={s.runStatUnit}>km</Text>
        </View>

        <View style={s.runStatSep} />

        <View style={s.runStatItem}>
          <ClockIcon size={12} />
          <Text style={s.runStatMeta}>{formatDuration(run.moving_time_seconds)}</Text>
        </View>

        <View style={s.runStatSep} />

        <View style={s.runStatItem}>
          <Text style={s.runStatMeta}>{formatPace(run.average_speed)}</Text>
        </View>

        <View style={{ flex: 1 }} />

        <TouchableOpacity onPress={() => onShare(run)} style={s.shareIconBtn} activeOpacity={0.7}>
          <ShareIcon size={15} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────

function EmptyRuns({ isConnected }: { isConnected: boolean }) {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={s.emptyContainer}>
      <View style={s.emptyLottie}>
        <LottieView source={RUNNING_ANIM} autoPlay loop speed={0.5} style={{ width: 100, height: 100 }} />
      </View>
      <Text style={s.emptyTitle}>
        {isConnected ? 'Nenhuma corrida ainda' : 'Conecte o Strava'}
      </Text>
      <Text style={s.emptyDesc}>
        {isConnected
          ? 'Suas corridas após o cadastro no VITTA UP aparecerão aqui. Cada km vale 1 spark!'
          : 'Conecte sua conta do Strava no perfil para começar a ganhar sparks por cada km corrido.'
        }
      </Text>
    </Animated.View>
  );
}

// ─── Reusable Content (used inside perfil.tsx tab) ──────────────

export function CorridasContent({ userId }: { userId: string | null }) {
  const {
    runs, isLoadingRuns, totalSparksEarned, isConnected, isSyncing,
    fetchRuns, syncAndAwardRuns,
  } = useStravaStore();
  const [shareRun, setShareRun] = useState<StravaRun | null>(null);

  useEffect(() => {
    if (userId) {
      fetchRuns(userId);
      if (isConnected) syncAndAwardRuns(userId);
    }
  }, [userId, isConnected]);

  return (
    <>
      <ShareModal run={shareRun} visible={!!shareRun} onClose={() => setShareRun(null)} />
      {/* Sync button */}
      {isConnected && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => userId && syncAndAwardRuns(userId)}
            disabled={isSyncing}
            style={[s.syncBtn, isSyncing && { opacity: 0.4 }]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FF6C24" />
            ) : (
              <SyncIcon size={18} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {isLoadingRuns && runs.length === 0 ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6C24" />
          <Text style={s.loadingText}>Sincronizando corridas...</Text>
        </View>
      ) : runs.length === 0 ? (
        <EmptyRuns isConnected={isConnected} />
      ) : (
        <>
          <StatsHero runs={runs} totalSparks={totalSparksEarned} />

          <View style={s.listHeader}>
            <View style={s.listHeaderLine} />
            <Image source={RUNNING_SHOE_ICON} style={s.listHeaderIcon} />
            <Text style={s.listHeaderText}>Histórico de corridas</Text>
            <View style={s.listHeaderLine} />
          </View>

          {runs.map((run, i) => (
            <RunCard key={run.id} run={run} index={i} onShare={setShareRun} />
          ))}
        </>
      )}
    </>
  );
}

// ─── Main Screen (standalone, kept for direct navigation) ────────

export default function CorridasScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useScrollY();
  const { user } = useAuthStore();
  const {
    runs, isLoadingRuns, totalSparksEarned, isConnected, isSyncing,
    fetchRuns, syncAndAwardRuns,
  } = useStravaStore();
  const [refreshing, setRefreshing] = useState(false);
  const [shareRun, setShareRun] = useState<StravaRun | null>(null);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (userId) {
      fetchRuns(userId);
      if (isConnected) syncAndAwardRuns(userId);
    }
  }, [userId, isConnected]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await syncAndAwardRuns(userId);
    setRefreshing(false);
  }, [userId]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return (
    <Animated.ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF6C24"
          progressBackgroundColor="#1A1008"
        />
      }
    >
      {/* ══ HEADER ══ */}
      <Animated.View entering={FadeInDown.duration(500)} style={s.header}>
        <View>
          <Logo variant="gradient" size="sm" />
          <Text style={s.subtitle}>Corridas</Text>
        </View>
        {isConnected && (
          <TouchableOpacity
            onPress={() => userId && syncAndAwardRuns(userId)}
            disabled={isSyncing}
            style={[s.syncBtn, isSyncing && { opacity: 0.4 }]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FF6C24" />
            ) : (
              <SyncIcon size={18} />
            )}
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ══ SPARKS RULE ══ */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)} style={s.ruleCard}>
        {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
        <LinearGradient
          colors={['rgba(255,108,36,0.10)', 'rgba(255,108,36,0.03)']}
          style={StyleSheet.absoluteFill}
        />
        <LottieView source={THUNDER_ANIM} autoPlay loop speed={0.8} style={{ width: 22, height: 22 }} />
        <Text style={s.ruleText}>1 km corrido = 1 spark</Text>
      </Animated.View>

      {/* ══ LOADING ══ */}
      {isLoadingRuns && runs.length === 0 ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6C24" />
          <Text style={s.loadingText}>Sincronizando corridas...</Text>
        </View>
      ) : runs.length === 0 ? (
        <EmptyRuns isConnected={isConnected} />
      ) : (
        <>
          {/* ══ HERO STATS ══ */}
          <StatsHero runs={runs} totalSparks={totalSparksEarned} />

          {/* ══ RUNS LIST ══ */}
          <View style={s.listHeader}>
            <View style={s.listHeaderLine} />
            <Image source={RUNNING_SHOE_ICON} style={s.listHeaderIcon} />
            <Text style={s.listHeaderText}>Histórico de corridas</Text>
            <View style={s.listHeaderLine} />
          </View>

          {runs.map((run, i) => (
            <RunCard key={run.id} run={run} index={i} onShare={setShareRun} />
          ))}
        </>
      )}
      <ShareModal run={shareRun} visible={!!shareRun} onClose={() => setShareRun(null)} />
    </Animated.ScrollView>
  );
}

// ─── Story Styles ────────────────────────────────────────────────

const storyStyles = StyleSheet.create({
  card: {
    width: STORY_W, height: STORY_H,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: '#0D0D0D',
  },
  topSection: {
    position: 'absolute', top: 24, left: 20, right: 20, zIndex: 2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  stravaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10,
  },
  stravaText: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
  },
  stravaName: {
    fontFamily: FONTS.montserrat.bold, color: '#FC5200',
    fontSize: 8,
  },
  logoRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12,
  },
  logoVitta: {
    fontFamily: FONTS.montserrat.extrabold, color: '#FF6C24',
    fontSize: 16, letterSpacing: 0,
  },
  logoUp: {
    fontFamily: FONTS.montserrat.light, color: 'rgba(255,255,255,0.7)',
    fontSize: 13, letterSpacing: 0.5,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    overflow: 'hidden', padding: 20, paddingBottom: 28,
    borderTopWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  barTop: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 16,
  },
  sparksBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,108,36,0.15)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 14, borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.25)',
  },
  sparksValue: {
    fontFamily: FONTS.montserrat.bold, color: '#FF6C24',
    fontSize: 16,
  },
  runName: {
    fontFamily: FONTS.montserrat.semibold, color: '#fff',
    fontSize: 16,
  },
  date: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)',
    fontSize: 11, marginTop: 3,
  },
  runnerPill: {
    width: 44, height: 44, borderRadius: 14,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.2)',
  },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center' },
  statValue: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 18,
  },
  statLabel: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)',
    fontSize: 10, marginTop: 2,
  },
  statDivider: {
    width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    flex: 1, width: '100%', alignItems: 'center',
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 20, marginBottom: 20,
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoBtnText: {
    fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  modalCloseBtn: { width: 60 },
  modalCloseText: {
    fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  modalTitle: {
    fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 16,
  },
  previewWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  pickOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
  pickOverlayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  pickOverlayText: {
    fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  viewShot: {
    borderRadius: 24, overflow: 'hidden',
  },
  actionsCol: {
    paddingHorizontal: 20, paddingBottom: 50, paddingTop: 16,
    width: '100%', gap: 10,
  },
  actionsRow: {
    flexDirection: 'row', gap: 10,
  },
  pickPhotoBtn: {
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  pickPhotoText: {
    fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  dlBtn: {
    width: 52, height: 52, borderRadius: 18, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  igBtn: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    minHeight: 52,
    shadowColor: '#C13584', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  igBtnText: {
    fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.9)', fontSize: 14,
  },
  shareBtn: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    minHeight: 52,
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  shareBtnText: {
    fontFamily: FONTS.montserrat.semibold, color: '#FF8540', fontSize: 14,
  },
  btnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, paddingHorizontal: 24,
    zIndex: 2,
  },
  btnActive: {
    opacity: 0.5,
  },
  loadingFloat: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  loadingText: {
    fontFamily: FONTS.montserrat.semibold, color: 'rgba(255,255,255,0.6)',
    fontSize: 13, marginTop: 2, width: 90, textAlign: 'center',
  },
});

// ─── Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  subtitle: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.4)',
    fontSize: 14, marginTop: 4,
  },
  syncBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,108,36,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)',
  },

  // Rule card
  ruleCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    borderRadius: 14, overflow: 'hidden',
    paddingVertical: 12, paddingHorizontal: 20,
    borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)',
    marginBottom: 20,
  },
  ruleText: {
    fontFamily: FONTS.montserrat.semibold, color: '#FF8540',
    fontSize: 13,
  },
  ruleSub: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
  },

  // Hero
  heroCard: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.15)', marginBottom: 24,
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24,
  },
  heroSpecular: {
    position: 'absolute', top: 0, left: '8%', right: '8%', height: 1, zIndex: 1,
  },
  heroTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingBottom: 12, zIndex: 2,
  },
  heroLottie: { width: 64, height: 64 },
  heroBrandPill: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  heroBrandVitta: {
    fontFamily: FONTS.montserrat.extrabold, color: 'rgba(255,108,36,0.35)',
    fontSize: 26, letterSpacing: 0, lineHeight: 28,
  },
  heroBrandUp: {
    fontFamily: FONTS.montserrat.light, color: 'rgba(255,255,255,0.25)',
    fontSize: 20, letterSpacing: 0.5, lineHeight: 22,
  },
  heroSparksBox: {
    alignItems: 'center', gap: 2,
  },
  heroSparksValue: {
    fontFamily: FONTS.montserrat.bold, color: '#FF6C24', fontSize: 32,
  },
  heroSparksLabel: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  heroStatsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8, zIndex: 2,
  },
  heroStat: { alignItems: 'center' },
  heroStatValue: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 18,
  },
  heroStatLabel: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)',
    fontSize: 10, marginTop: 2,
  },
  heroStatDivider: {
    width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroPowered: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 16, zIndex: 2,
  },
  heroPoweredLine: {
    flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroPoweredBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  heroPoweredText: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
  },
  heroPoweredStrava: {
    fontFamily: FONTS.montserrat.bold, color: '#FC5200',
    fontSize: 9,
  },

  // List header
  listHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  listHeaderLine: {
    flex: 1, height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  listHeaderIcon: {
    width: 14, height: 14, tintColor: 'rgba(255,255,255,0.15)',
  },
  listHeaderText: {
    fontFamily: FONTS.montserrat.medium, color: 'rgba(255,255,255,0.15)',
    fontSize: 10, letterSpacing: 1,
  },

  // Run card
  runCard: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16,
  },
  runSpecular: {
    position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, zIndex: 1,
  },
  runHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, zIndex: 2,
  },
  runIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,108,36,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  runShoeIcon: {
    width: 18, height: 18, tintColor: '#FF8540',
  },
  runHeaderText: { flex: 1 },
  runName: {
    fontFamily: FONTS.montserrat.semibold, color: '#fff', fontSize: 14,
  },
  runDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2,
  },
  runDate: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
  },
  runDateDot: {
    color: 'rgba(255,255,255,0.12)', fontSize: 11,
  },

  // Sparks badge
  sparksBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: 'rgba(255,108,36,0.12)', borderWidth: 0.5,
    borderColor: 'rgba(255,108,36,0.2)',
  },
  sparksBadgeText: {
    fontFamily: FONTS.montserrat.bold, color: '#FF6C24', fontSize: 13,
  },

  // Run stats row
  runStats: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4, gap: 12, zIndex: 2,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  runStatItem: {
    flexDirection: 'row', alignItems: 'baseline', gap: 3,
  },
  runStatValue: {
    fontFamily: FONTS.montserrat.bold, color: '#fff', fontSize: 16,
  },
  runStatUnit: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
  },
  runStatMeta: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  runStatSep: {
    width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shareIconBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingText: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.3)',
    fontSize: 12, marginTop: 12,
  },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyLottie: { width: 100, height: 100, marginBottom: 16 },
  emptyTitle: {
    fontFamily: FONTS.playfair.semibold, color: '#fff', fontSize: 18,
    textAlign: 'center', marginBottom: 8,
  },
  emptyDesc: {
    fontFamily: FONTS.montserrat.regular, color: 'rgba(255,255,255,0.35)',
    fontSize: 13, textAlign: 'center', lineHeight: 19,
  },
});
