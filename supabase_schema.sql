-- ====================================================================
-- ART REISEN TERMINPLANER - SUPABASE DATENSTRUKTUR & SCHEMA
-- ====================================================================
-- Führen Sie dieses Script im Supabase Dashboard unter "SQL Editor" aus.
-- Es erstellt alle notwendigen Tabellen, Zugriffsrechte (RLS) und
-- den Storage-Bucket für die Mitarbeiterbilder.
-- ====================================================================

-- 1. BERATER-TABELLE (consultants)
create table if not exists public.consultants (
  id text primary key,
  name text not null,
  specialty text not null,
  image_url text,
  vacations jsonb default '[]'::jsonb,
  recurring_blocked_slots jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TERMINE-TABELLE (appointments)
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  consultant_id text not null references public.consultants(id) on delete cascade,
  date text not null, -- Format: YYYY-MM-DD
  time text not null, -- Format: HH:mm
  duration integer not null default 30, -- Dauer in Minuten (15, 30, 60)
  details jsonb not null default '{}'::jsonb, -- Kundendaten, Notizen, Kontaktart
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexe für schnelle Terminsuchen
create index if not exists idx_appointments_consultant on public.appointments(consultant_id);
create index if not exists idx_appointments_date on public.appointments(date);

-- 3. ÖFFNUNGSZEITEN-TABELLE (opening_hours)
create table if not exists public.opening_hours (
  id integer primary key default 1,
  general jsonb not null,
  special jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ROW LEVEL SECURITY (RLS) AKTIVIEREN
alter table public.consultants enable row level security;
alter table public.appointments enable row level security;
alter table public.opening_hours enable row level security;

-- Richtlinien für öffentlichen Lese- und Schreibzugriff (Terminbuchungs-Tool)
drop policy if exists "Public Read Consultants" on public.consultants;
create policy "Public Read Consultants" on public.consultants for select using (true);

drop policy if exists "Public Insert Consultants" on public.consultants;
create policy "Public Insert Consultants" on public.consultants for insert with check (true);

drop policy if exists "Public Update Consultants" on public.consultants;
create policy "Public Update Consultants" on public.consultants for update using (true);

drop policy if exists "Public Delete Consultants" on public.consultants;
create policy "Public Delete Consultants" on public.consultants for delete using (true);

drop policy if exists "Public Read Appointments" on public.appointments;
create policy "Public Read Appointments" on public.appointments for select using (true);

drop policy if exists "Public Insert Appointments" on public.appointments;
create policy "Public Insert Appointments" on public.appointments for insert with check (true);

drop policy if exists "Public Delete Appointments" on public.appointments;
create policy "Public Delete Appointments" on public.appointments for delete using (true);

drop policy if exists "Public Read Opening Hours" on public.opening_hours;
create policy "Public Read Opening Hours" on public.opening_hours for select using (true);

drop policy if exists "Public Upsert Opening Hours" on public.opening_hours;
create policy "Public Upsert Opening Hours" on public.opening_hours for all using (true);

-- 5. INITIALE STANDARD-DATEN EINSETZEN (falls noch leer)
insert into public.consultants (id, name, specialty, image_url, vacations, recurring_blocked_slots)
values 
  (
    'deliah_wysk', 
    'Deliah Wysk', 
    'Deine Planerin für handverlesene Momente', 
    '/deliah_wysk.jpg', 
    '[]'::jsonb, 
    '[]'::jsonb
  ),
  (
    'bernd_wychlacz', 
    'Bernd Wychlacz', 
    'Inhaber & Dein Berater für besondere Wege', 
    '/bernd_wychlacz.jpg', 
    '[]'::jsonb, 
    '[]'::jsonb
  )
on conflict (id) do nothing;

-- Initiale Standard-Öffnungszeiten
insert into public.opening_hours (id, general, special)
values (
  1,
  '{
    "1": {"start": "09:30", "end": "18:00", "lunchStart": "12:30", "lunchEnd": "13:30", "closed": false},
    "2": {"start": "09:30", "end": "18:00", "lunchStart": "12:30", "lunchEnd": "13:30", "closed": false},
    "3": {"start": "09:30", "end": "18:00", "lunchStart": "12:30", "lunchEnd": "13:30", "closed": false},
    "4": {"start": "09:30", "end": "18:00", "lunchStart": "12:30", "lunchEnd": "13:30", "closed": false},
    "5": {"start": "09:30", "end": "18:00", "lunchStart": "12:30", "lunchEnd": "13:30", "closed": false},
    "6": {"start": "10:00", "end": "13:00", "lunchStart": "00:00", "lunchEnd": "00:00", "closed": false},
    "0": {"start": "00:00", "end": "00:00", "lunchStart": "00:00", "lunchEnd": "00:00", "closed": true}
  }'::jsonb,
  '{}'::jsonb
)
on conflict (id) do nothing;

-- 6. STORAGE BUCKET FÜR MITARBEITERBILDER
insert into storage.buckets (id, name, public) 
values ('consultant-images', 'consultant-images', true)
on conflict (id) do update set public = true;

-- Speicher-Richtlinien für Bilder
drop policy if exists "Public Read Consultant Images" on storage.objects;
create policy "Public Read Consultant Images" on storage.objects for select using (bucket_id = 'consultant-images');

drop policy if exists "Public Upload Consultant Images" on storage.objects;
create policy "Public Upload Consultant Images" on storage.objects for insert with check (bucket_id = 'consultant-images');

drop policy if exists "Public Update Consultant Images" on storage.objects;
create policy "Public Update Consultant Images" on storage.objects for update using (bucket_id = 'consultant-images');
