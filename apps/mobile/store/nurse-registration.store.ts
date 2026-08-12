import { create } from 'zustand';

export interface NurseRegistrationData {
  // Step 1 - Datos personales
  full_name: string;
  phone: string;
  city: string;
  address: string;
  // Step 2 - Datos profesionales
  license_number: string;
  years_experience: string;
  education: string;
  bio: string;
  hourly_rate: string;
  specialization_ids: string[];
  // Step 3 - Documentos
  documents: {
    type: 'title' | 'license' | 'id';
    uri: string;
    name: string;
    mimeType: string;
  }[];
}

interface NurseRegistrationState {
  data: NurseRegistrationData;
  currentStep: number;
  setStep: (step: number) => void;
  updateData: (partial: Partial<NurseRegistrationData>) => void;
  reset: () => void;
}

const initialData: NurseRegistrationData = {
  full_name: '',
  phone: '',
  city: '',
  address: '',
  license_number: '',
  years_experience: '',
  education: '',
  bio: '',
  hourly_rate: '',
  specialization_ids: [],
  documents: [],
};

export const useNurseRegistrationStore = create<NurseRegistrationState>((set) => ({
  data: initialData,
  currentStep: 1,

  setStep: (step) => set({ currentStep: step }),

  updateData: (partial) =>
    set((state) => ({ data: { ...state.data, ...partial } })),

  reset: () => set({ data: initialData, currentStep: 1 }),
}));
