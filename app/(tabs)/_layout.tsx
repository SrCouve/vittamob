import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Slot />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
