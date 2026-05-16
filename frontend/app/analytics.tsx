import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatINR } from '../utils/helpers';
import { getCases, CaseItem } from '../utils/storage';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Analytics() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'year'>('month');

  useEffect(() => { getCases().then(setCases).finally(() => setLoading(false)); }, []);

  const now = new Date();
  const cm = now.getMonth() + 1, cy = now.getFullYear();

  const monthly: Record<string, { month: string; total_cases: number; total_fees: number; received: number; pending: number }> = {};
  cases.forEach(c => {
    try {
      const p = c.date.split('/');
      if (p.length !== 3) return;
      const m = parseInt(p[1]), y = parseInt(p[2]);
      const key = `${y}-${m.toString().padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { month: key, total_cases: 0, total_fees: 0, received: 0, pending: 0 };
      monthly[key].total_cases++;
      monthly[key].total_fees += c.anaesthesia_fees;
      if (c.payment_status === 'paid') monthly[key].received += c.anaesthesia_fees;
      else monthly[key].pending += c.anaesthesia_fees;
    } catch {}
  });

  const cmKey = `${cy}-${cm.toString().padStart(2, '0')}`;
  const currentMonthStats = monthly[cmKey] || { total_cases: 0, total_fees: 0, received: 0, pending: 0 };
  const yearStats = { total_cases: 0, total_fees: 0, received: 0, pending: 0 };
  Object.entries(monthly).forEach(([k, v]) => { if (k.startsWith(String(cy))) { yearStats.total_cases += v.total_cases; yearStats.total_fees += v.total_fees; yearStats.received += v.received; yearStats.pending += v.pending; } });
  const breakdown = Object.values(monthly).sort((a, b) => b.month.localeCompare(a.month));
  const stats = view === 'month' ? currentMonthStats : yearStats;

  const formatMonth = (key: string) => { const [y, m] = key.split('-'); return `${MONTHS[parseInt(m) - 1]} ${y}`; };

  if (loading) return <SafeAreaView style={st.container}><ActivityIndicator testID="analytics-loading" size="large" color="#4A7C59" style={{ marginTop: 120 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity testID="analytics-back-btn" onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Ionicons name="chevron-back" size={24} color="#1A201C" /></TouchableOpacity>
        <Text style={st.headerTitle}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={st.toggle}>
          <TouchableOpacity testID="analytics-month-tab" style={[st.toggleBtn, view === 'month' && st.toggleActive]} onPress={() => setView('month')}><Text style={[st.toggleText, view === 'month' && st.toggleTextActive]}>This Month</Text></TouchableOpacity>
          <TouchableOpacity testID="analytics-year-tab" style={[st.toggleBtn, view === 'year' && st.toggleActive]} onPress={() => setView('year')}><Text style={[st.toggleText, view === 'year' && st.toggleTextActive]}>This Year</Text></TouchableOpacity>
        </View>
        <View style={st.statsGrid}>
          <View style={st.statCard}><Text style={st.statLabel}>Total Cases</Text><Text style={st.statValue}>{stats.total_cases}</Text></View>
          <View style={st.statCard}><Text style={st.statLabel}>Total Fees</Text><Text style={st.statValue}>₹{formatINR(stats.total_fees)}</Text></View>
          <View style={[st.statCard, { backgroundColor: '#E8F5E9' }]}><Text style={[st.statLabel, { color: '#4A7C59' }]}>Received</Text><Text style={[st.statValue, { color: '#4A7C59' }]}>₹{formatINR(stats.received)}</Text></View>
          <View style={[st.statCard, { backgroundColor: '#FFF3E0' }]}><Text style={[st.statLabel, { color: '#E65100' }]}>Pending</Text><Text style={[st.statValue, { color: '#E65100' }]}>₹{formatINR(stats.pending)}</Text></View>
        </View>
        {stats.total_fees > 0 && <View style={st.progressSection}><Text style={st.progressTitle}>Collection Rate</Text><View style={st.progressBar}><View style={[st.progressFill, { width: `${Math.round((stats.received / stats.total_fees) * 100)}%` }]} /></View><Text style={st.progressText}>{Math.round((stats.received / stats.total_fees) * 100)}% collected</Text></View>}
        <Text style={st.sectionTitle}>Monthly Breakdown</Text>
        {breakdown.length === 0 ? <Text style={st.emptyText}>No data yet</Text> : breakdown.map(m => (
          <View key={m.month} style={st.monthCard}>
            <View style={st.monthHeader}><Text style={st.monthName}>{formatMonth(m.month)}</Text><Text style={st.monthTotal}>₹{formatINR(m.total_fees)}</Text></View>
            <View style={st.monthRow}><Text style={st.monthCases}>{m.total_cases} case{m.total_cases !== 1 ? 's' : ''}</Text><View style={st.monthStats}><Text style={st.monthReceived}>₹{formatINR(m.received)} paid</Text>{m.pending > 0 && <Text style={st.monthPending}>₹{formatINR(m.pending)} due</Text>}</View></View>
            {m.total_fees > 0 && <View style={st.miniProgress}><View style={[st.miniProgressFill, { width: `${Math.min(100, Math.round((m.received / m.total_fees) * 100))}%` }]} /></View>}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A201C' },
  scrollContent: { paddingHorizontal: 20 },
  toggle: { flexDirection: 'row', backgroundColor: '#EAECEB', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: '#FFFFFF' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' }, toggleTextActive: { color: '#1A201C' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  statLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1A201C', marginTop: 4 },
  progressSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#1A201C', marginBottom: 10 },
  progressBar: { height: 8, backgroundColor: '#EAECEB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4A7C59', borderRadius: 4 },
  progressText: { fontSize: 13, color: '#6B7280', marginTop: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },
  monthCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  monthName: { fontSize: 15, fontWeight: '700', color: '#1A201C' },
  monthTotal: { fontSize: 16, fontWeight: '700', color: '#1A201C' },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthCases: { fontSize: 13, color: '#6B7280' },
  monthStats: { flexDirection: 'row', gap: 10 },
  monthReceived: { fontSize: 12, color: '#4A7C59', fontWeight: '600' },
  monthPending: { fontSize: 12, color: '#E65100', fontWeight: '600' },
  miniProgress: { height: 4, backgroundColor: '#EAECEB', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  miniProgressFill: { height: '100%', backgroundColor: '#4A7C59', borderRadius: 2 },
});
