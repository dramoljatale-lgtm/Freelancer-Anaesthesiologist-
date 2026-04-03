import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  testID?: string;
}

export default function CustomPicker({ options, selectedValue, onValueChange, placeholder = 'Select...', testID }: Props) {
  const [visible, setVisible] = useState(false);
  const selectedLabel = options.find(o => o.value === selectedValue)?.label || placeholder;

  return (
    <>
      <TouchableOpacity
        testID={testID}
        style={styles.trigger}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selectedValue && styles.placeholder]} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdown}>
            <Text style={styles.dropdownTitle}>{placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  testID={testID ? `${testID}-option-${item.value}` : undefined}
                  style={[styles.option, item.value === selectedValue && styles.optionSelected]}
                  onPress={() => { onValueChange(item.value); setVisible(false); }}
                >
                  <Text style={[styles.optionText, item.value === selectedValue && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <Ionicons name="checkmark" size={18} color="#4A7C59" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  triggerText: { fontSize: 15, color: '#1A201C', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    maxHeight: 340,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionSelected: { backgroundColor: '#F0F7F2' },
  optionText: { fontSize: 15, color: '#1A201C' },
  optionTextSelected: { color: '#4A7C59', fontWeight: '600' },
});
