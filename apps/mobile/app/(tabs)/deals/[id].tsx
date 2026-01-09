import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchDealById } from '@/lib/api';

/**
 * Deal Detail Screen
 *
 * ARCHITECTURE:
 * - Dynamic route parameter: [id]
 * - Uses TanStack Query for data fetching
 * - Types imported from @repo/types
 * - No business logic (display only)
 */

export default function DealDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => fetchDealById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !deal) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load deal</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleOpenSource = () => {
    Linking.openURL(deal.sourceUrl);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{deal.title}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Score: {deal.dealScore}</Text>
          </View>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>List Price</Text>
          <Text style={styles.price}>
            {deal.currency} {deal.listPrice.toFixed(2)}
          </Text>
          {deal.shippingCost > 0 && (
            <Text style={styles.shipping}>
              + {deal.currency} {deal.shippingCost.toFixed(2)} shipping
            </Text>
          )}
        </View>

        {deal.marketPrice && (
          <View style={styles.marketSection}>
            <Text style={styles.label}>Market Price</Text>
            <Text style={styles.value}>
              {deal.currency} {deal.marketPrice.toFixed(2)}
            </Text>
          </View>
        )}

        {deal.profitAmount && deal.profitAmount > 0 && (
          <View style={styles.profitSection}>
            <Text style={styles.profitLabel}>Potential Profit</Text>
            <Text style={styles.profitValue}>
              {deal.currency} {deal.profitAmount.toFixed(2)}
            </Text>
            {deal.profitMargin && (
              <Text style={styles.profitMargin}>
                ({(deal.profitMargin * 100).toFixed(1)}% margin)
              </Text>
            )}
          </View>
        )}

        {deal.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{deal.description}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Source</Text>
            <Text style={styles.detailValue}>{deal.source}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Condition</Text>
            <Text style={styles.detailValue}>{deal.condition}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{deal.category}</Text>
          </View>
          {deal.location && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{deal.location}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{deal.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{deal.sellerName}</Text>
          </View>
          {deal.sellerRating && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>{deal.sellerRating.toFixed(1)} / 5.0</Text>
            </View>
          )}
          {deal.sellerReviews && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reviews</Text>
              <Text style={styles.detailValue}>{deal.sellerReviews}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.sourceButton} onPress={handleOpenSource}>
          <Text style={styles.sourceButtonText}>View on {deal.source}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    padding: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  priceSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  shipping: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  marketSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitSection: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  profitLabel: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 4,
  },
  profitValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  profitMargin: {
    fontSize: 14,
    color: '#2E7D32',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  sourceButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  sourceButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
