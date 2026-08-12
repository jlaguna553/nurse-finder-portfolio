-- ============================================================
-- NurseFinder - Esquema inicial de base de datos
-- ============================================================

-- Extensiones requeridas
create extension if not exists "uuid-ossp";

-- Tipos enumerados
create type user_role as enum ('nurse', 'client', 'admin');
create type nurse_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type document_type as enum ('title', 'license', 'id', 'certification', 'other');
create type document_status as enum ('pending', 'approved', 'rejected');
create type request_status as enum ('pending', 'accepted', 'rejected', 'completed', 'cancelled');

-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================

-- Perfiles de usuario (extiende auth.users de Supabase)
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text not null,
  full_name   text,
  phone       text,
  avatar_url  text,
  city        text,
  role        user_role not null default 'client',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Catálogo de especializaciones
create table public.specializations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  icon        text,
  created_at  timestamptz not null default now()
);

-- Perfiles de enfermeros
create table public.nurse_profiles (
  id                uuid references public.profiles on delete cascade primary key,
  license_number    text,
  bio               text,
  years_experience  integer,
  education         text,
  status            nurse_status not null default 'pending',
  is_active         boolean not null default false,
  hourly_rate       decimal(10,2),
  rating            decimal(3,2),
  total_reviews     integer not null default 0,
  rejection_reason  text,
  admin_notes       text,
  reviewed_at       timestamptz,
  reviewed_by       uuid references public.profiles,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Especializaciones de enfermeros (tabla pivote)
create table public.nurse_specializations (
  nurse_id            uuid references public.nurse_profiles on delete cascade,
  specialization_id   uuid references public.specializations on delete cascade,
  primary key (nurse_id, specialization_id)
);

-- Documentos de enfermeros
create table public.nurse_documents (
  id              uuid primary key default gen_random_uuid(),
  nurse_id        uuid references public.nurse_profiles on delete cascade not null,
  document_type   document_type not null,
  document_name   text not null,
  storage_path    text not null,
  status          document_status not null default 'pending',
  admin_notes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Ubicaciones en tiempo real de enfermeros activos
create table public.nurse_locations (
  nurse_id    uuid references public.nurse_profiles on delete cascade primary key,
  latitude    decimal(10,8) not null,
  longitude   decimal(11,8) not null,
  accuracy    decimal(8,2),
  updated_at  timestamptz not null default now()
);

-- Solicitudes de servicio
create table public.service_requests (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.profiles on delete cascade not null,
  nurse_id      uuid references public.nurse_profiles on delete set null,
  status        request_status not null default 'pending',
  service_date  timestamptz,
  address       text,
  latitude      decimal(10,8),
  longitude     decimal(11,8),
  description   text,
  hours         integer,
  total_cost    decimal(10,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Reseñas y calificaciones
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid references public.service_requests on delete cascade not null,
  reviewer_id  uuid references public.profiles on delete cascade not null,
  nurse_id     uuid references public.nurse_profiles on delete cascade not null,
  rating       integer not null check (rating >= 1 and rating <= 5),
  comment      text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- DATOS INICIALES - ESPECIALIZACIONES
-- ============================================================

insert into public.specializations (name, description, icon) values
  ('Enfermería General',          'Cuidados generales y procedimientos básicos',             'stethoscope'),
  ('Cuidado de Adultos Mayores',  'Cuidado especializado para personas mayores',             'heart'),
  ('Cuidados Intensivos',         'Manejo de pacientes críticos y UCI',                     'activity'),
  ('Pediatría',                   'Cuidado especializado de niños y recién nacidos',         'baby'),
  ('Oncología',                   'Cuidado de pacientes con cáncer',                        'shield'),
  ('Rehabilitación',              'Apoyo en procesos de recuperación física',               'trending-up'),
  ('Salud Mental',                'Cuidado de pacientes con condiciones psiquiátricas',     'brain'),
  ('Heridas y Ostomías',          'Cuidado especializado de heridas crónicas',              'bandage'),
  ('Aplicación de Medicamentos',  'Inyecciones, sueros y medicamentos IV/IM',              'syringe'),
  ('Cuidados Paliativos',         'Cuidado de pacientes en fase terminal',                  'heart');

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.nurse_profiles     enable row level security;
alter table public.nurse_specializations enable row level security;
alter table public.nurse_documents    enable row level security;
alter table public.nurse_locations    enable row level security;
alter table public.service_requests   enable row level security;
alter table public.reviews            enable row level security;
alter table public.specializations    enable row level security;

-- Especializaciones: lectura pública
create policy "Specializations viewable by everyone" on public.specializations
  for select using (true);

-- Perfiles: lectura pública, escritura propia
create policy "Profiles viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Perfiles de enfermero: lectura pública (solo aprobados para clientes)
create policy "Approved nurse profiles viewable by everyone" on public.nurse_profiles
  for select using (true);

create policy "Nurses can insert own profile" on public.nurse_profiles
  for insert with check (auth.uid() = id);

create policy "Nurses can update own profile" on public.nurse_profiles
  for update using (auth.uid() = id);

create policy "Admins can update any nurse profile" on public.nurse_profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Especializaciones de enfermeros
create policy "Nurse specializations viewable by everyone" on public.nurse_specializations
  for select using (true);

create policy "Nurses can manage own specializations" on public.nurse_specializations
  for all using (auth.uid() = nurse_id) with check (auth.uid() = nurse_id);

-- Documentos: enfermero ve los suyos, admin ve todos
create policy "Nurses can view own documents" on public.nurse_documents
  for select using (auth.uid() = nurse_id);

create policy "Admins can view all documents" on public.nurse_documents
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Nurses can upload own documents" on public.nurse_documents
  for insert with check (auth.uid() = nurse_id);

create policy "Admins can update document status" on public.nurse_documents
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Ubicaciones: visibles si el enfermero está activo y aprobado
create policy "Active nurse locations viewable by authenticated" on public.nurse_locations
  for select using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.nurse_profiles
      where id = nurse_id and is_active = true and status = 'approved'
    )
  );

create policy "Nurses can upsert own location" on public.nurse_locations
  for all using (auth.uid() = nurse_id) with check (auth.uid() = nurse_id);

-- Solicitudes de servicio
create policy "Clients view own requests" on public.service_requests
  for select using (auth.uid() = client_id);

create policy "Nurses view their requests" on public.service_requests
  for select using (auth.uid() = nurse_id);

create policy "Admins view all requests" on public.service_requests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Clients can create requests" on public.service_requests
  for insert with check (auth.uid() = client_id);

create policy "Parties can update requests" on public.service_requests
  for update using (auth.uid() = client_id or auth.uid() = nurse_id);

-- Reseñas: lectura pública
create policy "Reviews viewable by everyone" on public.reviews
  for select using (true);

create policy "Clients can create reviews" on public.reviews
  for insert with check (auth.uid() = reviewer_id);

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Crea automáticamente el perfil al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'client')
  );

  if (new.raw_user_meta_data->>'role') = 'nurse' then
    insert into public.nurse_profiles (id)
    values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Actualiza el rating del enfermero cuando se crea una reseña
create or replace function public.update_nurse_rating()
returns trigger
language plpgsql
as $$
begin
  update public.nurse_profiles
  set
    rating = (
      select round(avg(rating)::numeric, 2)
      from public.reviews
      where nurse_id = new.nurse_id
    ),
    total_reviews = (
      select count(*) from public.reviews where nurse_id = new.nurse_id
    )
  where id = new.nurse_id;
  return new;
end;
$$;

create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.update_nurse_rating();

-- Actualiza updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_nurse_profiles
  before update on public.nurse_profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_nurse_documents
  before update on public.nurse_documents
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_service_requests
  before update on public.service_requests
  for each row execute function public.handle_updated_at();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nurse-documents', 'nurse-documents', false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Nurses upload own docs" on storage.objects
  for insert with check (
    bucket_id = 'nurse-documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Nurses view own docs" on storage.objects
  for select using (
    bucket_id = 'nurse-documents' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Admins view all docs" on storage.objects
  for select using (
    bucket_id = 'nurse-documents' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Avatars are public" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users update own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.nurse_locations;
alter publication supabase_realtime add table public.service_requests;
