import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, RefreshControl, ScrollView
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
  payment_status: string;
  isa_rvg_details: any;
  created_at: string;
}

const getToday = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const getTimeFromISO = (iso: string) => {
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  } catch {
    return '';
  }
};

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

  const today = getToday();
  const todaysCases = cases.filter(c => c.date === today);
  const totalReceived = cases.reduce((s, c) => s + (c.payment_status === 'paid' ? c.anaesthesia_fees : 0), 0);
  const totalPending = cases.reduce((s, c) => s + (c.payment_status !== 'paid' ? c.anaesthesia_fees : 0), 0);

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
    } catch {
      Alert.alert('Error', 'Failed to export CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  const renderCase = ({ item }: { item: CaseItem }) => {
    const isPaid = item.payment_status === 'paid';
    return (
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
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.feeBadge}>
              <Text style={styles.feeText}>₹{formatINR(item.anaesthesia_fees)}</Text>
            </View>
            <View style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusPending]}>
              <View style={[styles.statusDot, { backgroundColor: isPaid ? '#4A7C59' : '#E65100' }]} />
              <Text style={[styles.statusText, { color: isPaid ? '#4A7C59' : '#E65100' }]}>
                {isPaid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.surgeryText}>{item.surgery_name}</Text>
          <Text style={styles.metaText}>
            {item.hospital}{item.hospital && item.anaesthesia_type ? ' · ' : ''}{item.anaesthesia_type}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{cases.length}</Text>
          <Text style={styles.statLbl}>Cases</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.statVal, { color: '#4A7C59' }]}>₹{formatINR(totalReceived)}</Text>
          <Text style={styles.statLbl}>Received</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
          <Text style={[styles.statVal, { color: '#E65100' }]}>₹{formatINR(totalPending)}</Text>
          <Text style={styles.statLbl}>Pending</Text>
        </View>
      </View>

      {/* Today's Roster */}
      {todaysCases.length > 0 && (
        <View style={styles.rosterSection}>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>Today's Roster</Text>
            <Text style={styles.rosterCount}>{todaysCases.length} case{todaysCases.length > 1 ? 's' : ''}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rosterScroll}>
            {todaysCases.map(c => (
              <TouchableOpacity
                key={c.id}
                testID={`roster-card-${c.id}`}
                style={styles.rosterCard}
                onPress={() => router.push(`/case/${c.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.rosterTop}>
                  <Ionicons name="business-outline" size={14} color="#4A7C59" />
                  <Text style={styles.rosterHospital} numberOfLines={1}>{c.hospital || 'Hospital'}</Text>
                </View>
                <Text style={styles.rosterPatient} numberOfLines={1}>{c.patient_name}</Text>
                <Text style={styles.rosterSurgeon} numberOfLines={1}>Dr. {c.surgeon_name || '-'}</Text>
                <View style={styles.rosterBottom}>
                  <Text style={styles.rosterTime}>{getTimeFromISO(c.created_at)}</Text>
                  <View style={[styles.rosterStatus, c.payment_status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: c.payment_status === 'paid' ? '#4A7C59' : '#E65100' }}>
                      {c.payment_status === 'paid' ? 'PAID' : 'DUE'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section Header */}
      <View style={styles.allCasesHeader}>
        <Text style={styles.allCasesTitle}>All Cases</Text>
      </View>
    </View>
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
          <Text style={styles.headerSub}>{cases.length} case{cases.length !== 1 ? 's' : ''} logged</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            testID="analytics-btn"
            style={styles.headerBtn}
            onPress={() => router.push('/analytics')}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#4A7C59" />
          </TouchableOpacity>
          {cases.length > 0 && (
            <TouchableOpacity
              testID="download-csv-btn"
              style={styles.csvBtn}
              onPress={handleCSVDownload}
              disabled={csvLoading}
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
      </View>

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
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCases(); }} tintColor="#4A7C59" />
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
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1A201C', letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAECEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  stats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statVal: { fontSize: 18, fontWeight: '800', color: '#1A201C' },
  statLbl: { fontSize: 11, color: '#6B7280', marginTop: 3 },
  rosterSection: { marginBottom: 16 },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rosterTitle: { fontSize: 15, fontWeight: '700', color: '#1A201C' },
  rosterCount: { fontSize: 13, color: '#6B7280' },
  rosterScroll: { gap: 10 },
  rosterCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rosterTop: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  rosterHospital: { fontSize: 12, color: '#4A7C59', fontWeight: '600', flex: 1 },
  rosterPatient: { fontSize: 14, fontWeight: '700', color: '#1A201C', marginBottom: 2 },
  rosterSurgeon: { fontSize: 12, color: '#6B7280' },
  rosterBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rosterTime: { fontSize: 12, fontWeight: '600', color: '#1A201C' },
  rosterStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  allCasesHeader: { marginBottom: 10 },
  allCasesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 16, fontWeight: '700', color: '#1A201C' },
  cardDate: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  feeBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  feeText: { fontSize: 15, fontWeight: '700', color: '#4A7C59' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  statusPaid: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardBottom: { marginTop: 10 },
  surgeryText: { fontSize: 14, fontWeight: '500', color: '#1A201C' },
  metaText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
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
