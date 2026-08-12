import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, NurseProfile } from '../types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  nurseProfile: NurseProfile | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setNurseProfile: (nurseProfile: NurseProfile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  nurseProfile: null,
  isLoading: true,

  setSession: (session) => set({ session, isLoading: false }),
  setProfile: (profile) => set({ profile }),
  setNurseProfile: (nurseProfile) => set({ nurseProfile }),

  fetchProfile: async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) return;

    set({ profile });

    if (profile.role === 'nurse') {
      const { data: nurseProfile } = await supabase
        .from('nurse_profiles')
        .select(`
          *,
          nurse_specializations (
            specialization_id,
            specializations (*)
          )
        `)
        .eq('id', userId)
        .single();

      if (nurseProfile) {
        const specializations = nurseProfile.nurse_specializations?.map(
          (ns: any) => ns.specializations
        ) ?? [];
        set({ nurseProfile: { ...nurseProfile, specializations } });
      }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, nurseProfile: null });
  },
}));
