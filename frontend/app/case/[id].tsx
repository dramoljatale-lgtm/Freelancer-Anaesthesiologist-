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
  payment_status: string;
  mode_of_payment: string;
  receipt_no: string;
  isa_rvg_details: any;
  created_at: string;
}

interface DoctorProfile {
  name: string;
  degree: string;
  registration_no: string;
  designation: string;
  city: string;
  signature_base64: string;
}

export default function CaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    Promise.all([fetchCase(), fetchDoctor()]).then(() => setLoading(false));
  }, [id]);

  const fetchCase = async () => {
    try {
      const res = await apiFetch(`/api/cases/${id}`);
      if (!res.ok) throw new Error('Not found');
      setCaseData(await res.json());
    } catch {
      Alert.alert('Error', 'Case not found');
    }
  };

  const fetchDoctor = async () => {
    try {
      const res = await apiFetch(`/api/doctor-profile`);
      const data = await res.json();
      if (data.name) setDoctor(data);
    } catch {}
  };

  const handleToggleStatus = async () => {
    if (!caseData) return;
    const newStatus = caseData.payment_status === 'paid' ? 'pending' : 'paid';
    setStatusLoading(true);
    try {
      const res = await apiFetch(`/api/cases/${id}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      setCaseData({ ...caseData, payment_status: newStatus });
    } catch {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setStatusLoading(false);
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
            await apiFetch(`/api/cases/${id}`, { method: 'DELETE' });
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete case');
          }
        },
      },
    ]);
  };

  const generateBillHTML = (c: CaseData, doc: DoctorProfile | null) => {
    const drName = doc?.name || 'Doctor Name';
    const drDegree = doc?.degree || '';
    const drDesig = doc?.designation || 'Consultant Anaesthesiologist';
    const drCity = doc?.city || '';
    const drReg = doc?.registration_no || '---';
    const drSig = doc?.signature_base64 || '';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Georgia',serif;color:#1A201C;padding:48px 40px;max-width:620px;margin:0 auto;line-height:1.5}
.receipt-title{text-align:center;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#4A7C59;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #4A7C59}
.doctor-block{text-align:center;margin-bottom:28px}
.doctor-name{font-size:20px;font-weight:700;color:#1A201C}
.doctor-degree{font-size:14px;color:#4A7C59;font-weight:600;margin-top:2px}
.doctor-desig{font-size:13px;color:#6B7280;margin-top:2px}
.doctor-reg{font-size:12px;color:#6B7280;margin-top:4px}
.meta-row{display:flex;justify-content:space-between;font-size:13px;color:#6B7280;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid #E5E7EB}
.section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#4A7C59;margin-bottom:12px;margin-top:20px}
.detail-row{display:flex;justify-content:space-between;font-size:14px;padding:4px 0}
.detail-label{color:#6B7280}
.detail-value{font-weight:600;color:#1A201C}
.fee-statement{font-size:16px;font-weight:600;margin:28px 0;padding:16px;background:#F0F7F2;border-radius:8px;text-align:center;color:#1A201C}
.fee-statement .amount{color:#4A7C59;font-weight:800;font-size:18px}
.payment-mode{font-size:14px;color:#6B7280;margin-bottom:32px}
.payment-mode strong{color:#1A201C}
.signature-block{text-align:right;margin-top:48px;padding-top:16px}
.signature-img{max-width:180px;max-height:60px;margin-bottom:8px}
.signature-line{display:inline-block;width:200px;border-top:1px solid #1A201C;padding-top:6px;font-size:13px;color:#6B7280}
.footer{text-align:center;margin-top:32px;font-size:11px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:12px}
</style></head><body>

<div class="receipt-title">Receipt for Professional Services</div>

<div class="doctor-block">
  <div class="doctor-name">${drName}</div>
  ${drDegree ? `<div class="doctor-degree">${drDegree}</div>` : ''}
  <div class="doctor-desig">${drDesig}${drCity ? ` | ${drCity}` : ''}</div>
  <div class="doctor-reg">Reg No: ${drReg}</div>
</div>

<div class="meta-row">
  <span>Receipt No: <strong>${c.receipt_no || '---'}</strong></span>
  <span>Date: <strong>${c.date}</strong></span>
</div>

<div class="section-title">Case Details</div>
<div class="detail-row"><span class="detail-label">Patient Name</span><span class="detail-value">${c.patient_name}</span></div>
<div class="detail-row"><span class="detail-label">Primary Surgeon</span><span class="detail-value">${c.surgeon_name || '-'}</span></div>
<div class="detail-row"><span class="detail-label">Hospital / Clinic</span><span class="detail-value">${c.hospital || '-'}</span></div>
<div class="detail-row"><span class="detail-label">Surgical Procedure</span><span class="detail-value">${c.surgery_name}</span></div>

<div class="fee-statement">
  Received <span class="amount">&#8377;${formatINR(c.anaesthesia_fees)}</span> as anaesthesia fees.
</div>

<div class="payment-mode">Mode of Payment: <strong>${c.mode_of_payment || 'Cash'}</strong></div>

<div class="signature-block">
  ${drSig ? `<img src="${drSig}" class="signature-img" /><br/>` : ''}
  <div class="signature-line">Signature</div>
</div>

<div class="footer">This is a computer-generated receipt</div>
</body></html>`;
  };

  const handleGeneratePDF = async () => {
    if (!caseData) return;
    setPdfLoading(true);
    try {
      const html = generateBillHTML(caseData, doctor);
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
  const isPaid = c.payment_status === 'paid';

  return (
    <SafeAreaView style={st.container} edges={['top']}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <View style={[st.statusBadge, isPaid ? st.statusPaid : st.statusPending]}>
              <Text style={st.statusBadgeText}>{isPaid ? 'PAID' : 'PENDING'}</Text>
            </View>
            {c.receipt_no ? (
              <Text style={st.receiptNo}>{c.receipt_no}</Text>
            ) : null}
          </View>
        </View>

        {/* Toggle Payment Status */}
        <TouchableOpacity
          testID="toggle-payment-status-btn"
          style={[st.toggleStatusBtn, isPaid ? st.toggleToPending : st.toggleToPaid]}
          onPress={handleToggleStatus}
          disabled={statusLoading}
          activeOpacity={0.8}
        >
          {statusLoading ? (
            <ActivityIndicator color={isPaid ? '#E65100' : '#4A7C59'} />
          ) : (
            <>
              <Ionicons name={isPaid ? 'time-outline' : 'checkmark-circle'} size={18} color={isPaid ? '#E65100' : '#4A7C59'} />
              <Text style={[st.toggleStatusText, { color: isPaid ? '#E65100' : '#4A7C59' }]}>
                {isPaid ? 'Mark as Pending' : 'Mark as Paid'}
              </Text>
            </>
          )}
        </TouchableOpacity>

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
          <InfoRow label="Payment Mode" value={c.mode_of_payment || 'Cash'} />
        </View>

        {/* Standard Fee Breakdown */}
        {isa && (
          <View style={[st.card, { borderColor: '#4A7C59', borderWidth: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Ionicons name="calculator" size={16} color="#4A7C59" />
              <Text style={[st.cardTitle, { marginBottom: 0, color: '#4A7C59' }]}>Standard Fee Breakdown</Text>
            </View>
            <InfoRow label="City Tier" value={isa.city_tier} />
            <InfoRow label="Complexity" value={isa.surgical_complexity} />
            <InfoRow label="Duration" value={`${isa.duration_minutes} min`} />
            <View style={st.breakdownBox}>
              <View style={st.bRow}><Text style={st.bLabel}>Base Units</Text><Text style={st.bVal}>{isa.base_units}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>Time Units</Text><Text style={st.bVal}>{isa.time_units}</Text></View>
              <View style={st.bRow}><Text style={st.bLabel}>ASA Units</Text><Text style={st.bVal}>{isa.asa_units}</Text></View>
              <View style={[st.bRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6, marginTop: 4 }]}>
                <Text style={[st.bLabel, { fontWeight: '700', color: '#1A201C' }]}>Total Units</Text>
                <Text style={[st.bVal, { fontWeight: '700' }]}>{isa.total_units}</Text>
              </View>
            </View>
            <InfoRow label="Rate/Unit" value={`₹${formatINR(isa.rate_per_unit)}`} />
            {isa.emergency && <InfoRow label="Emergency" value="+30% surcharge" valueColor="#D95D39" />}
            <View style={st.isaFinalBox}>
              <Text style={st.isaFinalLabel}>Standard Fee</Text>
              <Text style={st.isaFinalAmount}>₹{formatINR(isa.final_fee)}</Text>
            </View>
          </View>
        )}

        {c.notes ? (
          <View style={st.card}>
            <Text style={st.cardTitle}>Notes</Text>
            <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>{c.notes}</Text>
          </View>
        ) : null}

        {/* Doctor Info Reminder */}
        {!doctor && (
          <TouchableOpacity style={st.profileReminder} onPress={() => router.push('/profile')} activeOpacity={0.7}>
            <Ionicons name="alert-circle-outline" size={18} color="#E65100" />
            <Text style={st.profileReminderText}>Set up your doctor profile for professional receipts</Text>
            <Ionicons name="chevron-forward" size={16} color="#E65100" />
          </TouchableOpacity>
        )}

        {/* PDF Button */}
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
    marginBottom: 12,
  },
  feeHeroLabel: { fontSize: 13, fontWeight: '600', color: '#4A7C59' },
  feeHeroAmount: { fontSize: 36, fontWeight: '800', color: '#4A7C59', marginTop: 4, letterSpacing: -1 },
  receiptNo: { fontSize: 12, fontWeight: '600', color: '#4A7C59', backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusPaid: { backgroundColor: '#4A7C59' },
  statusPending: { backgroundColor: '#E65100' },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  toggleStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  toggleToPaid: { borderColor: '#4A7C59', backgroundColor: '#F0F7F2' },
  toggleToPending: { borderColor: '#E65100', backgroundColor: '#FFF8F0' },
  toggleStatusText: { fontSize: 14, fontWeight: '700' },
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
  profileReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  profileReminderText: { fontSize: 13, color: '#E65100', flex: 1, fontWeight: '500' },
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
