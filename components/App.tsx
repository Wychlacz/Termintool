
import React, { useState, useEffect, useRef } from 'react';
import { type FormData, type AvailabilityResponse, type AppTheme, type AvailabilitySlot, type Consultant, type OpeningHours, type BookingConfirmation } from '../types';
import { fetchAvailability, bookAppointment, fetchConsultants, fetchOpeningHours, updateConsultant, subscribeToSupabaseUpdates } from '../services/bookingService';
import { consultants as initialConsultants } from '../consultants';
import { BookingForm } from './BookingForm';
import { AvailabilityDisplay } from './AvailabilityDisplay';
import { ConfirmationScreen } from './ConfirmationScreen';
import { Header } from './Header';
import { AdminPanel } from './AdminPanel';
import { WeeklyCalendar } from './WeeklyCalendar';
import { LegalModal, type LegalTab } from './LegalModal';
import { verifyAdminPassword } from '../services/authService';

const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    appointmentType: '30',
    date1: '',
    date2: '',
    specialRequestDate: '',
    comment: '',
    name: '',
    email: '',
    phone: '',
    consultationType: 'in-office',
    privacyAccepted: false,
    whatsappAccepted: false,
    consultantId: 'any',
  });
  
  const [theme, setTheme] = useState<AppTheme>('default');
  const [availability, setAvailability] = useState<AvailabilityResponse[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'slots' | 'confirm' | 'booked'>('form');
  const [consultantNotAvailable, setConsultantNotAvailable] = useState<string | null>(null);
  const [view, setView] = useState<'booking' | 'admin'>('booking');
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [openingHours, setOpeningHours] = useState<OpeningHours | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingConfirmation | null>(null);
  const mainContentRef = useRef<HTMLElement>(null);
  const [showWeeklyView, setShowWeeklyView] = useState<boolean>(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab | null>(null);


  const fetchData = async () => {
    try {
        setIsLoading(true);
        setError(null);
        console.log("Starte Datenabruf von Supabase...");
        
        const [consultantsData, openingHoursData] = await Promise.all([
            fetchConsultants(),
            fetchOpeningHours(),
        ]);
        
        console.log("Daten erfolgreich geladen:", { consultantsCount: consultantsData.length, hasOpeningHours: !!openingHoursData });
        
        // Automatischer Fix für Wochenende in der Datenbank
        if (openingHoursData && (openingHoursData.general[6].closed || openingHoursData.general[0].closed)) {
            console.log("Wochenende in DB noch geschlossen. Führe Auto-Fix aus...");
            const updatedHours: OpeningHours = {
                ...openingHoursData,
                general: {
                    ...openingHoursData.general,
                    6: { start: '10:00', end: '16:00', lunchStart: '', lunchEnd: '', closed: false },
                    0: { start: '10:00', end: '16:00', lunchStart: '', lunchEnd: '', closed: false }
                }
            };
            try {
                const { updateOpeningHours } = await import('../services/bookingService');
                await updateOpeningHours(updatedHours);
                setOpeningHours(updatedHours);
            } catch (e) {
                console.error("Fehler beim Auto-Fix der Öffnungszeiten:", e);
                setOpeningHours(openingHoursData);
            }
        } else {
            setOpeningHours(openingHoursData);
        }
        
        // Strikte und eindeutige Beraterliste (Deliah Wysk & Bernd Wychlacz)
        const deliahTarget = initialConsultants.find(ic => ic.id === 'deliah_wysk') || initialConsultants[0];
        const berndTarget = initialConsultants.find(ic => ic.id === 'bernd_wychlacz') || initialConsultants[1];

        const deliahFromDb = consultantsData?.find(c => c.id === 'deliah_wysk' || c.name.toLowerCase().includes('deliah'));
        const berndFromDb = consultantsData?.find(c => c.id === 'bernd_wychlacz' || c.name.toLowerCase().includes('bernd'));

        const finalDeliah: Consultant = {
            id: 'deliah_wysk',
            name: deliahFromDb?.name || deliahTarget.name,
            specialty: deliahFromDb?.specialty || deliahTarget.specialty,
            imageUrl: deliahFromDb?.imageUrl || deliahTarget.imageUrl,
            vacations: deliahFromDb?.vacations || [],
            fixedAppointments: deliahFromDb?.fixedAppointments || {},
            recurringBlockedSlots: deliahFromDb?.recurringBlockedSlots || []
        };

        const finalBernd: Consultant = {
            id: 'bernd_wychlacz',
            name: berndFromDb?.name || berndTarget.name,
            specialty: berndFromDb?.specialty || berndTarget.specialty,
            imageUrl: berndFromDb?.imageUrl || berndTarget.imageUrl,
            vacations: berndFromDb?.vacations || [],
            fixedAppointments: berndFromDb?.fixedAppointments || {},
            recurringBlockedSlots: berndFromDb?.recurringBlockedSlots || []
        };

        const otherConsultants = (consultantsData || []).filter(c => 
            c.id !== 'deliah_wysk' && c.id !== 'bernd_wychlacz' && 
            !c.name.toLowerCase().includes('deliah') && !c.name.toLowerCase().includes('bernd')
        );

        const finalConsultants = [finalDeliah, finalBernd, ...otherConsultants];
        setConsultants(finalConsultants);
    } catch (err) {
        console.error("Kritischer Fehler beim Laden der App-Daten:", err);
        setError(`Fehler beim Laden der Anwendungsdaten: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}. Bitte Seite neu laden.`);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeToSupabaseUpdates(() => {
      fetchData();
    });
    return () => {
      unsubscribe();
    };
  }, []);


  useEffect(() => {
    if (formData.comment.toLowerCase().includes('südafrika')) {
      setTheme('south-africa');
    } else {
      setTheme('default');
    }
  }, [formData.comment]);

  const scrollToTop = () => {
    mainContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAdminAccess = () => {
    if (isAdmin) {
      setView('admin');
    } else {
      setPasswordInput('');
      setPasswordError(null);
      setShowPasswordPrompt(true);
    }
  };
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyAdminPassword(passwordInput);
    if (isValid) {
      setIsAdmin(true);
      setView('admin');
      setShowPasswordPrompt(false);
      setPasswordInput('');
      setPasswordError(null);
    } else {
      setPasswordError('Falsches Passwort.');
      setPasswordInput('');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const inputValue = isCheckbox ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: inputValue }));
    setError(null);
    setConsultantNotAvailable(null);
  };

  const handleCheckAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date1 && !formData.specialRequestDate) {
      setError('Bitte wähle mindestens ein Wunschdatum aus oder stell eine Sonderanfrage.');
      scrollToTop();
      return;
    }
    setError(null);
    setConsultantNotAvailable(null);
    setIsLoading(true);
    setAvailability([]);

    if (formData.specialRequestDate) {
        setSelectedSlot({ date: formData.specialRequestDate, time: 'Sondertermin', consultantId: formData.consultantId });
        setStep('confirm');
        setIsLoading(false);
        return;
    }

    try {
      const results = await fetchAvailability({
        appointmentType: formData.appointmentType,
        date1: formData.date1,
        date2: formData.date2,
        consultantId: formData.consultantId
      });

      const vacationInfo = results.find(r => r.vacationUntil);
      if (vacationInfo) {
          const consultant = consultants.find(c => c.id === formData.consultantId);
          setError(`${consultant?.name || 'Der Berater'} ist bis zum ${vacationInfo.vacationUntil} im Urlaub. Bitte wähle einen anderen Zeitraum oder Berater.`);
          setIsLoading(false);
          scrollToTop();
          return;
      }

      const hasSlots = results.some(day => day.freie_slots.length > 0);
      if (!hasSlots && formData.consultantId !== 'any') {
          setConsultantNotAvailable(formData.consultantId);
      }

      setAvailability(results);
      setStep('slots');
    } catch (err) {
      console.error("Verfügbarkeits-Fehler:", err);
      setError('Terminabfrage fehlgeschlagen. Bitte versuch es später erneut.');
      scrollToTop();
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCheckOtherConsultants = () => {
      setFormData(prev => ({...prev, consultantId: 'any'}));
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      setTimeout(() => handleCheckAvailability(fakeEvent), 0);
  }

  const handleSelectSlot = (date: string, time: string, consultantId: string) => {
    setSelectedSlot({ date, time, consultantId });
    setStep('confirm');
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot || !formData.name || !formData.email || !formData.phone) {
      setError('Bitte füll alle erforderlichen Felder aus (Name, E-Mail und Telefon).');
      scrollToTop();
      return
    }
     if (!formData.privacyAccepted) {
      setError('Bitte akzeptiere die Datenschutzerklärung, um fortzufahren.');
      scrollToTop();
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
        const result = await bookAppointment({
            ...formData,
            date: selectedSlot.date,
            time: selectedSlot.time,
            consultantId: selectedSlot.consultantId,
        });
        
        if (result.success) {
            setBookingConfirmation(result.confirmation);
            setStep('booked');
        } else {
            throw new Error(result.confirmation?.message || 'Buchung fehlgeschlagen. Der gewählte Termin ist nicht mehr verfügbar.');
        }
    } catch(err) {
        const errorMessage = (err instanceof Error) ? err.message : 'Ein unbekannter Fehler ist aufgetreten.';
        setError(errorMessage);
        setStep('slots');
        setSelectedSlot(null);
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleCheckAvailability(fakeEvent);
        scrollToTop();
    } finally {
        setIsLoading(false);
    }
  };

  const reset = () => {
    setFormData({
      appointmentType: '30',
      date1: '',
      date2: '',
      specialRequestDate: '',
      comment: '',
      name: '',
      email: '',
      phone: '',
      consultationType: 'in-office',
      privacyAccepted: false,
      whatsappAccepted: false,
      consultantId: 'any'
    });
    setAvailability([]);
    setSelectedSlot(null);
    setError(null);
    setStep('form');
    setTheme('default');
    setConsultantNotAvailable(null);
    setBookingConfirmation(null);
  };

  const themeClasses = {
    default: {
      bg: 'bg-gradient-to-br from-blue-50 to-orange-50',
      text: 'text-artreisen-blue',
      accent: 'bg-artreisen-orange',
      accentText: 'text-white',
      border: 'border-artreisen-blue/30',
      icon: '🌍'
    },
    'south-africa': {
      bg: 'bg-safari-sand',
      text: 'text-safari-brown',
      accent: 'bg-artreisen-orange',
      accentText: 'text-white',
      border: 'border-safari-brown/30',
      icon: '🐾'
    }
  };

  const currentTheme = themeClasses[theme];

  return (
    <div className={`min-h-screen w-full font-open-sans p-4 sm:p-8 transition-colors duration-500 ${currentTheme.bg} ${currentTheme.text}`}>
      <div className="container mx-auto max-w-4xl relative">
        {showPasswordPrompt && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPasswordPrompt(false)}
          >
            <div 
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl max-w-sm w-full text-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold font-montserrat mb-4">Admin-Anmeldung</h3>
              <form onSubmit={handlePasswordSubmit}>
                <label htmlFor="password-input" className="block text-sm font-semibold text-gray-700 mb-2">Passwort</label>
                <input
                  id="password-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Passwort eingeben"
                  className={`w-full p-3 rounded-lg border ${passwordError ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-artreisen-orange`}
                  autoFocus
                />
                {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPasswordPrompt(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-artreisen-blue text-white rounded-md hover:bg-artreisen-blue/80 transition"
                  >
                    Anmelden
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {openingHours && showWeeklyView && (
          <WeeklyCalendar
            consultants={consultants}
            openingHours={openingHours}
            onClose={() => setShowWeeklyView(false)}
          />
        )}

        <Header theme={theme} />
        
        <main 
            ref={mainContentRef}
            className="bg-white/70 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg mt-8 border"
            style={{borderColor: theme === 'default' ? '#0085cd30' : '#64313130'}}
        >
          {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert"><p>{error}</p></div>}
          
          {view === 'booking' ? (
            <>
              {openingHours ? (
                <>
                  {step === 'form' && (
                    <BookingForm 
                      formData={formData} 
                      onChange={handleFormChange} 
                      onSubmit={handleCheckAvailability} 
                      isLoading={isLoading} 
                      theme={theme} 
                      consultants={consultants} 
                      openingHours={openingHours}
                      onOpenLegal={(tab) => setLegalModalTab(tab)}
                    />
                  )}
                  {(step === 'slots' || step === 'confirm') && (
                    <AvailabilityDisplay
                      availability={availability}
                      selectedSlot={selectedSlot}
                      onSelectSlot={handleSelectSlot}
                      onConfirmBooking={handleConfirmBooking}
                      onBack={() => { setStep('form'); setSelectedSlot(null); setError(null); setConsultantNotAvailable(null); }}
                      isLoading={isLoading}
                      theme={theme}
                      formData={formData}
                      onFormChange={handleFormChange}
                      step={step}
                      consultantNotAvailable={consultantNotAvailable}
                      onCheckOtherConsultants={handleCheckOtherConsultants}
                      consultants={consultants}
                    />
                  )}
                  {step === 'booked' && <ConfirmationScreen onReset={reset} theme={theme} formData={formData} selectedSlot={selectedSlot} consultants={consultants} confirmation={bookingConfirmation} />}
                </>
              ) : (
                <div className="text-center p-8">
                  <p className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-artreisen-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Lade Anwendungsdaten...
                  </p>
                </div>
              )}
            </>
          ) : (
             <>
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold font-montserrat">Verwaltungsbereich</h2>
                    <button onClick={() => setView('booking')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition flex items-center gap-2">
                        <span role="img" aria-label="calendar">🗓️</span> Zur Terminbuchung
                    </button>
                </div>
                {openingHours ? (
                    <AdminPanel 
                        consultants={consultants}
                        openingHours={openingHours}
                        onDataUpdate={fetchData}
                        onShowWeeklyView={() => setShowWeeklyView(true)}
                    />
                ) : <p>Lade Verwaltungsdaten...</p>}
             </>
          )}

        </main>
        
        {/* Footer with Impressum, Datenschutz (DSGVO), AGB & Admin */}
        <footer className="mt-8 pt-4 border-t border-gray-200/60 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Reisebüro art reisen GmbH</span>
            <span>•</span>
            <button 
                type="button" 
                onClick={() => setLegalModalTab('impressum')} 
                className="hover:text-artreisen-blue hover:underline font-semibold transition-colors cursor-pointer"
            >
                Impressum
            </button>
            <span>•</span>
            <button 
                type="button" 
                onClick={() => setLegalModalTab('datenschutz')} 
                className="hover:text-artreisen-blue hover:underline font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Datenschutz (DSGVO)
            </button>
            <span>•</span>
            <button 
                type="button" 
                onClick={() => setLegalModalTab('agb')} 
                className="hover:text-artreisen-blue hover:underline font-semibold transition-colors cursor-pointer"
            >
                AGB
            </button>
            {view === 'booking' && (
              <>
                <span>•</span>
                <button 
                    type="button" 
                    onClick={handleAdminAccess} 
                    className="text-gray-400 hover:text-gray-700 transition-colors text-[11px] font-mono px-1.5 py-0.5 rounded hover:bg-gray-100 cursor-pointer"
                >
                    Admin-Anmeldung
                </button>
              </>
            )}
        </footer>

        {/* Legal Modal Popup */}
        {legalModalTab && (
          <LegalModal 
            activeTab={legalModalTab} 
            onClose={() => setLegalModalTab(null)} 
            onSelectTab={setLegalModalTab} 
          />
        )}

      </div>
    </div>
  );
};

export default App;
