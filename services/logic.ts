
import { type Consultant, type OpeningHours, type AvailabilityRequest, type AvailabilityResponse, type WeeklySchedule } from '../types';

export const timeToMinutes = (time: string): number => {
    if (typeof time !== 'string' || !time.includes(':')) return NaN;
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return NaN;
    return hours * 60 + minutes;
};

export function isConsultantAvailableForSlot(
  dateStr: string,
  slotStartMinutes: number,
  slotDuration: number,
  consultant: Consultant,
  allOpeningHours: OpeningHours
): boolean {
    const slotEndMinutes = slotStartMinutes + slotDuration;
    const date = new Date(dateStr + 'T00:00:00Z');
    const dayOfWeek = date.getUTCDay();

    for (const vacation of consultant.vacations) {
        if (dateStr >= vacation.start && dateStr <= vacation.end) return false;
    }

    const hours = allOpeningHours.special[dateStr] || allOpeningHours.general[dayOfWeek];
    if (hours.closed) return false;
    
    const officeStartMinutes = timeToMinutes(hours.start);
    const officeEndMinutes = timeToMinutes(hours.end);
    if (isNaN(officeStartMinutes) || isNaN(officeEndMinutes)) return false;
    if (slotStartMinutes < officeStartMinutes || slotEndMinutes > officeEndMinutes) return false;

    const lunchStartMinutes = timeToMinutes(hours.lunchStart);
    const lunchEndMinutes = timeToMinutes(hours.lunchEnd);
    if (!isNaN(lunchStartMinutes) && !isNaN(lunchEndMinutes)) {
        if (slotStartMinutes < lunchEndMinutes && slotEndMinutes > lunchStartMinutes) return false;
    }

    const appointments = consultant.fixedAppointments?.[dateStr] || [];
    for (const apt of appointments) {
        const aptStartMinutes = timeToMinutes(apt.time);
        if (isNaN(aptStartMinutes)) continue;
        const aptEndMinutes = aptStartMinutes + apt.duration;
        if (slotStartMinutes < aptEndMinutes && slotEndMinutes > slotStartMinutes) return false;
    }

    const recurringSlots = consultant.recurringBlockedSlots || [];
    for (const recurring of recurringSlots) {
        if (recurring.dayOfWeek === dayOfWeek && !recurring.exceptionDates.includes(dateStr)) {
            const recurringStartMinutes = timeToMinutes(recurring.startTime);
            const recurringEndMinutes = timeToMinutes(recurring.endTime);
            if (isNaN(recurringStartMinutes) || isNaN(recurringEndMinutes)) continue;
            if (slotStartMinutes < recurringEndMinutes && slotEndMinutes > recurringStartMinutes) return false;
        }
    }
    return true;
}

export function calculateAvailability(
    request: AvailabilityRequest, 
    consultants: Consultant[], 
    openingHours: OpeningHours
): AvailabilityResponse[] {
    const datesToCheck: string[] = [request.date1];
    if (request.date2 && request.date1 !== request.date2) datesToCheck.push(request.date2);
    
    const consultantsToCheckBase = request.consultantId === 'any' ? consultants : consultants.filter(c => c.id === request.consultantId);
    const slotDuration = parseInt(request.appointmentType, 10);
    const results: AvailabilityResponse[] = [];
    const MAX_SLOTS_PER_BLOCK = 6;

    for (const dateStr of datesToCheck) {
        const slotsForDay = new Map<string, string>();
        const date = new Date(dateStr + 'T00:00:00Z');
        const dayOfWeek = date.getUTCDay();
        const hours = openingHours.special[dateStr] || openingHours.general[dayOfWeek];
        if (hours.closed) {
            results.push({ datum: dateStr, freie_slots: [], belegte_slots: [] });
            continue;
        }
        const officeStartMinutes = timeToMinutes(hours.start);
        const officeEndMinutes = timeToMinutes(hours.end);
        const lunchStartMinutes = timeToMinutes(hours.lunchStart);
        const hasLunch = !isNaN(lunchStartMinutes);
        
        if (isNaN(officeStartMinutes) || isNaN(officeEndMinutes) || officeStartMinutes >= officeEndMinutes) {
            results.push({ datum: dateStr, freie_slots: [], belegte_slots: [] });
            continue;
        }

        let morningCount = 0;
        let afternoonCount = 0;
        // Wenn kein Mittagessen, erlauben wir mehr Slots im "Vormittags"-Block
        const effectiveMaxSlots = hasLunch ? MAX_SLOTS_PER_BLOCK : MAX_SLOTS_PER_BLOCK * 2;

        for (let slotStartMinutes = officeStartMinutes; slotStartMinutes + slotDuration <= officeEndMinutes; slotStartMinutes += 30) {
            if (slotStartMinutes % 30 !== 0) continue;
            const isAfternoon = hasLunch && slotStartMinutes >= lunchStartMinutes;
            
            if (!isAfternoon && morningCount >= effectiveMaxSlots) continue;
            if (isAfternoon && afternoonCount >= MAX_SLOTS_PER_BLOCK) continue;
            
            const timeStr = `${String(Math.floor(slotStartMinutes / 60)).padStart(2, '0')}:${String(slotStartMinutes % 60).padStart(2, '0')}`;
            if (slotsForDay.has(timeStr)) continue;
            const currentConsultantsCheck = [...consultantsToCheckBase];
            if (request.consultantId === 'any') currentConsultantsCheck.sort(() => Math.random() - 0.5);
            for (const consultant of currentConsultantsCheck) {
                if (isConsultantAvailableForSlot(dateStr, slotStartMinutes, slotDuration, consultant, openingHours)) {
                    slotsForDay.set(timeStr, consultant.id);
                    if (isAfternoon) afternoonCount++; else morningCount++;
                    break;
                }
            }
        }
        const finalSlotsForDay = Array.from(slotsForDay.entries()).map(([time, consultantId]) => ({ time, consultantId })).sort((a, b) => a.time.localeCompare(b.time));
        results.push({ datum: dateStr, freie_slots: finalSlotsForDay, belegte_slots: [] });
    }

    if (request.consultantId !== 'any' && results.every(r => r.freie_slots.length === 0)) {
        const singleConsultant = consultants.find(c => c.id === request.consultantId);
        if (singleConsultant) {
            return datesToCheck.map(dateStr => {
                 const vacation = singleConsultant.vacations.find(v => dateStr >= v.start && dateStr <= v.end);
                 return { datum: dateStr, freie_slots: [], belegte_slots: [], vacationUntil: vacation ? vacation.end : undefined };
            });
        }
    }
    return results;
}

export function calculateWeeklyScheduleLogic(
    startDateStr: string,
    consultants: Consultant[],
    openingHours: OpeningHours
): WeeklySchedule {
    const schedule: WeeklySchedule = {};
    const startDate = new Date(startDateStr + 'T00:00:00Z');

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate.getTime());
        currentDate.setUTCDate(startDate.getUTCDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getUTCDay();
        schedule[dateStr] = {};
        const hours = openingHours.special[dateStr] || openingHours.general[dayOfWeek];

        for (const consultant of consultants) {
            schedule[dateStr][consultant.id] = [];
            const vacation = consultant.vacations.find(v => dateStr >= v.start && dateStr <= v.end);
            if (vacation) {
                schedule[dateStr][consultant.id].push({ type: 'vacation', startTime: '00:00', endTime: '23:59', title: 'Urlaub' });
                continue;
            }
            if (hours.closed) {
                schedule[dateStr][consultant.id].push({ type: 'special_closed', startTime: '00:00', endTime: '23:59', title: openingHours.special[dateStr]?.name || 'Geschlossen' });
                continue;
            }
            if (hours.lunchStart && hours.lunchEnd) {
                schedule[dateStr][consultant.id].push({ type: 'lunch', startTime: hours.lunchStart, endTime: hours.lunchEnd, title: 'Mittagspause' });
            }

            const fixedAppointments = consultant.fixedAppointments?.[dateStr] || [];
            fixedAppointments.forEach(appointment => {
                const appointmentStartInMs = new Date(`${dateStr}T${appointment.time}:00Z`).getTime();
                const appointmentEnd = new Date(appointmentStartInMs + appointment.duration * 60000);
                let displayTitle = 'Gebucht';
                if (appointment.bookingDetails?.name) {
                    const nameParts = appointment.bookingDetails.name.trim().split(' ');
                    displayTitle = nameParts[nameParts.length - 1]; // Use last name
                }
                schedule[dateStr][consultant.id].push({
                    id: appointment.id,
                    type: 'appointment',
                    startTime: appointment.time,
                    endTime: appointmentEnd.toISOString().substring(11, 16),
                    title: displayTitle,
                    details: appointment.bookingDetails
                });
            });

            const recurringBlocks = (consultant.recurringBlockedSlots || []).filter(rb => rb.dayOfWeek === dayOfWeek && !rb.exceptionDates.includes(dateStr));
            recurringBlocks.forEach(rb => {
                schedule[dateStr][consultant.id].push({ type: 'blocked', startTime: rb.startTime, endTime: rb.endTime, title: 'Blockiert' });
            });
        }
    }
    return schedule;
}
