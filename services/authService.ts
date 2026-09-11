import { getSupabaseClient } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'artreisen_admin_password';
const DEFAULT_PASSWORDS = ['artreisen2024', 'artreisen', 'admin'];

export const getStoredPassword = (): string => {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || 'artreisen2024';
};

export const verifyAdminPassword = async (inputPassword: string): Promise<boolean> => {
  const cleanInput = inputPassword.trim();
  const currentSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
  
  if (currentSaved && cleanInput === currentSaved) {
    return true;
  }
  
  // Try lowercase match with defaults
  if (DEFAULT_PASSWORDS.includes(cleanInput.toLowerCase())) {
    return true;
  }

  // Check Supabase if available
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.from('opening_hours').select('admin_password').eq('id', 1).maybeSingle();
      if (data?.admin_password && cleanInput === data.admin_password) {
        localStorage.setItem(LOCAL_STORAGE_KEY, data.admin_password);
        return true;
      }
    }
  } catch (e) {
    // Ignore supabase error
  }

  return false;
};

export const updateAdminPassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
  const cleanPassword = newPassword.trim();
  if (!cleanPassword || cleanPassword.length < 4) {
    return { success: false, message: 'Das Passwort muss mindestens 4 Zeichen lang sein.' };
  }

  // 1. Save to local storage for immediate persistence
  localStorage.setItem(LOCAL_STORAGE_KEY, cleanPassword);

  // 2. Try syncing to Supabase if opening_hours table has id: 1
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.from('opening_hours').update({ admin_password: cleanPassword }).eq('id', 1);
      if (!error) {
        console.log('[Auth] Passwort erfolgreich in Supabase synchronisiert.');
      }
    }
  } catch (e) {
    console.warn('[Auth] Supabase-Sync für Passwort nicht verfügbar (nur lokal gespeichert):', e);
  }

  return { success: true, message: 'Passwort erfolgreich aktualisiert!' };
};
