import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  Switch, ScrollView, StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomPicker from './CustomPicker';
import { formatINR } from '../utils/helpers';

const CITY_TIERS = [
  { label: 'Tier 1 — ₹1,000/unit', value: 'tier1' },
  { label: 'Tier 2 — ₹700/unit', value: 'tier2' },
  { label: 'Tier 3 — ₹400/unit', value: 'tier3' },
];

const TIER_RATES: Record<string, number> = { tier1: 1000, tier2: 700, tier3: 400 };

const COMPLEXITIES = [
  { label: 'Minor — 4 Units', value: 'minor' },
  { label: 'Intermediate — 7 Units', value: 'intermediate' },
  { label: 'Major — 12 Units', value: 'major' },
  { label: 'Supra-Major — 20 Units', value: 'supra_major' },
];

const COMPLEXITY_UNITS: Record<string, number> = {
  minor: 4, intermediate: 7, major: 12, supra_major: 20,
};

export interface ISARVGDetailsType {
  city_tier: string;
  rate_per_unit: number;
  surgical_complexity: string;
  base_units: number;
  duration_minutes: number;
  time_units: number;
  asa_status: boolean;
  asa_units: number;
  emergency: boolean;
  case_cancelled: boolean;
  total_units: number;
  base_fee: number;
  final_fee: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onUseAmount: (fee: number, details: ISARVGDetailsType) => void;
}

export default function ISARVGCalculator({ visible, onClose, onUseAmount }: Props) {
  const [cityTier, setCityTier] = useState('tier3');
  const [complexity, setComplexity] = useState('intermediate');
  const [duration, setDuration] = useState('');
  const [asaStatus, setAsaStatus] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [caseCancelled, setCaseCancelled] = useState(false);

  const calc = useMemo(() => {
    const baseUnits = COMPLEXITY_UNITS[complexity] || 0;
    const mins = parseInt(duration) || 0;
    const timeUnits = Math.max(0, Math.ceil((mins - 60) / 15));
    const asaUnits = asaStatus ? 2 : 0;
    const totalUnits = baseUnits + timeUnits + asaUnits;
    const rate = TIER_RATES[cityTier] || 0;
    const baseFee = totalUnits * rate;
    const finalFee = emergency ? Math.round(baseFee * 1.30) : baseFee;
    return { baseUnits, timeUnits, asaUnits, totalUnits, rate, baseFee, finalFee, mins };
  }, [cityTier, complexity, duration, asaStatus, emergency]);

  const handleUse = () => {
    const details: ISARVGDetailsType = {
      city_tier: CITY_TIERS.find(t => t.value === cityTier)?.label || cityTier,
      rate_per_unit: calc.rate,
      surgical_complexity: COMPLEXITIES.find(c => c.value === complexity)?.label || complexity,
      base_units: calc.baseUnits,
      duration_minutes: calc.mins,
      time_units: calc.timeUnits,
      asa_status: asaStatus,
      asa_units: calc.asaUnits,
      emergency,
      case_cancelled: caseCancelled,
      total_units: calc.totalUnits,
      base_fee: calc.baseFee,
      final_fee: calc.finalFee,
    };
    onUseAmount(calc.finalFee, details);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.modal}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Standard Fee Calculator</Text>
              <Text style={s.subtitle}>ISA-RVG based fee calculation</Text>
            </View>
            <TouchableOpacity testID="close-calculator-btn" onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={28} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* City Tier */}
            <View style={s.field}>
              <Text style={s.label}>City Tier</Text>
              <CustomPicker
                testID="city-tier-select"
                options={CITY_TIERS}
                selectedValue={cityTier}
                onValueChange={setCityTier}
                placeholder="Select city tier"
              />
            </View>

            {/* Surgical Complexity */}
            <View style={s.field}>
              <Text style={s.label}>Surgical Complexity</Text>
              <CustomPicker
                testID="surgical-complexity-select"
                options={COMPLEXITIES}
                selectedValue={complexity}
                onValueChange={setComplexity}
                placeholder="Select complexity"
              />
            </View>

            {/* Duration */}
            <View style={s.field}>
              <Text style={s.label}>Duration of Surgery (Minutes)</Text>
              <TextInput
                testID="duration-input"
                style={s.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g. 90"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Toggles */}
            <View style={s.toggleSection}>
              <View style={s.toggle}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>ASA III or IV</Text>
                  <Text style={s.toggleDesc}>Adds 2 extra units</Text>
                </View>
                <Switch
                  testID="asa-status-toggle"
                  value={asaStatus}
                  onValueChange={setAsaStatus}
                  trackColor={{ false: '#E5E7EB', true: '#4A7C59' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={s.toggle}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Emergency Case</Text>
                  <Text style={s.toggleDesc}>Adds 30% surcharge to fee</Text>
                </View>
                <Switch
                  testID="emergency-toggle"
                  value={emergency}
                  onValueChange={setEmergency}
                  trackColor={{ false: '#E5E7EB', true: '#D95D39' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[s.toggle, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Case Cancelled</Text>
                  <Text style={s.toggleDesc}>Patient induced, fee remains 100%</Text>
                </View>
                <Switch
                  testID="case-cancelled-toggle"
                  value={caseCancelled}
                  onValueChange={setCaseCancelled}
                  trackColor={{ false: '#E5E7EB', true: '#6B7280' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Breakdown */}
            <View style={s.breakdown}>
              <Text style={s.breakdownTitle}>Calculation Breakdown</Text>
              <View style={s.bRow}>
                <Text style={s.bLabel}>Base Units ({COMPLEXITIES.find(c => c.value === complexity)?.label.split(' — ')[0]})</Text>
                <Text style={s.bValue}>{calc.baseUnits}</Text>
              </View>
              <View style={s.bRow}>
                <Text style={s.bLabel}>Time Units ({calc.mins > 60 ? `${calc.mins - 60} min extra` : 'included'})</Text>
                <Text style={s.bValue}>{calc.timeUnits}</Text>
              </View>
              <View style={s.bRow}>
                <Text style={s.bLabel}>ASA Units</Text>
                <Text style={s.bValue}>{calc.asaUnits}</Text>
              </View>
              <View style={s.divider} />
              <View style={s.bRow}>
                <Text style={[s.bLabel, { fontWeight: '700', color: '#1A201C' }]}>Total Units</Text>
                <Text style={[s.bValue, { fontWeight: '700', color: '#1A201C' }]}>{calc.totalUnits}</Text>
              </View>
              <View style={s.bRow}>
                <Text style={s.bLabel}>× Rate per Unit</Text>
                <Text style={s.bValue}>₹{formatINR(calc.rate)}</Text>
              </View>
              {emergency && (
                <>
                  <View style={s.bRow}>
                    <Text style={s.bLabel}>Base Fee</Text>
                    <Text style={s.bValue}>₹{formatINR(calc.baseFee)}</Text>
                  </View>
                  <View style={s.bRow}>
                    <Text style={[s.bLabel, { color: '#D95D39' }]}>Emergency Surcharge (+30%)</Text>
                    <Text style={[s.bValue, { color: '#D95D39' }]}>+₹{formatINR(Math.round(calc.baseFee * 0.30))}</Text>
                  </View>
                </>
              )}
            </View>

            {/* Fee Display */}
            <View style={s.feeBox}>
              <Text style={s.feeLabel}>Calculated Standard Fee</Text>
              <Text style={s.feeAmount}>₹{formatINR(calc.finalFee)}</Text>
            </View>

            {caseCancelled && (
              <View style={s.infoBox}>
                <Ionicons name="information-circle" size={16} color="#4A7C59" />
                <Text style={s.infoText}>
                  As per ISA guidelines, fee remains 100% when patient is induced but case is cancelled.
                </Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity testID="use-fee-amount-btn" style={s.useBtn} onPress={handleUse} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={s.useBtnText}>Use This Amount</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#1A201C' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#1A201C', marginBottom: 6 },
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
  toggleSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#1A201C' },
  toggleDesc: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  breakdown: {
    backgroundColor: '#F7F7F8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  bRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  bLabel: { fontSize: 14, color: '#6B7280' },
  bValue: { fontSize: 14, fontWeight: '600', color: '#1A201C' },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  feeBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  feeLabel: { fontSize: 13, fontWeight: '600', color: '#4A7C59', marginBottom: 4 },
  feeAmount: { fontSize: 32, fontWeight: '800', color: '#4A7C59', letterSpacing: -1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F7F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoText: { fontSize: 13, color: '#4A7C59', flex: 1, lineHeight: 18 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  useBtn: {
    backgroundColor: '#4A7C59',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  useBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
