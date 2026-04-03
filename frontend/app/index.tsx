import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, RefreshControl
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatINR } from '../utils/helpers';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CaseItem {
  id: string;
  patient_name: string;
  age: number;
  gender: string;
  surgery_name: string;
  surgeon_name: string;
  hospital: string;
  date: string;
  anaesthesia_type: string;
  anaesthesia_fees: number;
  notes: string;
  isa_rvg_details: any;
  created_at: string;
}

export default function CasesList() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const fetchCases = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases`);
      const data = await res.json();
      setCases(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCases(); }, []));

  const totalFees = cases.reduce((sum, c) => sum + (c.anaesthesia_fees || 0), 0);

  const handleCSVDownload = async () => {
    setCsvLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/export/csv`);
      const csvText = await res.text();

      if (Platform.OS === 'web') {
        const blob = new Blob([csvText], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cases_export.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = FileSystem.documentDirectory + 'cases_export.csv';
        await FileSystem.writeAsStringAsync(fileUri, csvText);
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Cases CSV' });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  const renderCase = ({ item }: { item: CaseItem }) => (
    <TouchableOpacity
      testID={`case-card-${item.id}`}
      style={styles.card}
      onPress={() => router.push(`/case/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.patientName}>{item.patient_name}</Text>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>
        <View style={styles.feeBadge}>
          <Text style={styles.feeText}>₹{formatINR(item.anaesthesia_fees)}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.surgeryText}>{item.surgery_name}</Text>
        <Text style={styles.metaText}>
          {item.hospital}{item.hospital && item.anaesthesia_type ? ' · ' : ''}{item.anaesthesia_type}
        </Text>
      </View>
      {item.isa_rvg_details && (
        <View style={styles.isaBadge}>
          <Ionicons name="calculator-outline" size={12} color="#4A7C59" />
          <Text style={styles.isaBadgeText}>ISA-RVG Calculated</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator testID="loading-indicator" size="large" color="#4A7C59" style={{ marginTop: 120 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Cases</Text>
          <Text style={styles.headerSub}>
            {cases.length} case{cases.length !== 1 ? 's' : ''} logged
          </Text>
        </View>
        {cases.length > 0 && (
          <TouchableOpacity
            testID="download-csv-btn"
            style={styles.csvBtn}
            onPress={handleCSVDownload}
            disabled={csvLoading}
            activeOpacity={0.7}
          >
            {csvLoading ? (
              <ActivityIndicator size="small" color="#4A7C59" />
            ) : (
              <>
                <Ionicons name="download-outline" size={17} color="#4A7C59" />
                <Text style={styles.csvBtnText}>CSV</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {cases.length > 0 && (
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{cases.length}</Text>
            <Text style={styles.statLbl}>Total Cases</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0F7F2' }]}>
            <Text style={[styles.statVal, { color: '#4A7C59' }]}>₹{formatINR(totalFees)}</Text>
            <Text style={styles.statLbl}>Total Earnings</Text>
          </View>
        </View>
      )}

      {/* List / Empty */}
      {cases.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="medical-outline" size={48} color="#4A7C59" />
          </View>
          <Text style={styles.emptyTitle}>No Cases Yet</Text>
          <Text style={styles.emptySub}>Start by adding your first anaesthesia case</Text>
          <TouchableOpacity
            testID="empty-add-case-btn"
            style={styles.emptyBtn}
            onPress={() => router.push('/add-case')}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.emptyBtnText}>Add First Case</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cases}
          renderItem={renderCase}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchCases(); }}
              tintColor="#4A7C59"
            />
          }
        />
      )}

      {/* FAB */}
      {cases.length > 0 && (
        <TouchableOpacity
          testID="add-case-fab"
          style={styles.fab}
          onPress={() => router.push('/add-case')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A201C', letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  csvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAECEB',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  csvBtnText: { fontSize: 14, fontWeight: '600', color: '#4A7C59' },
  stats: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statVal: { fontSize: 22, fontWeight: '800', color: '#1A201C' },
  statLbl: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 16, fontWeight: '700', color: '#1A201C' },
  cardDate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  feeBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  feeText: { fontSize: 15, fontWeight: '700', color: '#4A7C59' },
  cardBottom: { marginTop: 10 },
  surgeryText: { fontSize: 14, fontWeight: '500', color: '#1A201C' },
  metaText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  isaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  isaBadgeText: { fontSize: 12, color: '#4A7C59', fontWeight: '500' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A201C', marginTop: 24 },
  emptySub: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4A7C59',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 28,
  },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#4A7C59',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4A7C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
