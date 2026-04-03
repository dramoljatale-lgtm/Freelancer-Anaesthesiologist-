import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatINR } from '../../utils/helpers';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface CaseData {
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

export default function CaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetchCase();
  }, [id]);

  const fetchCase = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setCaseData(data);
    } catch {
      Alert.alert('Error', 'Case not found');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Case', 'Are you sure you want to delete this case?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${BACKEND_URL}/api/cases/${id}`, { method: 'DELETE' });
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete case');
          }
        },
      },
    ]);
  };

  const generateBillHTML = (c: CaseData) => {
    const isa = c.isa_rvg_details;
    const isaSection = isa ? `
      <div class="section">
        <div class="section-title">ISA-RVG Fee Calculation</div>
        <div class="info-row"><span class="lbl">City Tier</span><span class="val">${isa.city_tier}</span></div>
        <div class="info-row"><span class="lbl">Surgical Complexity</span><span class="val">${isa.surgical_complexity}</span></div>
        <div class="info-row"><span class="lbl">Duration</span><span class="val">${isa.duration_minutes} minutes</span></div>
        <div class="info-row"><span class="lbl">Base Units</span><span class="val">${isa.base_units}</span></div>
        <div class="info-row"><span class="lbl">Time Units</span><span class="val">${isa.time_units}</span></div>
        <div class="info-row"><span class="lbl">ASA Units</span><span class="val">${isa.asa_units}</span></div>
        <div class="info-row total-row"><span class="lbl bold">Total Units</span><span class="val bold">${isa.total_units}</span></div>
        <div class="info-row"><span class="lbl">Rate per Unit</span><span class="val">${isa.rate_per_unit}</span></div>
        ${isa.emergency ? '<div class="info-row"><span class="lbl emergency">Emergency Surcharge</span><span class="val emergency">+30%</span></div>' : ''}
        <div class="info-row total-row"><span class="lbl bold green">ISA-RVG Standard Fee</span><span class="val bold green">${formatINR(isa.final_fee)}</span></div>
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A201C;padding:40px;max-width:600px;margin:0 auto}
.header{text-align:center;padding-bottom:20px;border-bottom:3px solid #4A7C59;margin-bottom:24px}
.header h1{font-size:20px;color:#4A7C59;letter-spacing:2px;text-transform:uppercase}
.header p{color:#6B7280;font-size:12px;margin-top:4px}
.section{margin-bottom:20px}
.section-title{font-size:13px;font-weight:700;color:#4A7C59;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;border-bottom:1px solid #E5E7EB;margin-bottom:10px}
.info-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
.lbl{color:#6B7280}
.val{font-weight:600}
.bold{font-weight:700;color:#1A201C}
.green{color:#4A7C59!important}
.emergency{color:#D95D39!important}
.total-row{border-top:1px solid #E5E7EB;margin-top:6px;padding-top:8px}
.fee-box{background:#E8F5E9;border-radius:12px;padding:20px;text-align:center;margin:20px 0}
.fee-box .label{font-size:12px;color:#4A7C59;font-weight:600}
.fee-box .amount{font-size:28px;font-weight:800;color:#4A7C59}
.footer{text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;color:#6B7280;font-size:11px}
</style></head><body>
<div class="header">
  <h1>Anaesthesia Fee Receipt</h1>
  <p>${c.hospital || 'Hospital'}</p>
</div>
<div class="section">
  <div class="section-title">Patient Information</div>
  <div class="info-row"><span class="lbl">Name</span><span class="val">${c.patient_name}</span></div>
  <div class="info-row"><span class="lbl">Age / Gender</span><span class="val">${c.age} yrs / ${c.gender}</span></div>
  <div class="info-row"><span class="lbl">Date</span><span class="val">${c.date}</span></div>
</div>
<div class="section">
  <div class="section-title">Surgery Details</div>
  <div class="info-row"><span class="lbl">Surgery</span><span class="val">${c.surgery_name}</span></div>
  <div class="info-row"><span class="lbl">Surgeon</span><span class="val">${c.surgeon_name || '-'}</span></div>
  <div class="info-row"><span class="lbl">Anaesthesia Type</span><span class="val">${c.anaesthesia_type}</span></div>
</div>
${isaSection}
<div class="fee-box">
  <div class="label">Total Anaesthesia Fee</div>
  <div class="amount">&#8377;${formatINR(c.anaesthesia_fees)}</div>
</div>
${c.notes ? `<div class="section"><div class="section-title">Notes</div><p style="font-size:13px;color:#6B7280">${c.notes}</p></div>` : ''}
<div class="footer">
  <p>This is a computer-generated receipt</p>
  <p>Generated on ${new Date().toLocaleDateString('en-IN')}</p>
</div>
</body></html>`;
  };

  const handleGeneratePDF = async () => {
    if (!caseData) return;
    setPdfLoading(true);
    try {
      const html = generateBillHTML(caseData);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Bill Receipt' });
      }
    } catch {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={st.container}>
        <ActivityIndicator testID="detail-loading" size="large" color="#4A7C59" style={{ marginTop: 120 }} />
      </SafeAreaView>
    );
  }

  if (!caseData) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#1A201C" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>Case not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const c = caseData;
  const isa = c.isa_rvg_details;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.headerBar}>
        <TouchableOpacity testID="detail-back-btn" onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#1A201C" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Case Details</Text>
        <TouchableOpacity testID="delete-case-btn" onPress={handleDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="trash-outline" size={22} color="#D95D39" />
        </TouchableOpacity>
      </View>

      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Fee Hero */}
        <View style={st.feeHero}>
          <Text style={st.feeHeroLabel}>Anaesthesia Fee</Text>
          <Text style={st.feeHeroAmount}>₹{formatINR(c.anaesthesia_fees)}</Text>
          {isa && (
            <View style={st.isaTag}>
              <Ionicons name="calculator" size={12} color="#4A7C59" />
              <Text style={st.isaTagText}>ISA-RVG Standard</Text>
            </View>
          )}
        </View>

        {/* Patient Info */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Patient Information</Text>
          <InfoRow label="Name" value={c.patient_name} />
          <InfoRow label="Age" value={`${c.age} years`} />
          <InfoRow label="Gender" value={c.gender} />
          <InfoRow label="Date" value={c.date} />
        </View>

        {/* Surgery Info */}
        <View style={st.card}>
          <Text style={st.cardTitle}>Surgery Details</Text>
          <InfoRow label="Surgery" value={c.surgery_name} />
          <InfoRow label="Surgeon" value={c.surgeon_name || '-'} />
          <InfoRow label="Hospital" value={c.hospital || '-'} />
          <InfoRow label="Anaesthesia" value={c.anaesthesia_type} />
        </View>

        {/* ISA-RVG Breakdown */}
        {isa && (
          <View style={[st.card, { borderColor: '#4A7C59', borderWidth: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="calculator" size={16} color="#4A7C59" />
              <Text style={[st.cardTitle, { marginBottom: 0, color: '#4A7C59' }]}>ISA-RVG Breakdown</Text>
            </View>
            <InfoRow label="City Tier" value={isa.city_tier} />
            <InfoRow label="Complexity" value={isa.surgical_complexity} />
            <InfoRow label="Duration" value={`${isa.duration_minutes} min`} />
            <View style={st.breakdownBox}>
              <View style={st.bRow}>
                <Text style={st.bLabel}>Base Units</Text>
                <Text style={st.bVal}>{isa.base_units}</Text>
              </View>
              <View style={st.bRow}>
                <Text style={st.bLabel}>Time Units</Text>
                <Text style={st.bVal}>{isa.time_units}</Text>
              </View>
              <View style={st.bRow}>
                <Text style={st.bLabel}>ASA Units</Text>
                <Text style={st.bVal}>{isa.asa_units}</Text>
              </View>
              <View style={[st.bRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6, marginTop: 4 }]}>
                <Text style={[st.bLabel, { fontWeight: '700', color: '#1A201C' }]}>Total Units</Text>
                <Text style={[st.bVal, { fontWeight: '700' }]}>{isa.total_units}</Text>
              </View>
            </View>
            <InfoRow label="Rate/Unit" value={`₹${formatINR(isa.rate_per_unit)}`} />
            {isa.emergency && <InfoRow label="Emergency" value="+30% surcharge" valueColor="#D95D39" />}
            {isa.case_cancelled && <InfoRow label="Cancelled" value="Fee 100% (ISA guideline)" />}
            <View style={st.isaFinalBox}>
              <Text style={st.isaFinalLabel}>Standard Fee</Text>
              <Text style={st.isaFinalAmount}>₹{formatINR(isa.final_fee)}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {c.notes ? (
          <View style={st.card}>
            <Text style={st.cardTitle}>Notes</Text>
            <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>{c.notes}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <TouchableOpacity
          testID="generate-pdf-btn"
          style={st.pdfBtn}
          onPress={handleGeneratePDF}
          disabled={pdfLoading}
          activeOpacity={0.8}
        >
          {pdfLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
              <Text style={st.pdfBtnText}>Generate Bill Receipt (PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={st.infoRow}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={[st.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A201C' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  feeHero: {
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  feeHeroLabel: { fontSize: 13, fontWeight: '600', color: '#4A7C59' },
  feeHeroAmount: { fontSize: 36, fontWeight: '800', color: '#4A7C59', marginTop: 4, letterSpacing: -1 },
  isaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  isaTagText: { fontSize: 12, fontWeight: '600', color: '#4A7C59' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A201C', maxWidth: '60%', textAlign: 'right' },
  breakdownBox: {
    backgroundColor: '#F7F7F8',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  bRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  bLabel: { fontSize: 13, color: '#6B7280' },
  bVal: { fontSize: 13, fontWeight: '600', color: '#1A201C' },
  isaFinalBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  isaFinalLabel: { fontSize: 12, fontWeight: '600', color: '#4A7C59' },
  isaFinalAmount: { fontSize: 24, fontWeight: '800', color: '#4A7C59', marginTop: 2 },
  pdfBtn: {
    backgroundColor: '#4A7C59',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  pdfBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
