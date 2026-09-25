import { getSupabaseClient } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'artreisen_admin_password';
// 'admin' ist dauerhaft und strikt gesperrt! Standardpasswort ist Ocean2get.
const DEFAULT_PASSWORDS = ['ocean2get', 'artreisen2024', 'artreisen'];

export const getStoredPassword = (): string => {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || 'Ocean2get';
};

export const verifyAdminPassword = async (
  inputPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanPass = inputPassword.trim();

  // 1. Das Wort 'admin' ist strikt gesperrt
  if (cleanPass.toLowerCase() === 'admin') {
    return { 
      success: false, 
      error: "Das Wort 'admin' ist gesperrt! Bitte das korrekte Passwort (z. B. Ocean2get) eingeben." 
    };
  }

  if (!cleanPass) {
    return { success: false, error: 'Bitte ein Passwort eingeben.' };
  }

  // 2. Gespeichertes Passwort prüfen
  const currentSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (currentSaved && cleanPass === currentSaved) {
    return { success: true };
  }

  // 3. Standard-Passwörter prüfen (inkl. Ocean2get / ocean2get)
  if (DEFAULT_PASSWORDS.includes(cleanPass.toLowerCase())) {
    return { success: true };
  }

  // 4. Supabase Abgleich falls vorhanden
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.from('opening_hours').select('admin_password').eq('id', 1).maybeSingle();
      if (data?.admin_password && cleanPass === data.admin_password) {
        localStorage.setItem(LOCAL_STORAGE_KEY, data.admin_password);
        return { success: true };
      }
    }
  } catch (e) {
    // Ignore supabase error
  }

  return { success: false, error: 'Falsches Passwort.' };
};

export const updateAdminPassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
  const cleanPassword = newPassword.trim();
  
  if (cleanPassword.toLowerCase() === 'admin') {
    return { success: false, message: "Das Wort 'admin' ist als Passwort nicht erlaubt!" };
  }

  if (!cleanPassword || cleanPassword.length < 4) {
    return { success: false, message: 'Das neue Passwort muss mindestens 4 Zeichen lang sein.' };
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
