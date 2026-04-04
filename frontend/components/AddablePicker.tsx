import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Item { id: string; name: string; }

interface Props {
  items: Item[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  onAddNew: (name: string) => Promise<void>;
  placeholder?: string;
  testID?: string;
}

export default function AddablePicker({ items, selectedValue, onValueChange, onAddNew, placeholder = 'Select...', testID }: Props) {
  const [visible, setVisible] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await onAddNew(newName.trim());
      onValueChange(newName.trim());
      setNewName('');
      setAddMode(false);
      setVisible(false);
    } catch {} finally {
      setAdding(false);
    }
  };

  return (
    <>
      <TouchableOpacity testID={testID} style={s.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Text style={[s.triggerText, !selectedValue && s.placeholder]} numberOfLines={1}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => { setVisible(false); setAddMode(false); }}>
          <View style={s.dropdown} onStartShouldSetResponder={() => true}>
            <Text style={s.dropdownTitle}>{placeholder}</Text>

            {addMode ? (
              <View style={s.addSection}>
                <TextInput
                  testID={testID ? `${testID}-new-input` : undefined}
                  style={s.addInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={`Enter new ${placeholder.toLowerCase()}`}
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
                <View style={s.addActions}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => { setAddMode(false); setNewName(''); }}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity testID={testID ? `${testID}-add-confirm` : undefined} style={s.confirmBtn} onPress={handleAdd} disabled={adding}>
                    {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.confirmText}>Add</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 240 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[s.option, item.name === selectedValue && s.optionSelected]}
                      onPress={() => { onValueChange(item.name); setVisible(false); }}
                    >
                      <Text style={[s.optionText, item.name === selectedValue && s.optionTextSelected]}>{item.name}</Text>
                      {item.name === selectedValue && <Ionicons name="checkmark" size={18} color="#4A7C59" />}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={s.emptyText}>No items yet. Add one below.</Text>}
                />
                <TouchableOpacity testID={testID ? `${testID}-add-new` : undefined} style={s.addNewBtn} onPress={() => setAddMode(true)}>
                  <Ionicons name="add-circle-outline" size={18} color="#4A7C59" />
                  <Text style={s.addNewText}>Add New</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, height: 48,
  },
  triggerText: { fontSize: 15, color: '#1A201C', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', paddingHorizontal: 36 },
  dropdown: {
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 12, maxHeight: 400,
    elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16,
  },
  dropdownTitle: {
    fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  optionSelected: { backgroundColor: '#F0F7F2' },
  optionText: { fontSize: 15, color: '#1A201C' },
  optionTextSelected: { color: '#4A7C59', fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },
  addNewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  addNewText: { fontSize: 14, fontWeight: '600', color: '#4A7C59' },
  addSection: { padding: 16 },
  addInput: {
    backgroundColor: '#F7F7F8', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    height: 44, paddingHorizontal: 12, fontSize: 15, color: '#1A201C',
  },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cancelText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  confirmBtn: { backgroundColor: '#4A7C59', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  confirmText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
});
