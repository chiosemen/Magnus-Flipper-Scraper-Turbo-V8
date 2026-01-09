import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchMonitors } from '@/lib/api';
import type { Monitor } from '@repo/types';

/**
 * Monitors List Screen
 *
 * ARCHITECTURE:
 * - Uses TanStack Query for data fetching
 * - Types imported from @repo/types
 * - No business logic (display only)
 */

export default function MonitorsScreen() {
  const router = useRouter();

  const { data: monitors, isLoading, error, refetch } = useQuery({
    queryKey: ['monitors'],
    queryFn: () => fetchMonitors(),
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load monitors</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderMonitor = ({ item }: { item: Monitor }) => (
    <View style={styles.monitorCard}>
      <View style={styles.monitorHeader}>
        <Text style={styles.monitorName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[styles.statusBadge, item.status === 'active' && styles.statusActive]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.monitorDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.monitorStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.totalDealsFound}</Text>
          <Text style={styles.statLabel}>Deals Found</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.frequency}</Text>
          <Text style={styles.statLabel}>Frequency</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.sources.length}</Text>
          <Text style={styles.statLabel}>Sources</Text>
        </View>
      </View>

      <View style={styles.monitorFooter}>
        <Text style={styles.sources}>
          {item.sources.join(', ')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monitors</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/(tabs)/monitors/create')}
        >
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={monitors || []}
        renderItem={renderMonitor}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No monitors yet</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/monitors/create')}
            >
              <Text style={styles.emptyButtonText}>Create your first monitor</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  monitorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monitorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monitorName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: '#999',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: '#34C759',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  monitorDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  monitorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  monitorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sources: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
