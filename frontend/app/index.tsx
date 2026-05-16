import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, Platform, RefreshControl, ScrollView, Modal, Image
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatINR } from '../utils/helpers';
import { apiFetch } from '../utils/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CaseItem {
  id: string; patient_name: string; age: number; gender: string;
  surgery_name: string; surgeon_name: string; hospital: string;
  date: string; anaesthesia_type: string; anaesthesia_fees: number;
  notes: string; payment_status: string; mode_of_payment: string;
  receipt_no: string; isa_rvg_details: any; created_at: string;
}

const getToday = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const getTimeFromISO = (iso: string) => {
  try {
    const d = new Date(iso);
    const h = d.getHours(); const m = d.getMinutes();
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  } catch { return ''; }
};

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_QUARTER = Math.ceil((new Date().getMonth() + 1) / 3);

const CSV_OPTIONS = [
  { label: `Q${CURRENT_QUARTER} ${CURRENT_YEAR}`, period: 'quarterly', year: CURRENT_YEAR, quarter: CURRENT_QUARTER },
  ...(CURRENT_QUARTER > 1 ? [{ label: `Q${CURRENT_QUARTER - 1} ${CURRENT_YEAR}`, period: 'quarterly', year: CURRENT_YEAR, quarter: CURRENT_QUARTER - 1 }] : []),
  { label: `Year ${CURRENT_YEAR}`, period: 'yearly', year: CURRENT_YEAR, quarter: 0 },
  { label: `Year ${CURRENT_YEAR - 1}`, period: 'yearly', year: CURRENT_YEAR - 1, quarter: 0 },
  { label: 'All Cases', period: 'all', year: 0, quarter: 0 },
];

export default function CasesList() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [csvModal, setCsvModal] = useState(false);
  const [csvLoading, setCsvLoading] = useState('');
  const [expanded, setExpanded] = useState({ today: true, thisMonth: false, prevMonth: false, all: false });

  const fetchCases = async () => {
    try {
      const res = await apiFetch('/api/cases');
      setCases(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { fetchCases(); }, []));

  const today = getToday();
  const cm = new Date().getMonth() + 1;
  const cy = new Date().getFullYear();
  const pm = cm === 1 ? 12 : cm - 1;
  const py = cm === 1 ? cy - 1 : cy;

  const grouped = useMemo(() => {
    const todayCases: CaseItem[] = [];
    const thisMonthCases: CaseItem[] = [];
    const prevMonthCases: CaseItem[] = [];
    cases.forEach(c => {
      if (c.date === today) todayCases.push(c);
      try {
        const p = c.date.split('/');
        if (p.length === 3) {
          const m = parseInt(p[1]), y = parseInt(p[2]);
          if (m === cm && y === cy) thisMonthCases.push(c);
          if (m === pm && y === py) prevMonthCases.push(c);
        }
      } catch {}
    });
    return { todayCases, thisMonthCases, prevMonthCases };
  }, [cases, today]);

  const totalReceived = cases.reduce((s, c) => s + (c.payment_status === 'paid' ? c.anaesthesia_fees : 0), 0);
  const totalPending = cases.reduce((s, c) => s + (c.payment_status !== 'paid' ? c.anaesthesia_fees : 0), 0);

  const handleCSV = async (opt: typeof CSV_OPTIONS[0]) => {
    setCsvLoading(opt.label);
    try {
      const url = `/api/cases/export/csv?period=${opt.period}&year=${opt.year}&quarter=${opt.quarter}`;
      const res = await apiFetch(url);
      const csvText = await res.text();
      if (Platform.OS === 'web') {
        const blob = new Blob([csvText], { type: 'text/csv' });
        const u = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u; a.download = `cases_${opt.label.replace(/\s/g, '_')}.csv`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(u);
      } else {
        const fileUri = FileSystem.documentDirectory + `cases_${opt.label.replace(/\s/g, '_')}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvText);
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
      }
      setCsvModal(false);
    } catch { Alert.alert('Error', 'Failed to export CSV'); }
    finally { setCsvLoading(''); }
  };

  const toggle = (key: keyof typeof expanded) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const renderCase = (item: CaseItem) => {
    const isPaid = item.payment_status === 'paid';
    return (
      <TouchableOpacity key={item.id} testID={`case-card-${item.id}`} style={st.card} onPress={() => router.push(`/case/${item.id}`)} activeOpacity={0.7}>
        <View style={st.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={st.patientName}>{item.patient_name}</Text>
            <Text style={st.cardMeta}>{item.hospital}{item.surgeon_name ? ` · ${item.surgeon_name}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.cardFee}>₹{formatINR(item.anaesthesia_fees)}</Text>
            <View style={[st.statusDot, { backgroundColor: isPaid ? '#4A7C59' : '#E65100' }]}>
              <Text style={st.statusDotText}>{isPaid ? 'Paid' : 'Due'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const SectionHeader = ({ title, count, isExpanded, onPress, testID }: any) => (
    <TouchableOpacity testID={testID} style={st.secHeader} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={st.secTitle}>{title}</Text>
      </View>
      <View style={st.secRight}>
        <View style={st.secCountBadge}><Text style={st.secCount}>{count}</Text></View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <SafeAreaView style={st.container}><ActivityIndicator testID="loading-indicator" size="large" color="#4A7C59" style={{ marginTop: 120 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <Image source={require('../assets/images/faft-logo.png')} style={st.logo} />
          <Text style={st.headerTitle}>FAFT</Text>
        </View>
        <View style={st.headerActions}>
          <TouchableOpacity testID="profile-btn" style={st.hBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={18} color="#4A7C59" />
          </TouchableOpacity>
          <TouchableOpacity testID="analytics-btn" style={st.hBtn} onPress={() => router.push('/analytics')}>
            <Ionicons name="bar-chart-outline" size={18} color="#4A7C59" />
          </TouchableOpacity>
          {cases.length > 0 && (
            <TouchableOpacity testID="download-csv-btn" style={st.csvBtn} onPress={() => setCsvModal(true)}>
              <Ionicons name="download-outline" size={17} color="#4A7C59" />
              <Text style={st.csvBtnText}>CSV</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {cases.length === 0 ? (
        <View style={st.empty}>
          <View style={st.emptyIcon}><Ionicons name="medical-outline" size={48} color="#4A7C59" /></View>
          <Text style={st.emptyTitle}>No Cases Yet</Text>
          <Text style={st.emptySub}>Start by adding your first anaesthesia case</Text>
          <TouchableOpacity testID="empty-add-case-btn" style={st.emptyBtn} onPress={() => router.push('/add-case')}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={st.emptyBtnText}>Add First Case</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCases(); }} tintColor="#4A7C59" />}
        >
          {/* Stats */}
          <View style={st.stats}>
            <View style={st.statCard}>
              <Text style={st.statVal}>{cases.length}</Text>
              <Text style={st.statLbl}>Cases</Text>
            </View>
            <View style={[st.statCard, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[st.statVal, { color: '#4A7C59' }]}>₹{formatINR(totalReceived)}</Text>
              <Text style={st.statLbl}>Received</Text>
            </View>
            <View style={[st.statCard, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[st.statVal, { color: '#E65100' }]}>₹{formatINR(totalPending)}</Text>
              <Text style={st.statLbl}>Pending</Text>
            </View>
          </View>

          {/* Today's Roster */}
          <SectionHeader testID="section-today" title="Today's Roster" count={grouped.todayCases.length} isExpanded={expanded.today} onPress={() => toggle('today')} />
          {expanded.today && (grouped.todayCases.length > 0 ? grouped.todayCases.map(renderCase) : <Text style={st.noData}>No cases today</Text>)}

          {/* This Month */}
          <SectionHeader testID="section-this-month" title="This Month" count={grouped.thisMonthCases.length} isExpanded={expanded.thisMonth} onPress={() => toggle('thisMonth')} />
          {expanded.thisMonth && (grouped.thisMonthCases.length > 0 ? grouped.thisMonthCases.map(renderCase) : <Text style={st.noData}>No cases this month</Text>)}

          {/* Previous Month */}
          <SectionHeader testID="section-prev-month" title="Previous Month" count={grouped.prevMonthCases.length} isExpanded={expanded.prevMonth} onPress={() => toggle('prevMonth')} />
          {expanded.prevMonth && (grouped.prevMonthCases.length > 0 ? grouped.prevMonthCases.map(renderCase) : <Text style={st.noData}>No cases last month</Text>)}

          {/* All Cases */}
          <SectionHeader testID="section-all" title="All Cases" count={cases.length} isExpanded={expanded.all} onPress={() => toggle('all')} />
          {expanded.all && cases.map(renderCase)}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB */}
      {cases.length > 0 && (
        <TouchableOpacity testID="add-case-fab" style={st.fab} onPress={() => router.push('/add-case')} activeOpacity={0.8}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* CSV Modal */}
      <Modal visible={csvModal} transparent animationType="fade">
        <TouchableOpacity style={st.modalOverlay} activeOpacity={1} onPress={() => setCsvModal(false)}>
          <View style={st.csvModalBox} onStartShouldSetResponder={() => true}>
            <Text style={st.csvModalTitle}>Export Cases (CSV)</Text>
            <Text style={st.csvModalSub}>Select period for tax/accounting</Text>
            {CSV_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.label} testID={`csv-opt-${opt.label.replace(/\s/g, '-')}`} style={st.csvOpt} onPress={() => handleCSV(opt)} disabled={csvLoading !== ''}>
                <Ionicons name="document-text-outline" size={18} color="#4A7C59" />
                <Text style={st.csvOptText}>{opt.label}</Text>
                {csvLoading === opt.label ? <ActivityIndicator size="small" color="#4A7C59" /> : <Ionicons name="download-outline" size={18} color="#6B7280" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A201C', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EAECEB', justifyContent: 'center', alignItems: 'center' },
  csvBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EAECEB', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  csvBtnText: { fontSize: 14, fontWeight: '600', color: '#4A7C59' },
  scrollContent: { paddingHorizontal: 20 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  statVal: { fontSize: 18, fontWeight: '800', color: '#1A201C' },
  statLbl: { fontSize: 11, color: '#6B7280', marginTop: 3 },
  secHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  secTitle: { fontSize: 15, fontWeight: '700', color: '#1A201C' },
  secRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secCountBadge: { backgroundColor: '#EAECEB', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  secCount: { fontSize: 13, fontWeight: '700', color: '#1A201C' },
  noData: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12, marginBottom: 8 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#F3F4F6', marginLeft: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#1A201C' },
  cardMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardFee: { fontSize: 15, fontWeight: '700', color: '#4A7C59' },
  statusDot: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusDotText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A201C', marginTop: 24 },
  emptySub: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4A7C59', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 28 },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  fab: {
    position: 'absolute', bottom: 28, right: 20, width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#4A7C59', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#4A7C59', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 32 },
  csvModalBox: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 },
  csvModalTitle: { fontSize: 18, fontWeight: '700', color: '#1A201C', marginBottom: 4 },
  csvModalSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  csvOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  csvOptText: { fontSize: 15, fontWeight: '600', color: '#1A201C', flex: 1 },
});
