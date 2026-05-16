import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomPicker from '../components/CustomPicker';
import AddablePicker from '../components/AddablePicker';
import ISARVGCalculator, { ISARVGDetailsType } from '../components/ISARVGCalculator';
import { formatINR } from '../utils/helpers';
import { apiFetch } from '../utils/api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const GENDERS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];
const ANAESTHESIA_TYPES = [
  { label: 'General', value: 'General' },
  { label: 'Regional', value: 'Regional' },
  { label: 'Local', value: 'Local' },
  { label: 'Sedation', value: 'Sedation' },
  { label: 'Combined', value: 'Combined' },
];
const PAYMENT_MODES = [
  { label: 'Cash', value: 'Cash' },
  { label: 'UPI', value: 'UPI' },
  { label: 'Cheque', value: 'Cheque' },
  { label: 'Bank Transfer', value: 'Bank Transfer' },
];

const getDefaultDate = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export default function AddCase() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');
  const [calcVisible, setCalcVisible] = useState(false);

  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [surgeryName, setSurgeryName] = useState('');
  const [surgeonName, setSurgeonName] = useState('');
  const [hospital, setHospital] = useState('');
  const [date, setDate] = useState(getDefaultDate());
  const [anaesthesiaType, setAnaesthesiaType] = useState('General');
  const [fees, setFees] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [isaDetails, setIsaDetails] = useState<ISARVGDetailsType | null>(null);

  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);
  const [surgeons, setSurgeons] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    apiFetch('/api/hospitals').then(r => r.json()).then(setHospitals).catch(() => {});
    apiFetch('/api/surgeons').then(r => r.json()).then(setSurgeons).catch(() => {});
  }, []);

  const addHospital = async (name: string) => {
    const res = await apiFetch('/api/hospitals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setHospitals(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const addSurgeon = async (name: string) => {
    const res = await apiFetch('/api/surgeons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setSurgeons(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleUseAmount = (fee: number, details: ISARVGDetailsType) => {
    setFees(fee.toString());
    setIsaDetails(details);
    setCalcVisible(false);
  };

  const handleSave = async (paymentStatus: string) => {
    if (!patientName.trim()) return Alert.alert('Required', 'Patient name is required');
    if (!surgeryName.trim()) return Alert.alert('Required', 'Surgery name is required');
    if (!fees.trim() || isNaN(parseFloat(fees))) return Alert.alert('Required', 'Enter valid anaesthesia fees');

    setSaving(true);
    setSavingStatus(paymentStatus);
    try {
      const res = await apiFetch('/api/cases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName.trim(), age: parseInt(age) || 0, gender,
          surgery_name: surgeryName.trim(), surgeon_name: surgeonName.trim(),
          hospital: hospital.trim(), date: date.trim(), anaesthesia_type: anaesthesiaType,
          anaesthesia_fees: parseFloat(fees), notes: notes.trim(),
          payment_status: paymentStatus, mode_of_payment: modeOfPayment,
          isa_rvg_details: isaDetails,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      router.back();
    } catch { Alert.alert('Error', 'Failed to save case.'); }
    finally { setSaving(false); setSavingStatus(''); }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#1A201C" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Case</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={s.section}>Patient Information</Text>
          <Text style={s.label}>Patient Name *</Text>
          <TextInput testID="patient-name-input" style={s.input} value={patientName} onChangeText={setPatientName} placeholder="Enter patient name" placeholderTextColor="#9CA3AF" />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Age</Text>
              <TextInput testID="age-input" style={s.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={s.label}>Gender</Text>
              <CustomPicker testID="gender-select" options={GENDERS} selectedValue={gender} onValueChange={setGender} placeholder="Gender" />
            </View>
          </View>

          <Text style={[s.section, { marginTop: 28 }]}>Surgery Details</Text>
          <Text style={s.label}>Surgery Name *</Text>
          <TextInput testID="surgery-name-input" style={s.input} value={surgeryName} onChangeText={setSurgeryName} placeholder="Enter surgery name" placeholderTextColor="#9CA3AF" />

          <Text style={s.label}>Surgeon</Text>
          <AddablePicker testID="surgeon-select" items={surgeons} selectedValue={surgeonName} onValueChange={setSurgeonName} onAddNew={addSurgeon} placeholder="Surgeon" />

          <Text style={s.label}>Hospital</Text>
          <AddablePicker testID="hospital-select" items={hospitals} selectedValue={hospital} onValueChange={setHospital} onAddNew={addHospital} placeholder="Hospital" />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Date</Text>
              <TextInput testID="date-input" style={s.input} value={date} onChangeText={setDate} placeholder="DD/MM/YYYY" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={s.label}>Anaesthesia Type</Text>
              <CustomPicker testID="anaesthesia-type-select" options={ANAESTHESIA_TYPES} selectedValue={anaesthesiaType} onValueChange={setAnaesthesiaType} placeholder="Type" />
            </View>
          </View>

          <Text style={[s.section, { marginTop: 28 }]}>Fees & Payment</Text>
          <Text style={s.label}>Anaesthesia Fees (₹) *</Text>
          <TextInput testID="anaesthesia-fees-input" style={s.input} value={fees} onChangeText={(t) => { setFees(t); if (isaDetails) setIsaDetails(null); }} placeholder="Enter amount" keyboardType="numeric" placeholderTextColor="#9CA3AF" />

          <Text style={s.label}>Mode of Payment</Text>
          <CustomPicker testID="mode-of-payment-select" options={PAYMENT_MODES} selectedValue={modeOfPayment} onValueChange={setModeOfPayment} placeholder="Payment mode" />

          <TouchableOpacity testID="calculate-isa-fee-btn" style={s.calcBtn} onPress={() => setCalcVisible(true)} activeOpacity={0.7}>
            <View style={s.calcIcon}><Ionicons name="calculator" size={18} color="#4A7C59" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.calcBtnTitle}>Calculate Standard Fee</Text>
              <Text style={s.calcBtnSub}>ISA-RVG based guidelines</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#4A7C59" />
          </TouchableOpacity>

          {isaDetails && (
            <View style={s.isaBadge}>
              <View style={s.isaBadgeTop}>
                <Ionicons name="checkmark-circle" size={18} color="#4A7C59" />
                <Text style={s.isaBadgeTitle}>Standard Fee Applied</Text>
              </View>
              <Text style={s.isaBadgeDetail}>{isaDetails.total_units} units × ₹{formatINR(isaDetails.rate_per_unit)} = ₹{formatINR(isaDetails.base_fee)}{isaDetails.emergency ? ' + 30% emergency' : ''}</Text>
              <Text style={s.isaBadgeFee}>Final: ₹{formatINR(isaDetails.final_fee)}</Text>
            </View>
          )}

          <Text style={[s.label, { marginTop: 28 }]}>Notes</Text>
          <TextInput testID="notes-input" style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]} value={notes} onChangeText={setNotes} placeholder="Additional notes..." placeholderTextColor="#9CA3AF" multiline />

          <View style={s.saveBtns}>
            <TouchableOpacity testID="save-paid-btn" style={[s.savePaidBtn, saving && savingStatus === 'paid' && { opacity: 0.6 }]} onPress={() => handleSave('paid')} disabled={saving} activeOpacity={0.8}>
              {saving && savingStatus === 'paid' ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="checkmark-circle" size={18} color="#FFFFFF" /><Text style={s.savePaidText}>Save — Paid</Text></>}
            </TouchableOpacity>
            <TouchableOpacity testID="save-pending-btn" style={[s.savePendingBtn, saving && savingStatus === 'pending' && { opacity: 0.6 }]} onPress={() => handleSave('pending')} disabled={saving} activeOpacity={0.8}>
              {saving && savingStatus === 'pending' ? <ActivityIndicator color="#E65100" /> : <><Ionicons name="time-outline" size={18} color="#E65100" /><Text style={s.savePendingText}>Save — Pending</Text></>}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ISARVGCalculator visible={calcVisible} onClose={() => setCalcVisible(false)} onUseAmount={handleUseAmount} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F7F7F8' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A201C' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  section: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A201C', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: '#1A201C' },
  row: { flexDirection: 'row', gap: 12 },
  calcBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#4A7C59', borderStyle: 'dashed', borderRadius: 14, padding: 16, marginTop: 16, gap: 12 },
  calcIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  calcBtnTitle: { fontSize: 14, fontWeight: '700', color: '#4A7C59' },
  calcBtnSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  isaBadge: { backgroundColor: '#F0F7F2', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#4A7C59' },
  isaBadgeTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  isaBadgeTitle: { fontSize: 14, fontWeight: '700', color: '#4A7C59' },
  isaBadgeDetail: { fontSize: 13, color: '#2C3E30', lineHeight: 18 },
  isaBadgeFee: { fontSize: 16, fontWeight: '800', color: '#4A7C59', marginTop: 4 },
  saveBtns: { marginTop: 28, gap: 12 },
  savePaidBtn: { backgroundColor: '#4A7C59', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  savePaidText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  savePendingBtn: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E65100', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  savePendingText: { fontSize: 16, fontWeight: '700', color: '#E65100' },
});
