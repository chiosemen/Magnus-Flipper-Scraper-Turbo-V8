import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Magnus Flipper Mobile</Text>
      <Text style={styles.subtitle}>Expo + TypeScript + Expo Router</Text>
      <Text style={styles.info}>✅ App scaffold ready</Text>
      <Text style={styles.info}>✅ Expo Router configured</Text>
      <Text style={styles.info}>✅ React Query ready</Text>
      <Text style={styles.info}>✅ Environment loader ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    marginVertical: 4,
  },
});
