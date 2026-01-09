import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Create Monitor Screen
 *
 * ARCHITECTURE:
 * - Form placeholder (no business logic per requirements)
 * - No client-side validation (validation on server)
 * - UI displays data only
 *
 * TODO: Wire to API when backend is ready
 */

export default function CreateMonitorScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keywords, setKeywords] = useState('');

  const handleCreate = () => {
    if (!name || !keywords) {
      Alert.alert('Error', 'Name and keywords are required');
      return;
    }

    // TODO: Wire to API
    Alert.alert(
      'Success',
      'Monitor creation will be wired to API',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Monitor</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Monitor Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Vintage Cameras"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What are you looking for?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Keywords *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., canon, nikon, leica"
            value={keywords}
            onChangeText={setKeywords}
          />
          <Text style={styles.hint}>Separate keywords with commas</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Sources</Text>
          <View style={styles.checkboxGroup}>
            <View style={styles.checkbox}>
              <View style={styles.checkboxBox} />
              <Text style={styles.checkboxLabel}>Craigslist</Text>
            </View>
            <View style={styles.checkbox}>
              <View style={styles.checkboxBox} />
              <Text style={styles.checkboxLabel}>eBay</Text>
            </View>
            <View style={styles.checkbox}>
              <View style={styles.checkboxBox} />
              <Text style={styles.checkboxLabel}>Facebook Marketplace</Text>
            </View>
            <View style={styles.checkbox}>
              <View style={styles.checkboxBox} />
              <Text style={styles.checkboxLabel}>OfferUp</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Price Range</Text>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.subLabel}>Min Price</Text>
              <TextInput
                style={styles.input}
                placeholder="$0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.subLabel}>Max Price</Text>
              <TextInput
                style={styles.input}
                placeholder="$1000"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={styles.radioButton}>
              <View style={styles.radioOuter}>
                <View style={styles.radioInner} />
              </View>
              <Text style={styles.radioLabel}>Real-time (Pro)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton}>
              <View style={styles.radioOuter} />
              <Text style={styles.radioLabel}>Hourly</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.radioButton}>
              <View style={styles.radioOuter} />
              <Text style={styles.radioLabel}>Daily</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Text style={styles.createButtonText}>Create Monitor</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    minWidth: 60,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#666',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkboxGroup: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 4,
  },
  radioGroup: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 16,
    color: '#000',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
