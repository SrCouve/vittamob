import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { GlassCard } from '../../src/components/GlassCard';
import { useUserStore } from '../../src/stores/userStore';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <Circle cx="12" cy="13" r="3" />
    </Svg>
  );
}

export default function EditarPerfilScreen() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, fetchProfile } = useUserStore();
  const { user } = useAuthStore();
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '');
      setBio(profile.bio ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para atualizar o avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const fileName = `${user?.id}/avatar.${ext}`;

      // Upload to Supabase Storage
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Erro', 'Não foi possível enviar a foto.');
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const newUrl = urlData.publicUrl;
      setAvatarUrl(newUrl);
      await updateProfile({ avatar_url: newUrl });
    } catch (e) {
      Alert.alert('Erro', 'Falha ao atualizar a foto.');
    }
    setIsUploading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Digite seu nome.');
      return;
    }

    setIsSaving(true);
    const { error } = await updateProfile({
      name: name.trim(),
      bio: bio.trim() || null,
    });

    if (error) {
      Alert.alert('Erro', error);
    } else {
      Alert.alert('Salvo!', 'Perfil atualizado com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
    setIsSaving(false);
  };

  const initial = (name || 'U').charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 120 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <BackIcon />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* Avatar */}
      <Animated.View entering={FadeInDown.delay(50).duration(500)} style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.avatarTouchable}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <>
                <LinearGradient colors={['#FF6C24', '#FFAC7D']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={styles.avatarText}>{initial}</Text>
              </>
            )}
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
          <View style={styles.cameraBadge}>
            <CameraIcon />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Toque para alterar a foto</Text>
      </Animated.View>

      {/* Form */}
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <GlassCard style={styles.formCard}>
          <Text style={styles.label}>Nome</Text>
          <View style={styles.field}>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor="rgba(255,255,255,0.2)"
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Bio</Text>
          <View style={[styles.field, styles.bioField]}>
            <TextInput
              style={[styles.fieldInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Conte um pouco sobre você..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.label}>Email</Text>
          <View style={[styles.field, styles.disabledField]}>
            <Text style={styles.disabledText}>{user?.email ?? ''}</Text>
          </View>
        </GlassCard>
      </Animated.View>

      {/* Save Button */}
      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.saveWrap}>
        <TouchableOpacity onPress={handleSave} disabled={isSaving} activeOpacity={0.8} style={styles.saveBtn}>
          <LinearGradient
            colors={['#FF6C24', '#FF8540']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontFamily: 'PlayfairDisplay_700Bold', color: '#fff', fontSize: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarTouchable: { position: 'relative' },
  avatarWrap: {
    width: 110, height: 110, borderRadius: 55,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 20,
  },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  avatarText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 36, zIndex: 1 },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FF6C24',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#0D0D0D',
  },
  avatarHint: { fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 12 },

  formCard: { padding: 24, marginBottom: 24 },

  label: { fontFamily: 'Montserrat_500Medium', color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 8, marginLeft: 4 },
  field: {
    minHeight: 48, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: 20, justifyContent: 'center',
  },
  fieldInput: { paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontFamily: 'Montserrat_400Regular', fontSize: 15 },
  bioField: { minHeight: 90 },
  bioInput: { minHeight: 70, textAlignVertical: 'top' },
  disabledField: { backgroundColor: 'rgba(0,0,0,0.15)' },
  disabledText: { paddingHorizontal: 16, fontFamily: 'Montserrat_400Regular', color: 'rgba(255,255,255,0.3)', fontSize: 15 },

  saveWrap: { paddingHorizontal: 4 },
  saveBtn: {
    height: 52, borderRadius: 26, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF6C24', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16,
  },
  saveBtnText: { fontFamily: 'Montserrat_700Bold', color: '#fff', fontSize: 16 },
});
