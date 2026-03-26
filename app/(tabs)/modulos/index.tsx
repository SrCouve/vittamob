import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { FONTS } from '../../../src/constants/theme';

const isWeb = Platform.OS === 'web';
const CLOSED_SIGN = require('../../../assets/closed-sign.json');

export default function ModulosScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      <View style={s.center}>
        {/* Lottie */}
        <Animated.View entering={FadeIn.delay(200).duration(600)}>
          <LottieView source={CLOSED_SIGN} autoPlay loop speed={0.6} style={{ width: 140, height: 140, alignSelf: 'center' }} />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <Text style={s.title}>Estamos preparando{'\n'}algo especial</Text>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Text style={s.desc}>
            Os módulos de aulas estão sendo criados com o mesmo cuidado que você merece. Conteúdos de yoga, funcional, meditação e nutrição vão chegar em breve.
          </Text>
        </Animated.View>

        {/* Badge */}
        <Animated.View entering={FadeInDown.delay(800).duration(400)}>
          <View style={s.badge}>
            {!isWeb && <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />}
            <LinearGradient colors={['rgba(255,108,36,0.1)', 'rgba(255,108,36,0.03)']} style={StyleSheet.absoluteFill} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,108,36,0.2)' }} />
            <Text style={s.badgeText}>Fique de olho nas atualizações</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  title: { fontFamily: FONTS.playfair.bold, fontSize: 28, color: '#fff', textAlign: 'center', lineHeight: 36, marginTop: 20, marginBottom: 16 },
  desc: { fontFamily: FONTS.montserrat.regular, fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 23, marginBottom: 24 },
  badge: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,108,36,0.15)' },
  badgeText: { fontFamily: FONTS.montserrat.semibold, fontSize: 13, color: '#FF8540', textAlign: 'center' },
});
