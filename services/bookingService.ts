import { type AvailabilityRequest, type AvailabilityResponse, type BookingRequest, type Consultant, type OpeningHours, type BookingConfirmation, type WeeklySchedule, type FixedAppointment } from '../types';
import { handleApiRequest as mockApiRequest } from './mockServer';
import { getSupabaseClient } from './supabaseClient';
import { calculateAvailability, isConsultantAvailableForSlot, timeToMinutes, calculateWeeklyScheduleLogic } from './logic';
import { consultants as defaultConsultants } from '../consultants';
import { openingHours as defaultOpeningHours } from '../openingHours';

// --- Supabase Helper Types ---
interface DBAppointment {
    id: string;
    consultant_id: string;
    date: string;
    time: string;
    duration: number;
    details: any; 
}

const getFullConsultantsFromSupabase = async (): Promise<Consultant[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        throw new Error("Supabase Client nicht verfügbar.");
    }

    const { data: consultantsData, error: cError } = await supabase.from('consultants').select('*');
    if (cError) {
        console.warn("[Supabase] Fehler beim Abrufen der Berater:", cError.message);
        throw new Error(`Datenbankfehler (Berater): ${cError.message}`);
    }

    // Wenn Tabelle noch ganz leer ist, Standardberater automatisch anlegen
    if (!consultantsData || consultantsData.length === 0) {
        console.log("[Supabase] Keine Berater in DB gefunden. Lege Standardberater an...");
        try {
            await supabase.from('consultants').insert([
                {
                    id: 'deliah_wysk',
                    name: 'Deliah Wysk',
                    specialty: 'Deine Planerin für handverlesene Momente',
                    image_url: '/deliah_wysk.jpg',
                    vacations: [],
                    recurring_blocked_slots: []
                },
                {
                    id: 'bernd_wychlacz',
                    name: 'Bernd Wychlacz',
                    specialty: 'Inhaber & Dein Berater für besondere Wege',
                    image_url: '/bernd_wychlacz.jpg',
                    vacations: [],
                    recurring_blocked_slots: []
                }
            ]);
        } catch (e) {
            console.warn("[Supabase] Auto-Seed fehlgeschlagen:", e);
        }
        return defaultConsultants;
    }

    let appointmentsData: DBAppointment[] = [];
    try {
        const { data: aData, error: aError } = await supabase.from('appointments').select('*');
        if (!aError && aData) {
            appointmentsData = aData as DBAppointment[];
        }
    } catch (e) {
        console.warn("[Supabase] Termine konnten nicht geladen werden:", e);
    }

    return consultantsData.map((c: any) => {
        const myAppointments = appointmentsData.filter(a => a.consultant_id === c.id);
        const fixedAppointments: { [date: string]: FixedAppointment[] } = {};
        
        myAppointments.forEach(a => {
            if (!fixedAppointments[a.date]) fixedAppointments[a.date] = [];
            fixedAppointments[a.date].push({
                id: a.id,
                time: a.time,
                duration: a.duration,
                bookingDetails: a.details
            });
        });
        
        Object.keys(fixedAppointments).forEach(date => {
            fixedAppointments[date].sort((a,b) => a.time.localeCompare(b.time));
        });

        return {
            id: c.id,
            name: c.name,
            specialty: c.specialty,
            imageUrl: c.image_url || (c.id.includes('deliah') ? '/deliah_wysk.jpg' : '/bernd_wychlacz.jpg'),
            vacations: c.vacations || [],
            recurringBlockedSlots: c.recurring_blocked_slots || [],
            fixedAppointments
        };
    });
};

const getOpeningHoursFromSupabase = async (): Promise<OpeningHours> => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase Client nicht initialisiert");

    const { data, error } = await supabase.from('opening_hours').select('*').limit(1).maybeSingle();
    if (error) {
        console.warn("[Supabase] Fehler beim Abrufen der Öffnungszeiten:", error.message);
        throw new Error(`Datenbankfehler (Öffnungszeiten): ${error.message}`);
    }
    
    if (!data) {
        console.log("[Supabase] Öffnungszeiten noch nicht in DB. Initialisiere Defaults...");
        try {
            await supabase.from('opening_hours').upsert({
                id: 1,
                general: defaultOpeningHours.general,
                special: defaultOpeningHours.special
            });
        } catch (e) {
            console.warn("[Supabase] Initiale Öffnungszeiten konnten nicht gespeichert werden:", e);
        }
        return defaultOpeningHours;
    }
    
    return {
        general: data.general,
        special: data.special || {}
    };
};

/**
 * Registriert einen Realtime-Listener für Änderungen an Terminen, Beratern und Öffnungszeiten.
 */
export const subscribeToSupabaseUpdates = (onUpdate: () => void): (() => void) => {
    const supabase = getSupabaseClient();
    if (!supabase) return () => {};

    try {
        const channel = supabase.channel('artreisen-global-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
                console.log('[Supabase Realtime] Termine aktualisiert!');
                onUpdate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'consultants' }, () => {
                console.log('[Supabase Realtime] Berater aktualisiert!');
                onUpdate();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'opening_hours' }, () => {
                console.log('[Supabase Realtime] Öffnungszeiten aktualisiert!');
                onUpdate();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    } catch (e) {
        console.warn('[Supabase Realtime] Abonnement nicht möglich:', e);
        return () => {};
    }
};

export const fetchAvailability = async (request: AvailabilityRequest): Promise<AvailabilityResponse[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const [consultants, openingHours] = await Promise.all([
                getFullConsultantsFromSupabase(),
                getOpeningHoursFromSupabase()
            ]);
            return calculateAvailability(request, consultants, openingHours);
        } catch (e) {
            console.warn("[Supabase] Fallback auf lokale Verfügbarkeitsberechnung wegen Fehler:", e);
        }
    }
    return mockApiRequest(`/api/availability?date1=${request.date1}&consultantId=${request.consultantId}&appointmentType=${request.appointmentType}`);
};

const sendAdminNotificationEmail = async (bookingDetails: BookingRequest) => {
    console.group("📧 TERMIN-BENACHRICHTIGUNG (Simulation)");
    console.log(`An: info@artreisen.de\nBetreff: Neuer Termin von ${bookingDetails.name}`);
    console.log(`Details: ${bookingDetails.date} um ${bookingDetails.time} Uhr`);
    console.groupEnd();
};

export const bookAppointment = async (bookingDetails: BookingRequest): Promise<{ success: boolean; confirmation: BookingConfirmation }> => {
    const supabase = getSupabaseClient();
    await sendAdminNotificationEmail(bookingDetails);

    if (supabase) {
        if (bookingDetails.time === 'Sondertermin') {
             return { 
                success: true, 
                confirmation: {
                    title: 'Deine Anfrage ist auf dem Weg!',
                    message: `Danke für deine Anfrage, ${bookingDetails.name}! Wir prüfen das sofort und melden uns bei dir.`
                }
            };
        }
        
        try {
            const [consultants, openingHours] = await Promise.all([
                getFullConsultantsFromSupabase(), 
                getOpeningHoursFromSupabase()
            ]);
            
            const consultant = consultants.find(c => c.id === bookingDetails.consultantId);
            if (!consultant) throw new Error("Ausgewählter Berater nicht im System gefunden.");

            const duration = parseInt(bookingDetails.appointmentType, 10);
            const slotStartMinutes = timeToMinutes(bookingDetails.time);
            
            if (!isConsultantAvailableForSlot(bookingDetails.date, slotStartMinutes, duration, consultant, openingHours)) {
                return { success: false, confirmation: { title: 'Fehler', message: `Dieser Termin wurde leider gerade eben vergeben.` } };
            }

            const { error } = await supabase.from('appointments').insert({
                consultant_id: bookingDetails.consultantId,
                date: bookingDetails.date,
                time: bookingDetails.time,
                duration: duration,
                details: {
                    name: bookingDetails.name,
                    email: bookingDetails.email,
                    phone: bookingDetails.phone,
                    whatsappAccepted: bookingDetails.whatsappAccepted,
                    consultationType: bookingDetails.consultationType,
                    comment: bookingDetails.comment,
                    privacyAccepted: bookingDetails.privacyAccepted
                }
            });
            
            if (error) {
                console.warn("[Supabase] Insert fehlgeschlagen, wechsle auf Fallback:", error);
                throw error;
            }
            
            return { 
                success: true, 
                confirmation: { 
                    title: 'Reserviert!', 
                    message: `Vielen Dank für deine Buchung, ${bookingDetails.name}! Wir freuen uns auf dich.` 
                } 
            };
        } catch (e) {
            console.warn("[Supabase] Buchungsfehler, verwende lokalen Speicher:", e);
        }
    }
    const response = await mockApiRequest('/api/bookings', { method: 'POST', body: JSON.stringify(bookingDetails) });
    return response;
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { error } = await supabase.from('appointments').delete().eq('id', appointmentId);
            if (!error) return;
            console.warn("[Supabase] Termin konnte in Supabase nicht gelöscht werden:", error);
        } catch (e) {
            console.warn("[Supabase] Delete-Fehler:", e);
        }
    }
    await mockApiRequest(`/api/appointments/${appointmentId}`, { method: 'DELETE' });
};

export const fetchWeeklySchedule = async (startDate: string): Promise<WeeklySchedule> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const [consultants, openingHours] = await Promise.all([
                getFullConsultantsFromSupabase(), 
                getOpeningHoursFromSupabase()
            ]);
            return calculateWeeklyScheduleLogic(startDate, consultants, openingHours);
        } catch (e) {
            console.warn("[Supabase] Wochenkalender-Fallback:", e);
        }
    }
    return mockApiRequest(`/api/weekly-schedule?startDate=${startDate}`);
};

export const fetchConsultants = async (): Promise<Consultant[]> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            return await getFullConsultantsFromSupabase();
        } catch (e) {
            console.warn("[Supabase] Berater-Fallback:", e);
        }
    }
    return mockApiRequest('/api/consultants');
};

export const fetchOpeningHours = async (): Promise<OpeningHours> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            return await getOpeningHoursFromSupabase();
        } catch (e) {
            console.warn("[Supabase] Öffnungszeiten-Fallback:", e);
        }
    }
    return mockApiRequest('/api/opening-hours');
};

// ... CRUD-Funktionen für Admin Panel ...

export const addConsultant = async (consultant: Omit<Consultant, 'id'>): Promise<Consultant> => {
    const supabase = getSupabaseClient();
    const id = consultant.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random()*1000);
    
    if (supabase) {
        try {
            const { data, error } = await supabase.from('consultants').insert({
                id: id, 
                name: consultant.name, 
                specialty: consultant.specialty, 
                image_url: consultant.imageUrl, 
                vacations: consultant.vacations, 
                recurring_blocked_slots: consultant.recurringBlockedSlots
            }).select().single();
            
            if (!error && data) {
                return { 
                    id: data.id, 
                    name: data.name, 
                    specialty: data.specialty, 
                    imageUrl: data.image_url, 
                    vacations: data.vacations, 
                    recurringBlockedSlots: data.recurring_blocked_slots, 
                    fixedAppointments: {} 
                };
            }
        } catch (e) {
            console.warn("[Supabase] Neuer Berater Fallback:", e);
        }
    }
    return mockApiRequest('/api/consultants', { method: 'POST', body: JSON.stringify(consultant) });
};

export const updateConsultant = async (consultant: Consultant): Promise<Consultant> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { error } = await supabase.from('consultants').update({
                name: consultant.name, 
                specialty: consultant.specialty, 
                image_url: consultant.imageUrl, 
                vacations: consultant.vacations, 
                recurring_blocked_slots: consultant.recurringBlockedSlots,
                updated_at: new Date().toISOString()
            }).eq('id', consultant.id);
            
            if (!error) {
                // Auch lokal synchronisieren
                try {
                    await mockApiRequest(`/api/consultants/${consultant.id}`, { method: 'PUT', body: JSON.stringify(consultant) });
                } catch {}
                return consultant;
            }
            console.warn("[Supabase] Berater-Update in Supabase fehlgeschlagen:", error);
        } catch (e) {
            console.warn("[Supabase] Update-Fehler:", e);
        }
    }
    return mockApiRequest(`/api/consultants/${consultant.id}`, { method: 'PUT', body: JSON.stringify(consultant) });
};

export const deleteConsultant = async (id: string): Promise<void> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            await supabase.from('appointments').delete().eq('consultant_id', id);
            await supabase.from('consultants').delete().eq('id', id);
        } catch (e) {
            console.warn("[Supabase] Delete-Fehler:", e);
        }
    }
    await mockApiRequest(`/api/consultants/${id}`, { method: 'DELETE' });
};

export const updateOpeningHours = async (hours: OpeningHours): Promise<OpeningHours> => {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { error } = await supabase.from('opening_hours').upsert({ 
                id: 1, 
                general: hours.general, 
                special: hours.special,
                updated_at: new Date().toISOString()
            });
            if (!error) {
                try {
                    await mockApiRequest('/api/opening-hours', { method: 'PUT', body: JSON.stringify(hours) });
                } catch {}
                return hours;
            }
        } catch (e) {
            console.warn("[Supabase] Öffnungszeiten Update-Fehler:", e);
        }
    }
    return mockApiRequest('/api/opening-hours', { method: 'PUT', body: JSON.stringify(hours) });
};
