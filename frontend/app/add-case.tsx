import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomPicker from '../components/CustomPicker';
import ISARVGCalculator, { ISARVGDetailsType } from '../components/ISARVGCalculator';
import { formatINR } from '../utils/helpers';

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

const getDefaultDate = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export default function AddCase() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
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
  const [notes, setNotes] = useState('');
  const [isaDetails, setIsaDetails] = useState<ISARVGDetailsType | null>(null);

  const handleUseAmount = (fee: number, details: ISARVGDetailsType) => {
    setFees(fee.toString());
    setIsaDetails(details);
    setCalcVisible(false);
  };

  const handleSave = async () => {
    if (!patientName.trim()) return Alert.alert('Required', 'Patient name is required');
    if (!surgeryName.trim()) return Alert.alert('Required', 'Surgery name is required');
    if (!fees.trim() || isNaN(parseFloat(fees))) return Alert.alert('Required', 'Enter valid anaesthesia fees');

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          age: parseInt(age) || 0,
          gender,
          surgery_name: surgeryName.trim(),
          surgeon_name: surgeonName.trim(),
          hospital: hospital.trim(),
          date: date.trim(),
          anaesthesia_type: anaesthesiaType,
          anaesthesia_fees: parseFloat(fees),
          notes: notes.trim(),
          isa_rvg_details: isaDetails,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save case. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#1A201C" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Add Case</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          style={st.scroll}
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Patient Info */}
          <Text style={st.section}>Patient Information</Text>

          <Text style={st.label}>Patient Name *</Text>
          <TextInput testID="patient-name-input" style={st.input} value={patientName} onChangeText={setPatientName} placeholder="Enter patient name" placeholderTextColor="#9CA3AF" />

          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Age</Text>
              <TextInput testID="age-input" style={st.input} value={age} onChangeText={setAge} placeholder="Age" keyboardType="numeric" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={st.label}>Gender</Text>
              <CustomPicker testID="gender-select" options={GENDERS} selectedValue={gender} onValueChange={setGender} placeholder="Gender" />
            </View>
          </View>

          {/* Surgery */}
          <Text style={[st.section, { marginTop: 28 }]}>Surgery Details</Text>

          <Text style={st.label}>Surgery Name *</Text>
          <TextInput testID="surgery-name-input" style={st.input} value={surgeryName} onChangeText={setSurgeryName} placeholder="Enter surgery name" placeholderTextColor="#9CA3AF" />

          <Text style={st.label}>Surgeon Name</Text>
          <TextInput testID="surgeon-name-input" style={st.input} value={surgeonName} onChangeText={setSurgeonName} placeholder="Enter surgeon name" placeholderTextColor="#9CA3AF" />

          <Text style={st.label}>Hospital</Text>
          <TextInput testID="hospital-input" style={st.input} value={hospital} onChangeText={setHospital} placeholder="Enter hospital name" placeholderTextColor="#9CA3AF" />

          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.label}>Date</Text>
              <TextInput testID="date-input" style={st.input} value={date} onChangeText={setDate} placeholder="DD/MM/YYYY" placeholderTextColor="#9CA3AF" />
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={st.label}>Anaesthesia Type</Text>
              <CustomPicker testID="anaesthesia-type-select" options={ANAESTHESIA_TYPES} selectedValue={anaesthesiaType} onValueChange={setAnaesthesiaType} placeholder="Type" />
            </View>
          </View>

          {/* Fees */}
          <Text style={[st.section, { marginTop: 28 }]}>Fees</Text>

          <Text style={st.label}>Anaesthesia Fees (₹) *</Text>
          <TextInput
            testID="anaesthesia-fees-input"
            style={st.input}
            value={fees}
            onChangeText={(t) => { setFees(t); if (isaDetails) setIsaDetails(null); }}
            placeholder="Enter amount"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />

          {/* ISA-RVG Button */}
          <TouchableOpacity testID="calculate-isa-fee-btn" style={st.calcBtn} onPress={() => setCalcVisible(true)} activeOpacity={0.7}>
            <View style={st.calcIcon}>
              <Ionicons name="calculator" size={18} color="#4A7C59" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.calcBtnTitle}>Calculate ISA-RVG Standard Fee</Text>
              <Text style={st.calcBtnSub}>Compare with ISA guidelines</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#4A7C59" />
          </TouchableOpacity>

          {/* ISA Badge */}
          {isaDetails && (
            <View style={st.isaBadge}>
              <View style={st.isaBadgeTop}>
                <Ionicons name="checkmark-circle" size={18} color="#4A7C59" />
                <Text style={st.isaBadgeTitle}>ISA-RVG Fee Applied</Text>
              </View>
              <Text style={st.isaBadgeDetail}>
                {isaDetails.total_units} units × ₹{formatINR(isaDetails.rate_per_unit)} = ₹{formatINR(isaDetails.base_fee)}
                {isaDetails.emergency ? ' + 30% emergency surcharge' : ''}
              </Text>
              <Text style={st.isaBadgeFee}>Final: ₹{formatINR(isaDetails.final_fee)}</Text>
            </View>
          )}

          {/* Notes */}
          <Text style={[st.label, { marginTop: 28 }]}>Notes</Text>
          <TextInput
            testID="notes-input"
            style={[st.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes..."
            placeholderTextColor="#9CA3AF"
            multiline
          />

          {/* Save */}
          <TouchableOpacity
            testID="save-case-btn"
            style={[st.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={st.saveBtnText}>Save Case</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ISARVGCalculator visible={calcVisible} onClose={() => setCalcVisible(false)} onUseAmount={handleUseAmount} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F7F7F8',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A201C' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1A201C', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A201C',
  },
  row: { flexDirection: 'row', gap: 12 },
  calcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4A7C59',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  calcIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcBtnTitle: { fontSize: 14, fontWeight: '700', color: '#4A7C59' },
  calcBtnSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  isaBadge: {
    backgroundColor: '#F0F7F2',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#4A7C59',
  },
  isaBadgeTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  isaBadgeTitle: { fontSize: 14, fontWeight: '700', color: '#4A7C59' },
  isaBadgeDetail: { fontSize: 13, color: '#2C3E30', lineHeight: 18 },
  isaBadgeFee: { fontSize: 16, fontWeight: '800', color: '#4A7C59', marginTop: 4 },
  saveBtn: {
    backgroundColor: '#4A7C59',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
