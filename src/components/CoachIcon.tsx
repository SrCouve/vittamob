import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';

// Lottie coach icons (all colors pre-converted to VITTA UP orange palette)
const LOTTIE_MAP: Record<string, any> = {
  brain: require('../../assets/coach/cyberpunk-character.json'),
  calendar: require('../../assets/coach/schedule.json'),
  coach: require('../../assets/coach/presentation.json'),
  heartbeat: require('../../assets/coach/heartbeat.json'),
  muscle: require('../../assets/coach/arm-muscle.json'),
  rest: require('../../assets/coach/sleep.json'),
  stopwatch: require('../../assets/coach/stopwatch.json'),
  target: require('../../assets/coach/mission.json'),
  whistle: require('../../assets/coach/sport-whistle.json'),
  speed: require('../../assets/coach/stopwatch.json'), // reuse stopwatch for speed
};

interface CoachIconProps {
  name: keyof typeof LOTTIE_MAP | string;
  size?: number;
  speed?: number;
  loop?: boolean;
  autoPlay?: boolean;
}

export function CoachIcon({ name, size = 24, speed = 0.8, loop = true, autoPlay = true }: CoachIconProps) {
  const source = LOTTIE_MAP[name];
  if (!source) return null;

  return (
    <LottieView
      source={source}
      autoPlay={autoPlay}
      loop={loop}
      speed={speed}
      style={{ width: size, height: size }}
    />
  );
}

/** Get the Lottie source directly (for places that need raw require) */
export function getCoachLottie(name: string): any {
  return LOTTIE_MAP[name] || null;
}

export default CoachIcon;
