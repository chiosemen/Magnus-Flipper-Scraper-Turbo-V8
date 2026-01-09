import { View, Text, StyleSheet } from 'react-native';

export default function SignUp() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <Text style={styles.placeholder}>Registration UI placeholder</Text>
      <Text style={styles.note}>
        Firebase Auth will be wired here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    color: '#999',
  },
});
