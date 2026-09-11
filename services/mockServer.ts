
import { consultants as initialConsultants } from '../consultants';
import { openingHours as initialOpeningHours } from '../openingHours';
import { type AvailabilityRequest, type Consultant, type OpeningHours, type BookingRequest, type WeeklySchedule, type FixedAppointment } from '../types';
import { calculateAvailability, calculateWeeklyScheduleLogic } from './logic';

// Version v40 für saubere Bildpfade Deliah Wysk & Bernd Wychlacz
const STORAGE_KEY_CONSULTANTS = 'artreisen_v40_clean_images';
const STORAGE_KEY_HOURS = 'artreisen_v8_hours';

const saveToStorage = (consultants: Consultant[], hours: OpeningHours) => {
  try {
    localStorage.setItem(STORAGE_KEY_CONSULTANTS, JSON.stringify(consultants));
    localStorage.setItem(STORAGE_KEY_HOURS, JSON.stringify(hours));
  } catch (e) {
    console.error("Speicher-Fehler:", e);
  }
};

const loadFromStorage = (): { consultants: Consultant[]; hours: OpeningHours } | null => {
  const c = localStorage.getItem(STORAGE_KEY_CONSULTANTS);
  const h = localStorage.getItem(STORAGE_KEY_HOURS);
  if (c && h) {
    try {
      return { consultants: JSON.parse(c), hours: JSON.parse(h) };
    } catch (e) {
      return null;
    }
  }
  return null;
};

const savedData = loadFromStorage();
let mockConsultants: Consultant[] = savedData?.consultants || JSON.parse(JSON.stringify(initialConsultants));
let mockOpeningHours: OpeningHours = savedData?.hours || JSON.parse(JSON.stringify(initialOpeningHours));

// Sync default image
mockConsultants.forEach(mc => {
  const initC = initialConsultants.find(i => i.id === mc.id);
  if (initC && (!mc.imageUrl || mc.id === 'deliah_wysk' || mc.id === 'bernd_wychlacz')) {
    mc.imageUrl = initC.imageUrl;
  }
});

// Eindeutige IDs für ALLES sicherstellen
const ensureIds = (consultants: Consultant[]) => {
  let changed = false;
  consultants.forEach(c => {
    if (c.fixedAppointments) {
      Object.keys(c.fixedAppointments).forEach(date => {
        c.fixedAppointments![date] = c.fixedAppointments![date].map((apt, idx) => {
          if (!apt.id) {
            changed = true;
            return { ...apt, id: `id_${c.id}_${date}_${idx}_${Math.random().toString(36).substr(2, 4)}` };
          }
          return apt;
        });
      });
    }
  });
  return changed;
};

if (ensureIds(mockConsultants) || !savedData) {
  saveToStorage(mockConsultants, mockOpeningHours);
}

const respond = <T>(data: T): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), 30));
};

export const handleApiRequest = (url: string, options: RequestInit = {}): Promise<any> => {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body as string) : null;
  const urlObj = new URL(url, 'http://localhost');
  const path = urlObj.pathname;
  const params = urlObj.searchParams;

  // SYSTEM RESET (für den Notfall)
  if (method === 'POST' && path === '/api/admin/reset') {
    localStorage.removeItem(STORAGE_KEY_CONSULTANTS);
    localStorage.removeItem(STORAGE_KEY_HOURS);
    mockConsultants = JSON.parse(JSON.stringify(initialConsultants));
    mockOpeningHours = JSON.parse(JSON.stringify(initialOpeningHours));
    ensureIds(mockConsultants);
    saveToStorage(mockConsultants, mockOpeningHours);
    return respond({ success: true });
  }

  if (method === 'GET') {
    if (path === '/api/consultants') return respond(mockConsultants);
    if (path === '/api/opening-hours') return respond(mockOpeningHours);
    if (path === '/api/weekly-schedule') {
        return respond(calculateWeeklyScheduleLogic(params.get('startDate')!, mockConsultants, mockOpeningHours));
    }
    if (path === '/api/availability') {
      const request: AvailabilityRequest = {
        date1: params.get('date1')!,
        date2: params.get('date2') || undefined,
        consultantId: params.get('consultantId')!,
        appointmentType: params.get('appointmentType') as '15' | '30' | '60',
      };
      return respond(calculateAvailability(request, mockConsultants, mockOpeningHours));
    }
  }

  if (method === 'POST' && path === '/api/bookings') {
    const booking: BookingRequest = body;
    const cIdx = mockConsultants.findIndex(c => c.id === booking.consultantId);
    if (cIdx === -1) return respond({ error: 'Berater nicht gefunden' });

    const newApt: FixedAppointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      time: booking.time,
      duration: parseInt(booking.appointmentType, 10),
      bookingDetails: { ...booking }
    };

    mockConsultants[cIdx].fixedAppointments = {
      ...(mockConsultants[cIdx].fixedAppointments || {}),
      [booking.date]: [...(mockConsultants[cIdx].fixedAppointments?.[booking.date] || []), newApt].sort((a,b) => a.time.localeCompare(b.time))
    };
    saveToStorage(mockConsultants, mockOpeningHours);
    return respond({ success: true, confirmation: { title: 'Erfolg', message: 'Gebucht' } });
  }

  if (method === 'DELETE' && path.includes('/api/appointments/')) {
    const idToDelete = path.split('/').filter(Boolean).pop();
    let deleted = false;

    mockConsultants = mockConsultants.map(c => {
      if (!c.fixedAppointments) return c;
      const newFixed = { ...c.fixedAppointments };
      let changed = false;

      Object.keys(newFixed).forEach(date => {
        const countBefore = newFixed[date].length;
        newFixed[date] = newFixed[date].filter(a => a.id !== idToDelete);
        if (newFixed[date].length < countBefore) {
          changed = true;
          deleted = true;
        }
      });

      return changed ? { ...c, fixedAppointments: newFixed } : c;
    });

    if (deleted) {
      saveToStorage(mockConsultants, mockOpeningHours);
      return respond({ success: true });
    }
    return respond({ error: 'ID nicht gefunden' });
  }

  // CONSULTANTS CRUD
  if (method === 'POST' && path === '/api/consultants') {
    const newC: Consultant = {
      id: body.id || `c_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: body.name || 'Neuer Berater',
      specialty: body.specialty || '',
      imageUrl: body.imageUrl || '',
      vacations: body.vacations || [],
      recurringBlockedSlots: body.recurringBlockedSlots || [],
      fixedAppointments: body.fixedAppointments || {}
    };
    mockConsultants.push(newC);
    saveToStorage(mockConsultants, mockOpeningHours);
    return respond(newC);
  }

  if (method === 'PUT' && path.startsWith('/api/consultants/')) {
    const cId = path.split('/').filter(Boolean).pop();
    const idx = mockConsultants.findIndex(c => c.id === cId);
    if (idx !== -1) {
      mockConsultants[idx] = { ...mockConsultants[idx], ...body };
      saveToStorage(mockConsultants, mockOpeningHours);
      return respond(mockConsultants[idx]);
    }
    return respond({ error: 'Berater nicht gefunden' });
  }

  if (method === 'DELETE' && path.startsWith('/api/consultants/')) {
    const cId = path.split('/').filter(Boolean).pop();
    mockConsultants = mockConsultants.filter(c => c.id !== cId);
    saveToStorage(mockConsultants, mockOpeningHours);
    return respond({ success: true });
  }

  // OPENING HOURS CRUD
  if (method === 'PUT' && path === '/api/opening-hours') {
    mockOpeningHours = body;
    saveToStorage(mockConsultants, mockOpeningHours);
    return respond(mockOpeningHours);
  }

  return respond({ error: 'Route nicht definiert' });
};
