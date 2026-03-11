import { Slot } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { BottomNav } from '../../src/components/BottomNav';
import { ScrollProvider } from '../../src/context/ScrollContext';

export default function TabLayout() {
  return (
    <ScrollProvider>
      <View style={styles.container}>
        <Slot />
        <BottomNav />
      </View>
    </ScrollProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
