import React, { useState, useEffect } from 'react';
import { type Consultant, type RecurringBlockedSlot, type OpeningHours, type DayHours, type SpecialDay, type FixedAppointment } from '../types';
import { 
  addConsultant, 
  updateConsultant, 
  deleteConsultant, 
  updateOpeningHours,
  getMakeWebhookUrl,
  saveMakeWebhookUrl,
  sendToMakeWebhook,
  createMakeWebhookPayload
} from '../services/bookingService';
import { 
  saveSupabaseCredentials, 
  hasSupabaseCredentials, 
  clearSupabaseCredentials,
  checkSupabaseConnection,
  uploadConsultantImageToSupabase,
  getSupabaseConfig,
  SUPABASE_SQL_SCHEMA
} from '../services/supabaseClient';
import { handleApiRequest } from '../services/mockServer';
import { berndImage, deliahImage } from '../consultants';
import { updateAdminPassword, getStoredPassword } from '../services/authService';

interface AdminPanelProps {
  consultants: Consultant[];
  openingHours: OpeningHours;
  onDataUpdate: () => Promise<void>;
  onShowWeeklyView: () => void;
}

const weekDays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

// --- Settings Component mit Supabase Cloud-Verwaltung ---

const SettingsManager: React.FC<{ onDataUpdate: () => Promise<void> }> = ({ onDataUpdate }) => {
    const config = getSupabaseConfig();
    const [url, setUrl] = useState(config.url);
    const [key, setKey] = useState(config.key);
    const [isChecking, setIsChecking] = useState(false);
    const [status, setStatus] = useState<{
        checked: boolean;
        connected: boolean;
        hasConsultantsTable: boolean;
        hasAppointmentsTable: boolean;
        hasOpeningHoursTable: boolean;
        hasStorageBucket: boolean;
        message: string;
    } | null>(null);
    const [copied, setCopied] = useState(false);
    const [showSql, setShowSql] = useState(false);
    const [makeWebhookUrl, setMakeWebhookUrlState] = useState(getMakeWebhookUrl());
    const [makeTestStatus, setMakeTestStatus] = useState<string | null>(null);
    const [isTestingMake, setIsTestingMake] = useState(false);

    useEffect(() => {
        runCheck();
    }, []);

    const runCheck = async () => {
        setIsChecking(true);
        const res = await checkSupabaseConnection();
        setStatus({ checked: true, ...res });
        setIsChecking(false);
    };

    const handleSave = async () => {
        saveSupabaseCredentials(url, key);
        await runCheck();
        await onDataUpdate();
        alert('Supabase-Einstellungen gespeichert und neu synchronisiert.');
    };

    const handleSaveMake = () => {
        saveMakeWebhookUrl(makeWebhookUrl);
        alert('Make.com Webhook-URL gespeichert!');
    };

    const handleTestMake = async () => {
        if (!makeWebhookUrl.trim()) {
            alert('Bitte tragen Sie zuerst Ihre Make.com Webhook-URL ein.');
            return;
        }
        saveMakeWebhookUrl(makeWebhookUrl);
        setIsTestingMake(true);
        setMakeTestStatus(null);
        try {
            const today = new Date().toISOString().split('T')[0];
            const testPayload = createMakeWebhookPayload({
                id: 'test-' + Date.now(),
                name: 'Bernd Wychlacz (Testkunde)',
                email: 'info@artreisen.de',
                phone: '+49 2104 75711',
                date: today,
                time: '14:30',
                duration: 30,
                consultantId: 'bernd_wychlacz',
                consultantName: 'Bernd Wychlacz',
                consultationType: 'in-office',
                whatsappAccepted: true,
                privacyAccepted: true,
                comment: 'Testübertragung aus dem art reisen Terminplaner zur Prüfung der E-Mail-Felder.',
                event: 'test_appointment'
            });
            const res = await sendToMakeWebhook(testPayload);
            if (res.success) {
                setMakeTestStatus('success');
            } else {
                setMakeTestStatus(res.error || 'Fehler beim Senden');
            }
        } catch (e: any) {
            setMakeTestStatus(e?.message || 'Unerwarteter Fehler');
        } finally {
            setIsTestingMake(false);
        }
    };

    const handleCopySql = () => {
        navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleReset = async () => {
        if (window.confirm("ACHTUNG: Dies setzt die lokalen Daten auf Werkseinstellungen zurück. Fortfahren?")) {
            await handleApiRequest('/api/admin/reset', { method: 'POST' });
            alert("System wurde zurückgesetzt. Die Seite wird jetzt neu geladen.");
            window.location.reload();
        }
    };

    return (
        <div className="space-y-8">
            {/* Status-Übersicht */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                        <h3 className="text-base font-black uppercase text-artreisen-blue">Supabase Cloud-Status</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Zentraler Datenspeicher für mehrere Computer & Filialen</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {status?.checked && (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                status.connected && status.hasConsultantsTable && status.hasAppointmentsTable
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : status.connected
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                    status.connected && status.hasConsultantsTable ? 'bg-emerald-500' : status.connected ? 'bg-amber-500' : 'bg-gray-400'
                                }`}></span>
                                {status.connected && status.hasConsultantsTable && status.hasAppointmentsTable
                                    ? 'Cloud Verbunden'
                                    : status.connected
                                    ? 'Verbunden (Tabellen fehlen)'
                                    : 'Lokaler Modus'}
                            </span>
                        )}
                        <button 
                            onClick={runCheck} 
                            disabled={isChecking}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isChecking ? 'Prüfe...' : 'Aktualisieren'}
                        </button>
                    </div>
                </div>

                {status?.checked && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                        <div className={`p-3 rounded-xl border flex flex-col justify-between ${status.hasConsultantsTable ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-amber-50/50 border-amber-200 text-amber-900'}`}>
                            <span className="font-bold">Berater-Tabelle</span>
                            <span className="text-[11px] mt-1 font-mono">{status.hasConsultantsTable ? '✅ consultants' : '⚠️ Fehlt'}</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex flex-col justify-between ${status.hasAppointmentsTable ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-amber-50/50 border-amber-200 text-amber-900'}`}>
                            <span className="font-bold">Termin-Tabelle</span>
                            <span className="text-[11px] mt-1 font-mono">{status.hasAppointmentsTable ? '✅ appointments' : '⚠️ Fehlt'}</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex flex-col justify-between ${status.hasOpeningHoursTable ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-amber-50/50 border-amber-200 text-amber-900'}`}>
                            <span className="font-bold">Öffnungszeiten</span>
                            <span className="text-[11px] mt-1 font-mono">{status.hasOpeningHoursTable ? '✅ opening_hours' : '⚠️ Fehlt'}</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex flex-col justify-between ${status.hasStorageBucket ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-blue-50/50 border-blue-200 text-blue-900'}`}>
                            <span className="font-bold">Bilder-Bucket</span>
                            <span className="text-[11px] mt-1 font-mono">{status.hasStorageBucket ? '✅ Bereit' : 'ℹ️ Optional'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Zugangsdaten Konfiguration */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <h3 className="text-base font-black uppercase text-artreisen-blue">Supabase Zugangsdaten</h3>
                <p className="text-xs text-gray-500">
                    Tragen Sie hier die Projekt-URL und den Anon-Key aus Ihrem Supabase Dashboard ein (<code className="bg-gray-100 px-1 py-0.5 rounded">Project Settings &rarr; API</code>).
                </p>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Project URL</label>
                        <input 
                            type="text" 
                            value={url} 
                            onChange={e => setUrl(e.target.value)} 
                            placeholder="https://xxxxxxxxxxxx.supabase.co" 
                            className="w-full p-3 border rounded-xl text-xs font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-artreisen-orange outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Anon / Public Key</label>
                        <input 
                            type="password" 
                            value={key} 
                            onChange={e => setKey(e.target.value)} 
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
                            className="w-full p-3 border rounded-xl text-xs font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-artreisen-orange outline-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={handleSave} 
                        className="flex-1 py-3 bg-artreisen-blue hover:bg-blue-900 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow transition-colors"
                    >
                        Speichern & Verbinden
                    </button>
                    <button 
                        onClick={() => {
                            clearSupabaseCredentials();
                            setUrl('');
                            setKey('');
                            runCheck();
                            alert('Supabase-Verbindung zurückgesetzt. Lokaler Modus aktiv.');
                        }} 
                        className="px-4 py-3 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl font-bold uppercase text-xs transition-colors"
                    >
                        Trennen
                    </button>
                </div>
            </div>

            {/* Make.com Webhook Konfiguration */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                        <h3 className="text-base font-black uppercase text-artreisen-blue">Make.com Webhook (E-Mail Weiterleitung)</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Automatischer E-Mail-Versand an Reisebüro & Kunden über Ihr Make-Szenario</p>
                    </div>
                    {makeWebhookUrl && (
                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            Aktiv
                        </span>
                    )}
                </div>

                <p className="text-xs text-gray-500">
                    Tragen Sie hier die Webhook-Adresse Ihres Make.com-Szenarios ein. Jeder neue Termin (auch Sonderanfragen) wird zusätzlich direkt an Make.com übermittelt, falls der Supabase-Datenbanktrigger nicht auslöst.
                </p>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Make Webhook-URL</label>
                        <input 
                            type="text" 
                            value={makeWebhookUrl} 
                            onChange={e => setMakeWebhookUrlState(e.target.value)} 
                            placeholder="https://hook.eu1.make.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                            className="w-full p-3 border rounded-xl text-xs font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                </div>

                {makeTestStatus && (
                    <div className={`p-3 rounded-xl border text-xs font-medium ${
                        makeTestStatus === 'success' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        {makeTestStatus === 'success' ? (
                            <span>✅ Test-Ping erfolgreich an Make.com gesendet! Prüfen Sie den Ausführungsverlauf in Ihrem Make-Szenario.</span>
                        ) : (
                            <span>❌ Fehler beim Senden an Make.com: {makeTestStatus}</span>
                        )}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button 
                        onClick={handleSaveMake} 
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow transition-colors"
                    >
                        Webhook-URL Speichern
                    </button>
                    <button 
                        onClick={handleTestMake} 
                        disabled={isTestingMake}
                        className="px-5 py-3 border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl font-bold uppercase text-xs transition-colors disabled:opacity-50"
                    >
                        {isTestingMake ? 'Sendet...' : 'Webhook testen 🚀'}
                    </button>
                </div>
            </div>

            {/* SQL-Setup Script für Tabellen und Bilder */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-black uppercase text-artreisen-blue">Datenstruktur & SQL-Schema</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Erstellt alle Tabellen, Berechtigungen und den Bilder-Speicher mit 1 Klick</p>
                    </div>
                    <button 
                        onClick={handleCopySql} 
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            copied ? 'bg-emerald-600 text-white shadow-md' : 'bg-artreisen-orange text-white hover:bg-orange-600 shadow'
                        }`}
                    >
                        {copied ? 'Kopiert! ✅' : 'SQL-Code kopieren'}
                    </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-slate-800">So richten Sie die Datenbank in 1 Minute ein:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                        <li>Klicken Sie oben auf <strong>"SQL-Code kopieren"</strong>.</li>
                        <li>Öffnen Sie Ihr Supabase Dashboard auf <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-artreisen-blue underline font-bold">supabase.com</a>.</li>
                        <li>Klicken Sie im linken Menü auf <strong>SQL Editor</strong> &rarr; <strong>New query</strong>.</li>
                        <li>Fügen Sie den kopierten Code ein und klicken Sie unten rechts auf <strong>Run</strong> (Ausführen).</li>
                    </ol>
                </div>

                <div>
                    <button 
                        onClick={() => setShowSql(!showSql)} 
                        className="text-xs font-bold text-artreisen-blue hover:underline flex items-center gap-1"
                    >
                        {showSql ? 'SQL-Vorschau ausblenden ▲' : 'SQL-Code anzeigen ▼'}
                    </button>
                    {showSql && (
                        <pre className="mt-3 p-4 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800">
                            {SUPABASE_SQL_SCHEMA}
                        </pre>
                    )}
                </div>
            </div>

            {/* Notfall-Funktionen */}
            <div className="border-t pt-6">
                <h3 className="text-sm font-black uppercase text-red-600 mb-1">Notfall-Funktion</h3>
                <p className="text-xs text-gray-500 mb-4">Setzt den lokalen Cache des Browsers auf den Auslieferungszustand zurück.</p>
                <button 
                    onClick={handleReset} 
                    className="py-3 px-6 border-2 border-red-600 text-red-600 rounded-xl text-xs font-black uppercase hover:bg-red-50 transition-colors"
                >
                    Lokale Daten zurücksetzen
                </button>
            </div>
        </div>
    );
};

// --- ConsultantManager mit Cloud-Foto-Upload ---

const ConsultantManager: React.FC<{consultants: Consultant[], onDataUpdate: () => Promise<void>}> = ({ consultants, onDataUpdate }) => {
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [newVacation, setNewVacation] = useState<{ start: string, end: string }>({ start: '', end: '' });
  const [newRecurringBlock, setNewRecurringBlock] = useState<{ dayOfWeek: number, startTime: string, endTime: string }>({ dayOfWeek: 1, startTime: '12:00', endTime: '13:00' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const handleSave = async (consultantToSave: Consultant) => {
    setIsSaving(true);
    setError(null);
    setSuccessBanner(null);
    try {
        await updateConsultant(consultantToSave);
        await onDataUpdate();
        setEditingConsultant(null);
        setSuccessBanner(`Mitarbeiter "${consultantToSave.name}" & Foto erfolgreich gespeichert! ✅`);
        setTimeout(() => setSuccessBanner(null), 5000);
    } catch (e: any) {
        setError(e?.message || 'Fehler beim Speichern des Mitarbeiters.');
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddConsultant = async () => {
    const newConsultant = await addConsultant({
        name: 'Neuer Mitarbeiter',
        specialty: 'Reiseberatung',
        imageUrl: berndImage,
        vacations: [],
        fixedAppointments: {},
        recurringBlockedSlots: []
    });
    await onDataUpdate();
    setEditingConsultant(newConsultant);
  };

  const handleDeleteConsultant = async (id: string) => {
      if (window.confirm('Mitarbeiter wirklich löschen?')) {
        await deleteConsultant(id);
        await onDataUpdate();
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingConsultant) return;

    setIsUploadingImage(true);
    setUploadMessage('Bild wird verarbeitet & optimiert...');
    setError(null);

    // 1. Zuerst Versuch über Supabase Storage (falls Bucket vorhanden)
    try {
      const storageRes = await uploadConsultantImageToSupabase(file, editingConsultant.id);
      if (storageRes.success && storageRes.url) {
        const updated = { ...editingConsultant, imageUrl: storageRes.url };
        setEditingConsultant(updated);
        // Sofort in Supabase speichern!
        await updateConsultant(updated);
        await onDataUpdate();
        setUploadMessage('Foto erfolgreich in Supabase Cloud gespeichert! ✅');
        setIsUploadingImage(false);
        return;
      }
    } catch (err) {
      console.warn('[Admin] Storage-Upload nicht möglich, wechsle auf optimierte Direktspeicherung:', err);
    }

    // 2. Direktspeicherung in DB: Bild clientseitig komprimieren und sofort in Supabase speichern
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 500;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            // Sofort im lokalen State & in Supabase sichern
            const updated = { ...editingConsultant, imageUrl: compressedDataUrl };
            setEditingConsultant(updated);
            await updateConsultant(updated);
            await onDataUpdate();
            setUploadMessage('Foto sofort erfolgreich in Supabase gespeichert! ✅');
          }
        } catch (uploadErr: any) {
          console.error('Fehler beim Fotospeichern:', uploadErr);
          setUploadMessage('Fehler beim Speichern: ' + (uploadErr?.message || 'Unbekannt'));
        } finally {
          setIsUploadingImage(false);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  if (editingConsultant) {
    return (
        <div className="space-y-6 bg-white p-6 rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between border-b pb-4">
                <button onClick={() => setEditingConsultant(null)} className="font-bold text-artreisen-blue flex items-center gap-1 text-sm hover:underline">
                  &larr; Zurück zur Übersicht
                </button>
                <h3 className="font-black uppercase text-sm text-gray-700">Mitarbeiter bearbeiten</h3>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{error}</div>}

            {/* Foto-Upload Bereich */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
              <label className="block text-xs font-black uppercase text-gray-500 tracking-wider">Mitarbeiterfoto / Portrait</label>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <img
                    src={editingConsultant.imageUrl || (editingConsultant.id.includes('deliah') ? deliahImage : berndImage)}
                    alt={editingConsultant.name}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = editingConsultant.id.includes('deliah') ? deliahImage : berndImage;
                    }}
                  />
                </div>
                
                <div className="space-y-3 flex-1 w-full">
                  <div className="flex flex-wrap gap-2 items-center">
                    <label className={`cursor-pointer bg-artreisen-blue hover:bg-blue-900 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all inline-flex items-center gap-2 ${isUploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      {isUploadingImage ? 'Wird verarbeitet...' : 'Neues Foto hochladen'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>

                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingConsultant({
                          ...editingConsultant,
                          imageUrl: editingConsultant.id.includes('deliah') ? deliahImage : berndImage
                        });
                        setUploadMessage(null);
                      }}
                      className="px-3 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase transition-colors"
                    >
                      Original wiederherstellen
                    </button>
                  </div>

                  {uploadMessage && (
                    <p className="text-xs font-bold text-emerald-600">{uploadMessage}</p>
                  )}
                  
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Wählen Sie eine Bilddatei (JPG, PNG) von Ihrem Computer. Das Bild wird in Supabase Cloud oder der Datenbank gespeichert und geräteübergreifend synchronisiert.
                  </p>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Oder öffentliche Bild-URL (Supabase Storage / Web):</span>
                    <input
                      type="text"
                      value={editingConsultant.imageUrl.startsWith('data:') ? '(Hochgeladenes Foto gespeichert)' : editingConsultant.imageUrl}
                      onChange={e => {
                        const val = e.target.value;
                        if (!val.startsWith('(Hochgeladenes')) {
                          setEditingConsultant({...editingConsultant, imageUrl: val});
                        }
                      }}
                      onFocus={e => {
                        if (e.target.value.startsWith('(Hochgeladenes')) {
                          setEditingConsultant({...editingConsultant, imageUrl: ''});
                        }
                      }}
                      placeholder="https://... (z.B. von Supabase Storage oder Firmenwebsite)"
                      className="w-full p-2.5 text-xs border rounded-xl bg-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stammdaten */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={editingConsultant.name} 
                    onChange={e => setEditingConsultant({...editingConsultant, name: e.target.value})} 
                    className="w-full p-3 border rounded-xl text-sm" 
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Spezialgebiet / Beschreibung</label>
                  <input 
                    type="text" 
                    value={editingConsultant.specialty} 
                    onChange={e => setEditingConsultant({...editingConsultant, specialty: e.target.value})} 
                    className="w-full p-3 border rounded-xl text-sm" 
                    placeholder="Spezialgebiet"
                  />
                </div>
            </div>

            {/* Urlaube & Abwesenheiten */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">Urlaub & Abwesenheit</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="date" 
                  value={newVacation.start} 
                  onChange={e => setNewVacation({...newVacation, start: e.target.value})} 
                  className="p-2.5 border rounded-xl text-xs bg-white flex-1"
                />
                <span className="self-center text-xs font-bold text-gray-400">bis</span>
                <input 
                  type="date" 
                  value={newVacation.end} 
                  onChange={e => setNewVacation({...newVacation, end: e.target.value})} 
                  className="p-2.5 border rounded-xl text-xs bg-white flex-1"
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newVacation.start && newVacation.end) {
                      setEditingConsultant({
                        ...editingConsultant,
                        vacations: [...(editingConsultant.vacations || []), { start: newVacation.start, end: newVacation.end }]
                      });
                      setNewVacation({ start: '', end: '' });
                    }
                  }}
                  className="px-4 py-2.5 bg-artreisen-blue text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-900 transition-colors"
                >
                  Hinzufügen
                </button>
              </div>

              {editingConsultant.vacations && editingConsultant.vacations.length > 0 ? (
                <div className="space-y-2 pt-2 border-t">
                  {editingConsultant.vacations.map((v, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border text-xs">
                      <span>🌴 {v.start} bis {v.end}</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const updated = editingConsultant.vacations.filter((_, i) => i !== idx);
                          setEditingConsultant({...editingConsultant, vacations: updated});
                        }}
                        className="text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded-lg"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Keine Urlaubszeiten eingetragen.</p>
              )}
            </div>

            {/* Regelmäßige Sperrzeiten */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4">
              <h4 className="text-xs font-black uppercase text-gray-500 tracking-wider">Regelmäßige Sperrzeiten (z. B. Pause)</h4>
              <div className="flex flex-wrap gap-2 items-center">
                <select 
                  value={newRecurringBlock.dayOfWeek}
                  onChange={e => setNewRecurringBlock({...newRecurringBlock, dayOfWeek: Number(e.target.value)})}
                  className="p-2.5 border rounded-xl text-xs bg-white"
                >
                  {weekDays.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
                <input 
                  type="time" 
                  value={newRecurringBlock.startTime}
                  onChange={e => setNewRecurringBlock({...newRecurringBlock, startTime: e.target.value})}
                  className="p-2.5 border rounded-xl text-xs bg-white"
                />
                <span className="text-xs font-bold text-gray-400">-</span>
                <input 
                  type="time" 
                  value={newRecurringBlock.endTime}
                  onChange={e => setNewRecurringBlock({...newRecurringBlock, endTime: e.target.value})}
                  className="p-2.5 border rounded-xl text-xs bg-white"
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newRecurringBlock.startTime && newRecurringBlock.endTime) {
                      const newBlock: RecurringBlockedSlot = {
                        id: `block_${Date.now()}`,
                        dayOfWeek: newRecurringBlock.dayOfWeek,
                        startTime: newRecurringBlock.startTime,
                        endTime: newRecurringBlock.endTime,
                        exceptionDates: []
                      };
                      setEditingConsultant({
                        ...editingConsultant,
                        recurringBlockedSlots: [...(editingConsultant.recurringBlockedSlots || []), newBlock]
                      });
                    }
                  }}
                  className="px-4 py-2.5 bg-artreisen-blue text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-900 transition-colors"
                >
                  Sperre hinzufügen
                </button>
              </div>

              {editingConsultant.recurringBlockedSlots && editingConsultant.recurringBlockedSlots.length > 0 ? (
                <div className="space-y-2 pt-2 border-t">
                  {editingConsultant.recurringBlockedSlots.map((b) => (
                    <div key={b.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border text-xs">
                      <span>⛔ {weekDays[b.dayOfWeek]}: {b.startTime} - {b.endTime} Uhr</span>
                      <button 
                        type="button"
                        onClick={() => {
                          const updated = editingConsultant.recurringBlockedSlots.filter(x => x.id !== b.id);
                          setEditingConsultant({...editingConsultant, recurringBlockedSlots: updated});
                        }}
                        className="text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded-lg"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Keine regelmäßigen Sperrzeiten eingetragen.</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setEditingConsultant(null)} 
                className="flex-1 py-4 border border-gray-300 text-gray-600 font-bold rounded-xl uppercase text-xs hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => handleSave(editingConsultant)} 
                disabled={isSaving}
                className="flex-1 py-4 bg-artreisen-orange hover:bg-orange-600 text-white font-black rounded-xl uppercase text-xs shadow-md transition-all disabled:opacity-50"
              >
                {isSaving ? 'Speichert...' : 'Änderungen Speichern'}
              </button>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-3">
      {successBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-fadeIn">
          {successBanner}
        </div>
      )}
      {consultants.map(c => (
        <div key={c.id} className="flex items-center justify-between p-4 bg-white border rounded-2xl shadow-sm hover:border-gray-300 transition-all">
          <div className="flex items-center gap-4">
            <img 
              src={c.imageUrl || (c.id.includes('deliah') ? deliahImage : berndImage)} 
              alt={c.name}
              referrerPolicy="no-referrer" 
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = c.id.includes('deliah') || c.name.toLowerCase().includes('deliah') ? deliahImage : berndImage;
              }}
              className="w-12 h-12 rounded-2xl object-cover border shadow-sm"
            />
            <div>
              <p className="font-bold text-gray-800">{c.name}</p>
              <p className="text-xs text-gray-500">{c.specialty}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingConsultant(c)} className="px-4 py-2 bg-artreisen-blue text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-900 transition-colors">Bearbeiten</button>
            <button onClick={() => handleDeleteConsultant(c.id)} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold uppercase hover:bg-red-100 transition-colors">Löschen</button>
          </div>
        </div>
      ))}
      <button onClick={handleAddConsultant} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl font-black uppercase text-xs text-gray-500 hover:border-artreisen-orange hover:text-artreisen-orange transition-all mt-4">
        + Neuen Mitarbeiter hinzufügen
      </button>
    </div>
  );
};

const OpeningHoursManager: React.FC<{openingHours: OpeningHours, onDataUpdate: () => Promise<void>}> = ({ openingHours, onDataUpdate }) => {
    const [local, setLocal] = useState(openingHours);
    const handleSave = async () => {
        await updateOpeningHours(local);
        await onDataUpdate();
        alert('Öffnungszeiten aktualisiert.');
    };
    return (
        <div className="space-y-4">
            {[1,2,3,4,5,6,0].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white border rounded-2xl">
                    <label className="w-24 font-bold">{weekDays[i]}</label>
                    <input type="time" value={local.general[i].start} onChange={e => setLocal({...local, general: {...local.general, [i]: {...local.general[i], start: e.target.value}}})} className="p-2 border rounded-lg"/>
                    <span>-</span>
                    <input type="time" value={local.general[i].end} onChange={e => setLocal({...local, general: {...local.general, [i]: {...local.general[i], end: e.target.value}}})} className="p-2 border rounded-lg"/>
                    <label className="flex items-center gap-2 ml-auto">
                        <input type="checkbox" checked={local.general[i].closed} onChange={e => setLocal({...local, general: {...local.general, [i]: {...local.general[i], closed: e.target.checked}}})}/>
                        <span className="text-xs font-bold uppercase">Zu</span>
                    </label>
                </div>
            ))}
            <button onClick={handleSave} className="w-full py-4 bg-artreisen-blue text-white font-black rounded-xl uppercase shadow-lg">Speichern</button>
        </div>
    );
};

const PasswordManager: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatusMessage(null);

        if (newPassword.length < 4) {
            setStatusMessage({ type: 'error', text: 'Das neue Passwort muss mindestens 4 Zeichen lang sein.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatusMessage({ type: 'error', text: 'Die Passwörter stimmen nicht überein.' });
            return;
        }

        setIsSaving(true);
        try {
            const res = await updateAdminPassword(newPassword);
            if (res.success) {
                setStatusMessage({ type: 'success', text: '✅ Passwort erfolgreich gespeichert! Ab sofort gilt das neue Passwort für den Admin-Login.' });
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setStatusMessage({ type: 'error', text: res.message });
            }
        } catch (err: any) {
            setStatusMessage({ type: 'error', text: err.message || 'Fehler beim Speichern des Passworts.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-lg mx-auto space-y-6">
            <div className="border-b pb-4">
                <h3 className="text-base font-black uppercase text-artreisen-blue tracking-wide flex items-center gap-2">
                    <span>🔑</span> Admin-Passwort ändern
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                    Legen Sie hier das Passwort für den Zugang zum Verwaltungsbereich fest (das Wort &bdquo;admin&ldquo; ist gesperrt).
                </p>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Neues Passwort
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mindestens 4 Zeichen"
                            className="w-full p-3 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-artreisen-blue pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-semibold"
                        >
                            {showPassword ? 'Verbergen' : 'Anzeigen'}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Passwort wiederholen
                    </label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Passwort erneut eingeben"
                        className="w-full p-3 bg-slate-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-artreisen-blue"
                        required
                    />
                </div>

                {statusMessage && (
                    <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                        statusMessage.type === 'success' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        {statusMessage.text}
                    </div>
                )}

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-3.5 bg-artreisen-blue hover:bg-blue-900 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'Wird gespeichert...' : 'Neues Passwort speichern'}
                    </button>
                </div>
            </form>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                ℹ️ <strong>Hinweis:</strong> Das Passwort wird sofort auf diesem Gerät und bei aktiver Supabase-Verbindung auch für andere Geräte synchronisiert.
            </div>
        </div>
    );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ consultants, openingHours, onDataUpdate, onShowWeeklyView }) => {
    const [tab, setTab] = useState<'consultants' | 'hours' | 'password' | 'settings'>('consultants');

    const tabs: { id: 'consultants' | 'hours' | 'password' | 'settings'; label: string }[] = [
        { id: 'consultants', label: 'Mitarbeiter & Fotos' },
        { id: 'hours', label: 'Öffnungszeiten' },
        { id: 'password', label: '🔑 Passwort ändern' },
        { id: 'settings', label: 'Cloud / Supabase' }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                {tabs.map(t => (
                    <button 
                        key={t.id} 
                        onClick={() => setTab(t.id)} 
                        className={`py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-all ${
                            tab === t.id 
                                ? 'bg-white text-artreisen-blue shadow border border-slate-200' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            
            <div className="flex justify-end">
                <button onClick={onShowWeeklyView} className="px-6 py-2 bg-artreisen-blue text-white rounded-full font-black uppercase text-[10px] shadow-lg hover:bg-blue-900 transition-colors">
                    Wochenplan öffnen
                </button>
            </div>

            {tab === 'consultants' && <ConsultantManager consultants={consultants} onDataUpdate={onDataUpdate} />}
            {tab === 'hours' && <OpeningHoursManager openingHours={openingHours} onDataUpdate={onDataUpdate} />}
            {tab === 'password' && <PasswordManager />}
            {tab === 'settings' && <SettingsManager onDataUpdate={onDataUpdate} />}
        </div>
    );
};
