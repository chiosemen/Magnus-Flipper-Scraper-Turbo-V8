import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { testHealth } from '@/lib/api';

/**
 * Home Screen - Minimal UI
 *
 * ARCHITECTURE:
 * - Displays "Welcome, [Email]" with user email
 * - Sign Out button
 * - Calls testHealth() on mount to verify token works
 */

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');

  useEffect(() => {
    // Call testHealth() on mount to prove the token worked
    const checkHealth = async () => {
      try {
        const result = await testHealth();
        console.log('[Health Check] API response:', result);
        setHealthStatus('API Connected ✓');
      } catch (error) {
        console.error('[Health Check] Failed:', error);
        setHealthStatus('API Error ✗');
      }
    };

    checkHealth();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Auth guard will handle navigation automatically
    } catch (error) {
      console.error('[SignOut] Failed:', error);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.healthSection}>
          <Text style={styles.healthLabel}>API Status:</Text>
          <Text style={styles.healthStatus}>{healthStatus}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  email: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
  },
  healthSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  healthLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  healthStatus: {
    fontSize: 16,
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
