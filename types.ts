
export type AppointmentType = '15' | '30' | '60';

export interface RecurringBlockedSlot {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  exceptionDates: string[]; // "YYYY-MM-DD"
}

export interface FixedAppointment {
  id?: string; // Database ID for existing bookings
  time: string; // "HH:mm"
  duration: number; // in minutes
  bookingDetails?: {
    name: string;
    email: string;
    phone?: string;
    comment?: string;
    whatsappAccepted?: boolean;
    consultationType?: string;
  }
}

export interface Consultant {
  id: string;
  name: string;
  specialty: string;
  imageUrl: string;
  vacations: { start: string; end: string }[];
  fixedAppointments?: {
    [date: string]: FixedAppointment[]; 
  };
  recurringBlockedSlots?: RecurringBlockedSlot[];
}

export interface FormData {
  appointmentType: AppointmentType;
  date1: string;
  date2: string;
  specialRequestDate: string;
  comment: string;
  name: string;
  email: string;
  phone: string;
  consultationType: 'in-office' | 'zoom';
  privacyAccepted: boolean;
  whatsappAccepted: boolean;
  consultantId: string; // 'any' or consultant.id
}

export interface AvailabilityRequest {
    appointmentType: AppointmentType;
    date1: string;
    date2?: string;
    consultantId: string;
}

export interface AvailabilitySlot {
  time: string;
  consultantId: string;
  date: string;
}

export interface AvailabilityResponse {
  datum: string;
  freie_slots: { time: string; consultantId: string; }[];
  belegte_slots: string[];
  vacationUntil?: string; // If the consultant is on vacation
}

export interface BookingRequest extends FormData {
    date: string;
    time: string;
}

export interface BookingConfirmation {
  title: string;
  message: string;
}

export type AppTheme = 'default' | 'south-africa';

export interface DayHours {
  start: string;      // "HH:mm"
  end: string;        // "HH:mm"
  lunchStart: string; // "HH:mm"
  lunchEnd: string;   // "HH:mm"
  closed: boolean;
}

export interface SpecialDay extends DayHours {
  name: string;
}

export interface OpeningHours {
  general: { [key: number]: DayHours };
  special: { [date: string]: SpecialDay };
}

export interface ScheduleEntry {
  id?: string;
  type: 'appointment' | 'blocked' | 'vacation' | 'lunch' | 'special_closed';
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  title?: string;
  details?: FixedAppointment['bookingDetails'];
}

export interface WeeklySchedule {
  [date: string]: { // "YYYY-MM-DD"
    [consultantId: string]: ScheduleEntry[];
  };
}
