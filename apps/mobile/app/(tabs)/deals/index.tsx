import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchDeals } from '@/lib/api';
import type { Deal } from '@repo/types';

/**
 * Deals List Screen
 *
 * ARCHITECTURE:
 * - Uses TanStack Query for data fetching
 * - Types imported from @repo/types
 * - No business logic (display only)
 */

export default function DealsScreen() {
  const router = useRouter();

  const { data: deals, isLoading, error, refetch } = useQuery({
    queryKey: ['deals'],
    queryFn: () => fetchDeals(),
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
        <Text style={styles.errorText}>Failed to load deals</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderDeal = ({ item }: { item: Deal }) => (
    <TouchableOpacity
      style={styles.dealCard}
      onPress={() => router.push(`/(tabs)/deals/${item.id}`)}
    >
      <View style={styles.dealHeader}>
        <Text style={styles.dealTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.dealBadge}>
          <Text style={styles.dealScore}>{item.dealScore}</Text>
        </View>
      </View>

      <Text style={styles.dealPrice}>
        {item.currency} {item.listPrice.toFixed(2)}
      </Text>

      {item.profitAmount && item.profitAmount > 0 && (
        <Text style={styles.dealProfit}>
          Potential Profit: {item.currency} {item.profitAmount.toFixed(2)}
        </Text>
      )}

      <View style={styles.dealFooter}>
        <Text style={styles.dealSource}>{item.source}</Text>
        <Text style={styles.dealLocation}>{item.location || 'N/A'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deals</Text>
      </View>

      <FlatList
        data={deals || []}
        renderItem={renderDeal}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No deals found</Text>
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
  list: {
    padding: 16,
  },
  dealCard: {
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
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  dealBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dealScore: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dealPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  dealProfit: {
    fontSize: 14,
    color: '#34C759',
    marginBottom: 8,
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dealSource: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  dealLocation: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
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
