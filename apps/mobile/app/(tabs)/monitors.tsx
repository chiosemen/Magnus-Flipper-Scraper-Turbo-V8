import { View, Text, StyleSheet } from 'react-native';

export default function Monitors() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monitors</Text>
      <Text style={styles.placeholder}>Monitors list will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 14,
    color: '#666',
  },
});
