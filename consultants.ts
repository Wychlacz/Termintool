import { type Consultant } from './types';

export const deliahImage = '/deliah_wysk.jpg';
export const berndImage = '/bernd_wychlacz.jpg';

export const consultants: Consultant[] = [
  {
    id: 'deliah_wysk',
    name: 'Deliah Wysk',
    specialty: 'Deine Planerin für handverlesene Momente',
    imageUrl: deliahImage,
    vacations: [],
    recurringBlockedSlots: [],
    fixedAppointments: {}
  },
  {
    id: 'bernd_wychlacz',
    name: 'Bernd Wychlacz',
    specialty: 'Inhaber & Dein Berater für besondere Wege',
    imageUrl: berndImage,
    vacations: [],
    recurringBlockedSlots: [],
    fixedAppointments: {}
  }
];
