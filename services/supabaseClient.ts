import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'artreisen_supabase_url';
const STORAGE_KEY_KEY = 'artreisen_supabase_key';

// Vorkonfigurierte Zugangsdaten (Umgebungsvariablen oder gespeicherte Daten)
const ENV_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const ENV_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Fallback Standard-URL (falls im Code vorbereitet)
const DEFAULT_URL = 'https://qhriatzqiiyrirjclrqu.supabase.co';
const DEFAULT_KEY = 'sb_publishable_bVazB6q9L7HfRLgRPMJn1Q_ReAU1aXe';

export const getSupabaseConfig = (): { url: string; key: string; isConfigured: boolean } => {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const url = localUrl?.trim() || ENV_URL.trim() || DEFAULT_URL;
  const key = localKey?.trim() || ENV_KEY.trim() || DEFAULT_KEY;

  return {
    url,
    key,
    isConfigured: Boolean(url && key && (url.startsWith('https://') || url.startsWith('http://')))
  };
};

let supabaseInstance: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

/**
 * Initialisiert den Supabase-Client mit den aktuell hinterlegten Zugangsdaten.
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (supabaseInstance && currentUrl === url && currentKey === key) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    currentUrl = url;
    currentKey = key;
    console.log('[Supabase] Client initialisiert mit URL:', url);
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase] Initialisierungsfehler:', err);
    return null;
  }
};

/**
 * Speichert neue Supabase-Zugangsdaten im lokalen Speicher und reinitialisiert den Client.
 */
export const saveSupabaseCredentials = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem(STORAGE_KEY_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_URL);
    }

    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_KEY);
    }
  }

  // Force re-initialization
  supabaseInstance = null;
  currentUrl = '';
  currentKey = '';
};

export const hasSupabaseCredentials = (): boolean => {
  return getSupabaseConfig().isConfigured;
};

export const clearSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  supabaseInstance = null;
  currentUrl = '';
  currentKey = '';
};

/**
 * Prüft aktiv die Verbindung zu Supabase und überprüft, ob die Tabellen existieren.
 */
export const checkSupabaseConnection = async (): Promise<{
  connected: boolean;
  hasConsultantsTable: boolean;
  hasAppointmentsTable: boolean;
  hasOpeningHoursTable: boolean;
  hasStorageBucket: boolean;
  message: string;
}> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      hasConsultantsTable: false,
      hasAppointmentsTable: false,
      hasOpeningHoursTable: false,
      hasStorageBucket: false,
      message: 'Keine gültigen Supabase Zugangsdaten hinterlegt.'
    };
  }

  try {
    const [cRes, aRes, oRes] = await Promise.all([
      client.from('consultants').select('id', { count: 'exact', head: true }),
      client.from('appointments').select('id', { count: 'exact', head: true }),
      client.from('opening_hours').select('id', { count: 'exact', head: true })
    ]);

    const hasConsultants = !cRes.error;
    const hasAppointments = !aRes.error;
    const hasOpeningHours = !oRes.error;

    // Check storage bucket
    let hasBucket = false;
    try {
      const { data: buckets } = await client.storage.listBuckets();
      hasBucket = Boolean(buckets?.some(b => b.name === 'consultant-images' || b.id === 'consultant-images'));
    } catch {
      hasBucket = false;
    }

    const connected = hasConsultants || hasAppointments || hasOpeningHours;

    let message = 'Supabase erfolgreich verbunden!';
    if (!hasConsultants || !hasAppointments || !hasOpeningHours) {
      message = 'Verbindung hergestellt, aber einige Tabellen fehlen noch. Bitte SQL-Setup-Script ausführen.';
    }

    return {
      connected,
      hasConsultantsTable: hasConsultants,
      hasAppointmentsTable: hasAppointments,
      hasOpeningHoursTable: hasOpeningHours,
      hasStorageBucket: hasBucket,
      message
    };
  } catch (err: any) {
    return {
      connected: false,
      hasConsultantsTable: false,
      hasAppointmentsTable: false,
      hasOpeningHoursTable: false,
      hasStorageBucket: false,
      message: `Verbindungsfehler: ${err?.message || 'Server nicht erreichbar'}`
    };
  }
};

/**
 * Lädt ein Bild in den Supabase Storage Bucket 'consultant-images' hoch
 * und gibt die öffentliche HTTPS-URL zurück.
 */
export const uploadConsultantImageToSupabase = async (
  file: File,
  consultantId: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase Client nicht verfügbar.' };
  }

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const cleanId = consultantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${cleanId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file
    const { error: uploadError } = await client.storage
      .from('consultant-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.warn('[Supabase Storage] Fehler beim Bucket-Upload:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Public URL abrufen
    const { data } = client.storage.from('consultant-images').getPublicUrl(filePath);
    if (!data?.publicUrl) {
      return { success: false, error: 'Konnte keine öffentliche Bild-URL generieren.' };
    }

    return { success: true, url: data.publicUrl };
  } catch (err: any) {
    console.error('[Supabase Storage] Unerwarteter Upload-Fehler:', err);
    return { success: false, error: err.message || 'Upload fehlgeschlagen.' };
  }
};

export const SUPABASE_SQL_SCHEMA = `-- ====================================================================
-- ART REISEN TERMINPLANER - SUPABASE DATENSTRUKTUR & SCHEMA
-- ====================================================================
-- Kopieren und im Supabase Dashboard unter 'SQL Editor' -> 'New query' ausführen.

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
  date text not null,
  time text not null,
  duration integer not null default 30,
  details jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_appointments_consultant on public.appointments(consultant_id);
create index if not exists idx_appointments_date on public.appointments(date);

-- 3. ÖFFNUNGSZEITEN-TABELLE (opening_hours)
create table if not exists public.opening_hours (
  id integer primary key default 1,
  general jsonb not null,
  special jsonb default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.consultants enable row level security;
alter table public.appointments enable row level security;
alter table public.opening_hours enable row level security;

create policy "Public Read Consultants" on public.consultants for select using (true);
create policy "Public Insert Consultants" on public.consultants for insert with check (true);
create policy "Public Update Consultants" on public.consultants for update using (true);
create policy "Public Delete Consultants" on public.consultants for delete using (true);

create policy "Public Read Appointments" on public.appointments for select using (true);
create policy "Public Insert Appointments" on public.appointments for insert with check (true);
create policy "Public Delete Appointments" on public.appointments for delete using (true);

create policy "Public Read Opening Hours" on public.opening_hours for select using (true);
create policy "Public Upsert Opening Hours" on public.opening_hours for all using (true);

-- 5. INITIALE DATEN (falls noch leer)
insert into public.consultants (id, name, specialty, image_url, vacations, recurring_blocked_slots)
values 
  ('deliah_wysk', 'Deliah Wysk', 'Deine Planerin für handverlesene Momente', '/deliah_wysk.jpg', '[]'::jsonb, '[]'::jsonb),
  ('bernd_wychlacz', 'Bernd Wychlacz', 'Inhaber & Dein Berater für besondere Wege', '/bernd_wychlacz.jpg', '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;

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

-- 6. STORAGE BUCKET FÜR BILDER
insert into storage.buckets (id, name, public) 
values ('consultant-images', 'consultant-images', true)
on conflict (id) do update set public = true;

create policy "Public Read Consultant Images" on storage.objects for select using (bucket_id = 'consultant-images');
create policy "Public Upload Consultant Images" on storage.objects for insert with check (bucket_id = 'consultant-images');
create policy "Public Update Consultant Images" on storage.objects for update using (bucket_id = 'consultant-images');
`;
