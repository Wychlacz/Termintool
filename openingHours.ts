import { type OpeningHours } from './types';

// This is the central data source for opening hours.
// The Admin Panel temporarily modifies this data in memory.
export const openingHours: OpeningHours = {
  // 0=Sun, 1=Mon, ..., 6=Sat
  general: {
    1: { start: '10:00', end: '18:00', lunchStart: '13:00', lunchEnd: '15:00', closed: false }, // Monday
    2: { start: '10:00', end: '18:00', lunchStart: '13:00', lunchEnd: '15:00', closed: false }, // Tuesday
    3: { start: '10:00', end: '18:00', lunchStart: '13:00', lunchEnd: '15:00', closed: false }, // Wednesday
    4: { start: '10:00', end: '18:00', lunchStart: '13:00', lunchEnd: '15:00', closed: false }, // Thursday
    5: { start: '10:00', end: '18:00', lunchStart: '13:00', lunchEnd: '15:00', closed: false }, // Friday
    6: { start: '10:00', end: '16:00', lunchStart: '', lunchEnd: '', closed: false }, // Saturday
    0: { start: '10:00', end: '16:00', lunchStart: '', lunchEnd: '', closed: false }, // Sunday
  },
  special: {
    // Example:
    // '2024-12-24': { name: 'Heiligabend', start: '10:00', end: '13:00', lunchStart: '', lunchEnd: '', closed: false },
    // '2024-12-25': { name: '1. Weihnachtstag', start: '', end: '', lunchStart: '', lunchEnd: '', closed: true },
  },
};