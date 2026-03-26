import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface CachedAvatarProps {
  uri: string | null | undefined;
  name?: string;
  size?: number;
  style?: any;
}

const blurhash = 'L5H2EC=PM+yV0g-mq.wG9c010J}I'; // warm orange placeholder

export function CachedAvatar({ uri, name, size = 38, style }: CachedAvatarProps) {
  const radius = size / 2;
  const initial = (name || '?').charAt(0).toUpperCase();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        placeholder={{ blurhash }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        style={[{ width: size, height: size, borderRadius: radius }, style]}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      <LinearGradient colors={['#FF6C24', '#FFAC7D']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Text style={{ fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}
