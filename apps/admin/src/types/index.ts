export type UserRole = 'nurse' | 'client' | 'admin';
export type NurseStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type DocumentType = 'title' | 'license' | 'id' | 'certification' | 'other';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Specialization {
  id: string;
  name: string;
  description: string | null;
}

export interface NurseProfile {
  id: string;
  license_number: string | null;
  bio: string | null;
  years_experience: number | null;
  education: string | null;
  status: NurseStatus;
  is_active: boolean;
  hourly_rate: number | null;
  rating: number | null;
  total_reviews: number;
  rejection_reason: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  nurse_documents?: NurseDocument[];
  nurse_specializations?: { specializations: Specialization }[];
}

export interface NurseDocument {
  id: string;
  nurse_id: string;
  document_type: DocumentType;
  document_name: string;
  storage_path: string;
  status: DocumentStatus;
  admin_notes: string | null;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  nurse_id: string | null;
  status: RequestStatus;
  service_date: string | null;
  address: string | null;
  hours: number | null;
  total_cost: number | null;
  description: string | null;
  created_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  title: 'Título Profesional',
  license: 'Tarjeta Profesional',
  id: 'Documento de Identidad',
  certification: 'Certificación',
  other: 'Otro',
};

export const STATUS_LABELS: Record<NurseStatus, string> = {
  pending: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};
