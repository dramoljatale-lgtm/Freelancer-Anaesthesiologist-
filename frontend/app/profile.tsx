import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [degree, setDegree] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [designation, setDesignation] = useState('Consultant Anaesthesiologist');
  const [city, setCity] = useState('');
  const [signatureBase64, setSignatureBase64] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/doctor-profile`);
      const data = await res.json();
      if (data.name) setName(data.name);
      if (data.degree) setDegree(data.degree);
      if (data.registration_no) setRegistrationNo(data.registration_no);
      if (data.designation) setDesignation(data.designation);
      if (data.city) setCity(data.city);
      if (data.signature_base64) setSignatureBase64(data.signature_base64);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const captureSignature = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to capture your signature.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [3, 1],
    });
    if (!result.canceled && result.assets[0].base64) {
      setSignatureBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickSignature = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed to pick your signature.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [3, 1],
    });
    if (!result.canceled && result.assets[0].base64) {
      setSignatureBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Doctor name is required');
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/doctor-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          degree: degree.trim(),
          registration_no: registrationNo.trim(),
          designation: designation.trim(),
          city: city.trim(),
          signature_base64: signatureBase64,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      Alert.alert('Saved', 'Doctor profile updated successfully');
    } catch { Alert.alert('Error', 'Failed to save profile'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <SafeAreaView style={st.container}><ActivityIndicator testID="profile-loading" size="large" color="#4A7C59" style={{ marginTop: 120 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity testID="profile-back-btn" onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#1A201C" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Doctor Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Info Banner */}
          <View style={st.infoBanner}>
            <Ionicons name="information-circle" size={18} color="#4A7C59" />
            <Text style={st.infoText}>This information will appear on your bill receipts. Set it up once.</Text>
          </View>

          {/* Preview */}
          <View style={st.previewCard}>
            <Text style={st.previewLabel}>Receipt Preview</Text>
            <View style={st.previewContent}>
              <Text style={st.previewName}>{name || 'Dr. Your Name'}</Text>
              <Text style={st.previewDegree}>{degree || 'MBBS, MD Anaesthesia'}</Text>
              <Text style={st.previewDesig}>
                {designation || 'Consultant Anaesthesiologist'}{city ? ` | ${city}` : ''}
              </Text>
              <Text style={st.previewReg}>Reg No: {registrationNo || '---'}</Text>
              {signatureBase64 ? (
                <Image source={{ uri: signatureBase64 }} style={st.previewSig} resizeMode="contain" />
              ) : (
                <Text style={st.previewSigPlaceholder}>No signature added</Text>
              )}
            </View>
          </View>

          {/* Form */}
          <Text style={st.sectionTitle}>Your Details</Text>

          <Text style={st.label}>Full Name *</Text>
          <TextInput testID="doctor-name-input" style={st.input} value={name} onChangeText={setName} placeholder="e.g. Dr. Amol Jatale" placeholderTextColor="#9CA3AF" />

          <Text style={st.label}>Degree / Qualifications</Text>
          <TextInput testID="doctor-degree-input" style={st.input} value={degree} onChangeText={setDegree} placeholder="e.g. MBBS, MD ANAESTHESIA" placeholderTextColor="#9CA3AF" />

          <Text style={st.label}>Medical Council Registration No.</Text>
          <TextInput testID="doctor-reg-input" style={st.input} value={registrationNo} onChangeText={setRegistrationNo} placeholder="Enter registration number" placeholderTextColor="#9CA3AF" />

          <Text style={st.label}>Designation</Text>
          <TextInput testID="doctor-designation-input" style={st.input} value={designation} onChangeText={setDesignation} placeholder="e.g. Consultant Anaesthesiologist" placeholderTextColor="#9CA3AF" />

          <Text style={st.label}>City</Text>
          <TextInput testID="doctor-city-input" style={st.input} value={city} onChangeText={setCity} placeholder="e.g. Yavatmal" placeholderTextColor="#9CA3AF" />

          {/* Signature Section */}
          <Text style={[st.sectionTitle, { marginTop: 28 }]}>Signature</Text>

          {signatureBase64 ? (
            <View style={st.sigPreview}>
              <Image source={{ uri: signatureBase64 }} style={st.sigImage} resizeMode="contain" />
              <TouchableOpacity testID="remove-signature-btn" style={st.sigRemoveBtn} onPress={() => setSignatureBase64('')}>
                <Ionicons name="close-circle" size={24} color="#D95D39" />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={st.sigActions}>
            <TouchableOpacity testID="capture-signature-btn" style={st.sigBtn} onPress={captureSignature} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={20} color="#4A7C59" />
              <Text style={st.sigBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="pick-signature-btn" style={st.sigBtn} onPress={pickSignature} activeOpacity={0.7}>
              <Ionicons name="image-outline" size={20} color="#4A7C59" />
              <Text style={st.sigBtnText}>From Gallery</Text>
            </TouchableOpacity>
          </View>

          <Text style={st.sigHint}>Tip: Sign on a white paper and photograph it for best results</Text>

          {/* Save */}
          <TouchableOpacity testID="save-profile-btn" style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={st.saveBtnText}>Save Profile</Text>}
          </TouchableOpacity>

          {/* Manage Link */}
          <TouchableOpacity testID="manage-hospitals-surgeons-btn" style={st.manageLink} onPress={() => router.push('/manage')} activeOpacity={0.7}>
            <View style={st.manageLinkIcon}><Ionicons name="settings-outline" size={18} color="#4A7C59" /></View>
            <View style={{ flex: 1 }}>
              <Text style={st.manageLinkTitle}>Manage Hospitals & Surgeons</Text>
              <Text style={st.manageLinkSub}>View, add or remove saved entries</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A201C' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F0F7F2', padding: 14, borderRadius: 12, marginBottom: 20 },
  infoText: { fontSize: 13, color: '#4A7C59', flex: 1, lineHeight: 18 },
  previewCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  previewLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  previewContent: { alignItems: 'center' },
  previewName: { fontSize: 18, fontWeight: '800', color: '#1A201C' },
  previewDegree: { fontSize: 14, color: '#4A7C59', fontWeight: '600', marginTop: 2 },
  previewDesig: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  previewReg: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  previewSig: { width: 150, height: 50, marginTop: 12 },
  previewSigPlaceholder: { fontSize: 11, color: '#9CA3AF', marginTop: 10, fontStyle: 'italic' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A201C', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: '#1A201C' },
  sigPreview: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, position: 'relative' },
  sigImage: { width: '100%', height: 80 },
  sigRemoveBtn: { position: 'absolute', top: 8, right: 8 },
  sigActions: { flexDirection: 'row', gap: 12 },
  sigBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#4A7C59', borderStyle: 'dashed',
    borderRadius: 12, paddingVertical: 14,
  },
  sigBtnText: { fontSize: 14, fontWeight: '600', color: '#4A7C59' },
  sigHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
  saveBtn: { backgroundColor: '#4A7C59', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  manageLink: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginTop: 20, borderWidth: 1, borderColor: '#E5E7EB', gap: 12,
  },
  manageLinkIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  manageLinkTitle: { fontSize: 14, fontWeight: '700', color: '#1A201C' },
  manageLinkSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
