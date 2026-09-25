import { getSupabaseClient } from './supabaseClient';

export const ADMIN_USERNAME = 'Ocean2get';
const LOCAL_STORAGE_KEY = 'artreisen_admin_password';
// 'admin' ist dauerhaft und strikt gesperrt
const DEFAULT_PASSWORDS = ['artreisen2024', 'artreisen', 'ocean2get'];

export const getStoredPassword = (): string => {
  return localStorage.getItem(LOCAL_STORAGE_KEY) || 'artreisen2024';
};

export const verifyAdminLogin = async (
  username: string, 
  password: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  // 1. Wort 'admin' ist strikt gesperrt
  if (cleanUser.toLowerCase() === 'admin' || cleanPass.toLowerCase() === 'admin') {
    return { 
      success: false, 
      error: "Das Wort 'admin' ist als Anmeldedaten gesperrt. Bitte verwenden Sie 'Ocean2get' als Anmeldenamen." 
    };
  }

  // 2. Anmeldename prüfen (muss Ocean2get sein)
  if (!cleanUser || cleanUser.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
    return { 
      success: false, 
      error: `Ungültiger Anmeldename. Bitte '${ADMIN_USERNAME}' eingeben.` 
    };
  }

  // 3. Passwort prüfen
  const currentSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (currentSaved && cleanPass === currentSaved) {
    return { success: true };
  }

  // Standard-Passwörter prüfen (OHNE 'admin')
  if (DEFAULT_PASSWORDS.includes(cleanPass.toLowerCase())) {
    return { success: true };
  }

  // Supabase Abgleich
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

export const verifyAdminPassword = async (inputPassword: string): Promise<boolean> => {
  const res = await verifyAdminLogin(ADMIN_USERNAME, inputPassword);
  return res.success;
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
