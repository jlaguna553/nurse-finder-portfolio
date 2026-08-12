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
  icon: string | null;
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
  profile?: Profile;
  specializations?: Specialization[];
  documents?: NurseDocument[];
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

export interface NurseLocation {
  nurse_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updated_at: string;
}

export interface NurseWithLocation extends NurseProfile {
  location?: NurseLocation;
  distance?: number;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  nurse_id: string | null;
  status: RequestStatus;
  service_date: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  hours: number | null;
  total_cost: number | null;
  created_at: string;
  updated_at: string;
  client?: Profile;
  nurse?: NurseProfile;
}

export interface Review {
  id: string;
  request_id: string;
  reviewer_id: string;
  nurse_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  other_id: string;
  other_name: string | null;
  other_avatar: string | null;
  last_message: string;
  last_at: string;
  unread: number;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  title: 'Título Profesional',
  license: 'Tarjeta Profesional / Licencia',
  id: 'Documento de Identidad',
  certification: 'Certificación',
  other: 'Otro documento',
};

export const STATUS_LABELS: Record<NurseStatus, string> = {
  pending: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};
