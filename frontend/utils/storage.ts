import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CASES: 'FAFT_CASES',
  PROFILE: 'FAFT_PROFILE',
  HOSPITALS: 'FAFT_HOSPITALS',
  SURGEONS: 'FAFT_SURGEONS',
};

export interface CaseItem {
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

export interface DoctorProfile {
  name: string;
  degree: string;
  registration_no: string;
  designation: string;
  city: string;
  signature_base64: string;
}

export interface NamedItem {
  id: string;
  name: string;
}

function generateId(): string {
  const c = 'abcdef0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) id += c[Math.floor(Math.random() * c.length)];
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

async function getItem<T>(key: string, def: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
}

async function setItem<T>(key: string, val: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(val));
}

// ========== CASES ==========

export async function getCases(): Promise<CaseItem[]> {
  return getItem<CaseItem[]>(KEYS.CASES, []);
}

export async function addCase(input: Omit<CaseItem, 'id' | 'receipt_no' | 'created_at'>): Promise<CaseItem> {
  const cases = await getCases();
  const now = new Date();
  const dd = now.getDate().toString().padStart(2, '0');
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const newCase: CaseItem = {
    ...input,
    id: generateId(),
    receipt_no: `REC-${dd}${mm}-${(cases.length + 1).toString().padStart(3, '0')}`,
    created_at: now.toISOString(),
  };
  await setItem(KEYS.CASES, [newCase, ...cases]);
  return newCase;
}

export async function getCase(id: string): Promise<CaseItem | null> {
  const cases = await getCases();
  return cases.find(c => c.id === id) || null;
}

export async function deleteCase(id: string): Promise<void> {
  const cases = await getCases();
  await setItem(KEYS.CASES, cases.filter(c => c.id !== id));
}

export async function updateCasePaymentStatus(id: string, status: string): Promise<void> {
  const cases = await getCases();
  const idx = cases.findIndex(c => c.id === id);
  if (idx >= 0) {
    cases[idx].payment_status = status;
    await setItem(KEYS.CASES, cases);
  }
}

// ========== DOCTOR PROFILE ==========

const DEFAULT_PROFILE: DoctorProfile = {
  name: '', degree: '', registration_no: '',
  designation: 'Consultant Anaesthesiologist', city: '', signature_base64: '',
};

export async function getDoctorProfile(): Promise<DoctorProfile> {
  return getItem<DoctorProfile>(KEYS.PROFILE, DEFAULT_PROFILE);
}

export async function saveDoctorProfile(profile: DoctorProfile): Promise<void> {
  await setItem(KEYS.PROFILE, profile);
}

// ========== HOSPITALS ==========

export async function getHospitals(): Promise<NamedItem[]> {
  return getItem<NamedItem[]>(KEYS.HOSPITALS, []);
}

export async function addHospital(name: string): Promise<NamedItem> {
  const items = await getHospitals();
  const item: NamedItem = { id: generateId(), name: name.trim() };
  await setItem(KEYS.HOSPITALS, [...items, item].sort((a, b) => a.name.localeCompare(b.name)));
  return item;
}

export async function deleteHospital(id: string): Promise<void> {
  const items = await getHospitals();
  await setItem(KEYS.HOSPITALS, items.filter(i => i.id !== id));
}

// ========== SURGEONS ==========

export async function getSurgeons(): Promise<NamedItem[]> {
  return getItem<NamedItem[]>(KEYS.SURGEONS, []);
}

export async function addSurgeon(name: string): Promise<NamedItem> {
  const items = await getSurgeons();
  const item: NamedItem = { id: generateId(), name: name.trim() };
  await setItem(KEYS.SURGEONS, [...items, item].sort((a, b) => a.name.localeCompare(b.name)));
  return item;
}

export async function deleteSurgeon(id: string): Promise<void> {
  const items = await getSurgeons();
  await setItem(KEYS.SURGEONS, items.filter(i => i.id !== id));
}

// ========== EXPORT / IMPORT ==========

export async function exportAllData(): Promise<string> {
  const cases = await getCases();
  const profile = await getDoctorProfile();
  const hospitals = await getHospitals();
  const surgeons = await getSurgeons();
  return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), cases, profile, hospitals, surgeons }, null, 2);
}

export async function importAllData(json: string): Promise<{ cases: number; hospitals: number; surgeons: number }> {
  const data = JSON.parse(json);
  if (data.cases) await setItem(KEYS.CASES, data.cases);
  if (data.profile) await setItem(KEYS.PROFILE, data.profile);
  if (data.hospitals) await setItem(KEYS.HOSPITALS, data.hospitals);
  if (data.surgeons) await setItem(KEYS.SURGEONS, data.surgeons);
  return {
    cases: data.cases?.length || 0,
    hospitals: data.hospitals?.length || 0,
    surgeons: data.surgeons?.length || 0,
  };
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.CASES, KEYS.PROFILE, KEYS.HOSPITALS, KEYS.SURGEONS]);
}

// ========== CSV GENERATION ==========

export function generateCSV(cases: CaseItem[]): string {
  const headers = ['Receipt No', 'Date', 'Patient Name', 'Age', 'Gender', 'Surgery', 'Surgeon', 'Hospital', 'Anaesthesia Type', 'Fees', 'Payment Status', 'Mode of Payment', 'Notes'];
  const escape = (s: any) => {
    const str = String(s || '');
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const rows = cases.map(c => [
    c.receipt_no, c.date, c.patient_name, c.age, c.gender,
    c.surgery_name, c.surgeon_name, c.hospital, c.anaesthesia_type,
    c.anaesthesia_fees, c.payment_status, c.mode_of_payment, c.notes,
  ].map(escape).join(','));
  return [headers.join(','), ...rows].join('\n');
}
