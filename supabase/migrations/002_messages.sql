-- ============================================================
-- NurseFinder - Mensajes en tiempo real
-- ============================================================

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid references public.profiles on delete cascade not null,
  receiver_id uuid references public.profiles on delete cascade not null,
  content     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Participantes pueden ver sus mensajes
create policy "Participants can view messages" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Solo el remitente puede enviar
create policy "Sender can insert messages" on public.messages
  for insert with check (auth.uid() = sender_id);

-- Solo el receptor puede marcar como leído
create policy "Receiver can mark as read" on public.messages
  for update using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Realtime
alter publication supabase_realtime add table public.messages;

-- Índices para rendimiento
create index messages_sender_receiver_idx on public.messages (sender_id, receiver_id);
create index messages_created_at_idx on public.messages (created_at);
