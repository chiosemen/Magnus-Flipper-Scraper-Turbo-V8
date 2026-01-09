import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchUserProfile } from '@/lib/api';

/**
 * Account Screen
 *
 * ARCHITECTURE:
 * - Displays user profile from API
 * - Uses AuthContext for logout
 * - Types imported from @repo/types
 * - No business logic (display only)
 */

export default function AccountScreen() {
  const router = useRouter();
  const { user: firebaseUser, signOut } = useAuth();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => fetchUserProfile(),
    enabled: !!firebaseUser,
  });

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.displayName?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {profile.displayName || 'User'}
          </Text>
          <Text style={styles.email}>{profile.email}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{profile.tier.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.totalDealsFound}</Text>
            <Text style={styles.statLabel}>Deals Found</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.monitorsUsed}</Text>
            <Text style={styles.statLabel}>Active Monitors</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${profile.totalProfitTracked.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Profit Tracked</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Jobs Today</Text>
            <Text style={styles.usageValue}>{profile.jobsUsedToday}</Text>
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Alerts Today</Text>
            <Text style={styles.usageValue}>{profile.alertsSentToday}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Theme</Text>
            <Text style={styles.preferenceValue}>
              {profile.settings.display.theme}
            </Text>
          </View>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Currency</Text>
            <Text style={styles.preferenceValue}>
              {profile.settings.display.currency}
            </Text>
          </View>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Email Notifications</Text>
            <Text style={styles.preferenceValue}>
              {profile.settings.notifications.email ? 'On' : 'Off'}
            </Text>
          </View>
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>Push Notifications</Text>
            <Text style={styles.preferenceValue}>
              {profile.settings.notifications.push ? 'On' : 'Off'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  tierBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tierText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  usageLabel: {
    fontSize: 14,
    color: '#666',
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#666',
  },
  preferenceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    textTransform: 'capitalize',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 16,
    marginBottom: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
});
