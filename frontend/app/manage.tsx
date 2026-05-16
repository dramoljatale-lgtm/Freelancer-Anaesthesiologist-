import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHospitals, getSurgeons, addHospital, addSurgeon, deleteHospital, deleteSurgeon, NamedItem } from '../utils/storage';

type Tab = 'hospitals' | 'surgeons';

export default function Manage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('hospitals');
  const [hospitals, setHospitals] = useState<NamedItem[]>([]);
  const [surgeons, setSurgeons] = useState<NamedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([getHospitals().then(setHospitals), getSurgeons().then(setSurgeons)]).finally(() => setLoading(false));
  }, []));

  const items = tab === 'hospitals' ? hospitals : surgeons;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      if (tab === 'hospitals') { await addHospital(newName.trim()); setHospitals(await getHospitals()); }
      else { await addSurgeon(newName.trim()); setSurgeons(await getSurgeons()); }
      setNewName('');
    } catch { Alert.alert('Error', 'Failed to add'); }
    finally { setAdding(false); }
  };

  const handleDelete = (item: NamedItem) => {
    Alert.alert('Delete', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (tab === 'hospitals') { await deleteHospital(item.id); setHospitals(await getHospitals()); }
        else { await deleteSurgeon(item.id); setSurgeons(await getSurgeons()); }
      }},
    ]);
  };

  if (loading) return <SafeAreaView style={st.container}><ActivityIndicator testID="manage-loading" size="large" color="#4A7C59" style={{ marginTop: 120 }} /></SafeAreaView>;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity testID="manage-back-btn" onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Ionicons name="chevron-back" size={24} color="#1A201C" /></TouchableOpacity>
        <Text style={st.headerTitle}>Manage</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={st.tabs}>
        <TouchableOpacity testID="tab-hospitals" style={[st.tab, tab === 'hospitals' && st.tabActive]} onPress={() => setTab('hospitals')}><Ionicons name="business-outline" size={16} color={tab === 'hospitals' ? '#1A201C' : '#6B7280'} /><Text style={[st.tabText, tab === 'hospitals' && st.tabTextActive]}>Hospitals</Text><View style={st.tabBadge}><Text style={st.tabBadgeText}>{hospitals.length}</Text></View></TouchableOpacity>
        <TouchableOpacity testID="tab-surgeons" style={[st.tab, tab === 'surgeons' && st.tabActive]} onPress={() => setTab('surgeons')}><Ionicons name="person-outline" size={16} color={tab === 'surgeons' ? '#1A201C' : '#6B7280'} /><Text style={[st.tabText, tab === 'surgeons' && st.tabTextActive]}>Surgeons</Text><View style={st.tabBadge}><Text style={st.tabBadgeText}>{surgeons.length}</Text></View></TouchableOpacity>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={st.addRow}>
          <TextInput testID="manage-add-input" style={st.addInput} value={newName} onChangeText={setNewName} placeholder={tab === 'hospitals' ? 'Add new hospital...' : 'Add new surgeon...'} placeholderTextColor="#9CA3AF" onSubmitEditing={handleAdd} />
          <TouchableOpacity testID="manage-add-btn" style={st.addBtn} onPress={handleAdd} disabled={adding}>{adding ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={22} color="#FFFFFF" />}</TouchableOpacity>
        </View>
        <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={st.list} showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={st.item}><View style={st.itemIcon}><Ionicons name={tab === 'hospitals' ? 'business' : 'person'} size={16} color="#4A7C59" /></View><Text style={st.itemName}>{item.name}</Text><TouchableOpacity testID={`delete-${item.id}`} onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Ionicons name="trash-outline" size={18} color="#D95D39" /></TouchableOpacity></View>
          )}
          ListEmptyComponent={<View style={st.emptyState}><Ionicons name={tab === 'hospitals' ? 'business-outline' : 'people-outline'} size={40} color="#E5E7EB" /><Text style={st.emptyText}>No {tab} added yet</Text></View>}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A201C' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#EAECEB', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' }, tabTextActive: { color: '#1A201C' },
  tabBadge: { backgroundColor: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tabBadgeText: { fontSize: 12, fontWeight: '700', color: '#1A201C' },
  addRow: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 16 },
  addInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: '#1A201C' },
  addBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#4A7C59', justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A201C' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
});
