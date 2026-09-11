
import React from 'react';
import { type FormData, type AppTheme, type AppointmentType, type Consultant, type OpeningHours, type SpecialDay } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { berndImage, deliahImage } from '../consultants';
import { type LegalTab } from './LegalModal';

interface BookingFormProps {
  formData: FormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  theme: AppTheme;
  consultants: Consultant[];
  openingHours: OpeningHours;
  onOpenLegal?: (tab: LegalTab) => void;
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayString = today.toISOString().split('T')[0];

const appointmentOptions: { value: AppointmentType; icon: string; title: string; description: string; }[] = [
    { value: '15', icon: '📄', title: '15 Minuten', description: 'Für kurze Anliegen, z.B. Abholung von Reiseunterlagen.' },
    { value: '30', icon: '💬', title: '30 Minuten', description: 'Für eine erste Orientierung oder die Besprechung eines Angebots.' },
    { value: '60', icon: '🌍', title: '60 Minuten', description: 'Für eine umfassende und detaillierte Reiseplanung.' },
];

export const BookingForm: React.FC<BookingFormProps> = ({ formData, onChange, onSubmit, isLoading, theme, consultants, openingHours, onOpenLegal }) => {
  const themeClasses = {
    default: {
      accent: 'bg-artreisen-orange', focusRing: 'focus:ring-artreisen-orange', selectedBorder: 'border-artreisen-orange', hoverBorder: 'hover:border-artreisen-orange'
    },
    'south-africa': {
      accent: 'bg-artreisen-orange', focusRing: 'focus:ring-artreisen-orange', selectedBorder: 'border-artreisen-orange', hoverBorder: 'hover:border-artreisen-orange'
    }
  };
  const currentTheme = themeClasses[theme];

  const handleGenericChange = (name: string, value: any) => {
    const event = { target: { name, value, type: 'select' } } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(event);
  };

  const isSpecialRequest = !!formData.specialRequestDate;
  const isRegularRequest = !!formData.date1 || !!formData.date2;
  const buttonText = isSpecialRequest ? 'Anfrage stellen' : 'Verfügbarkeit prüfen';

  const upcomingSpecialDays = Object.entries(openingHours.special)
    .filter(([date]) => date >= todayString)
    .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
    
  // Group opening hours for a cleaner display
  const weekDays: {[key: number]: string} = {1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag", 5: "Freitag", 6: "Samstag", 0: "Sonntag"};
  const groupedByHours: { [key: string]: string[] } = {};
  const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Process in week order

  dayOrder.forEach(dayIndex => {
      const day = openingHours.general[dayIndex];
      const key = `${day.start}|${day.end}|${day.lunchStart}|${day.lunchEnd}|${day.closed}`;
      if (!groupedByHours[key]) {
          groupedByHours[key] = [];
      }
      groupedByHours[key].push(weekDays[dayIndex]);
  });
  
  const formatDayRange = (dayNames: string[]): string => {
    if (dayNames.length === 5 && dayNames[0] === 'Montag' && dayNames[4] === 'Freitag') {
      return 'Montag - Freitag';
    }
    if (dayNames.length === 1) {
      return dayNames[0];
    }
    if (dayNames.length > 1) {
      return dayNames.slice(0, -1).join(', ') + ' & ' + dayNames.slice(-1);
    }
    return '';
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      
      {/* Step 1 Card */}
      <div className="bg-white/50 p-4 sm:p-6 rounded-xl border shadow-sm">
        <label className="block text-sm font-semibold mb-4 text-gray-800">
          Schritt 1: Wer begleitet dich zu deiner Traumreise?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 justify-center">
            {consultants.map((consultant) => (
              <button
                type="button"
                key={consultant.id}
                onClick={() => handleGenericChange('consultantId', consultant.id)}
                className={`p-4 rounded-lg border-2 text-center transition-all duration-200 flex flex-col items-center justify-center h-full cursor-pointer ${formData.consultantId === consultant.id ? `${currentTheme.selectedBorder} bg-blue-50/50 ring-2 ring-artreisen-orange/50` : `border-gray-300 bg-white ${currentTheme.hoverBorder}`}`}>
                  <img 
                    src={consultant.imageUrl} 
                    alt={consultant.name} 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = consultant.id.includes('deliah') || consultant.name.toLowerCase().includes('deliah') ? deliahImage : berndImage;
                    }}
                    className="w-16 h-16 rounded-full mb-2 object-cover" 
                  />
                  <div className="font-bold font-montserrat">{consultant.name}</div>
                  <p className="text-sm text-gray-600 mt-1">{consultant.specialty}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleGenericChange('consultantId', 'any')}
              className={`p-4 rounded-lg border-2 text-center transition-all duration-200 flex flex-col items-center justify-center h-full cursor-pointer ${formData.consultantId === 'any' ? `${currentTheme.selectedBorder} bg-blue-50/50 ring-2 ring-artreisen-orange/50` : `border-gray-300 bg-white ${currentTheme.hoverBorder}`}`}>
                <div className="text-3xl mb-2">🤝</div>
                <div className="font-bold font-montserrat">Beliebiger Berater</div>
                <p className="text-sm text-gray-600 mt-1">Zeigt alle verfügbaren Termine</p>
            </button>
        </div>
      </div>

      {/* Step 2 Card */}
      <div className="bg-white/50 p-4 sm:p-6 rounded-xl border shadow-sm">
          <label className="block text-sm font-semibold mb-4 text-gray-800">
            Schritt 2: Wieviel Zeit dürfen wir uns für deine Reiseträume nehmen?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {appointmentOptions.map((option) => (
                <button type="button" key={option.value} onClick={() => handleGenericChange('appointmentType', option.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all duration-200 flex flex-col h-full cursor-pointer ${formData.appointmentType === option.value ? `${currentTheme.selectedBorder} bg-blue-50/50 ring-2 ring-artreisen-orange/50` : `border-gray-300 bg-white ${currentTheme.hoverBorder}`}`}>
                    <div className="text-2xl mb-2">{option.icon}</div>
                    <div className="font-bold font-montserrat">{option.title}</div>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </button>
            ))}
          </div>
      </div>
      
      {/* Step 3 Card */}
      <div className="bg-white/50 p-4 sm:p-6 rounded-xl border shadow-sm space-y-4">
        <label className="block text-sm font-semibold mb-0 text-gray-800">
          Schritt 3: Wann träumst du am liebsten mit uns?
        </label>
        <div className="bg-blue-50/70 p-4 rounded-lg border border-artreisen-blue/20 text-sm">
            <p className="font-semibold text-base flex items-center justify-center gap-2 mb-2">
                <span className="text-xl">⏰</span> Unsere regulären Öffnungszeiten
            </p>
            {Object.entries(groupedByHours).map(([key, dayNames]) => {
              const [start, end, lunchStart, lunchEnd, closedStr] = key.split('|');
              const closed = closedStr === 'true';
              
              if (closed) {
                  return null; // Don't display closed days
              }

              const dayRange = formatDayRange(dayNames);
              const hasLunch = lunchStart && lunchEnd;
              const isWeekendBlock = dayNames.includes('Samstag') || dayNames.includes('Sonntag');

              return (
                  <div key={key} className={`text-center py-1 ${isWeekendBlock ? 'text-orange-700 font-medium' : 'text-gray-700'}`}>
                      <span className="block font-semibold">{dayRange}</span>
                      {hasLunch ? (
                          <div className="text-sm">
                              <span>Vormittag: {start} - {lunchStart} Uhr</span>
                              <span className="mx-2 text-gray-400">|</span>
                              <span>Nachmittag: {lunchEnd} - {end} Uhr</span>
                          </div>
                      ) : (
                          <p className="text-sm">{start} - {end} Uhr</p>
                      )}
                      {isWeekendBlock && <p className="text-[10px] uppercase tracking-wider font-bold mt-0.5">* Rückbestätigung erforderlich</p>}
                  </div>
              );
            })}
        </div>
        
        {upcomingSpecialDays.length > 0 && (
          <div className="bg-amber-50 p-4 rounded-lg border border-artreisen-orange/30 text-sm">
            <p className="font-semibold text-base flex items-center justify-center gap-2 mb-2 text-amber-900">
              <span className="text-xl">⭐</span> Besondere Öffnungszeiten
            </p>
            {upcomingSpecialDays.map(([date, day]: [string, SpecialDay]) => (
              <div key={date} className="text-center text-amber-800">
                <p>
                  <span className="font-bold">{day.name}</span> am {new Date(date + 'T00:00:00Z').toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'})}:
                  {day.closed ? <span className="font-semibold"> geschlossen</span> : ` ${day.start} - ${day.end} Uhr`}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div>
            <label htmlFor="date1" className="block text-sm font-semibold mb-2">Wunschtag 1 <span className="text-red-500">*</span></label>
            <input type="date" id="date1" name="date1" value={formData.date1} onChange={onChange} required={!isSpecialRequest} min={todayString} disabled={isSpecialRequest}
              className={`w-full p-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 ${currentTheme.focusRing} transition disabled:bg-gray-100 disabled:cursor-not-allowed`} />
          </div>
          <div>
            <label htmlFor="date2" className="block text-sm font-semibold mb-2">Wunschtag 2 (optional)</label>
            <input type="date" id="date2" name="date2" value={formData.date2} onChange={onChange} min={todayString} disabled={isSpecialRequest}
              className={`w-full p-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 ${currentTheme.focusRing} transition disabled:bg-gray-100 disabled:cursor-not-allowed`} />
          </div>
        </div>
         <div className="text-center text-sm font-semibold text-gray-500 pt-2">ODER</div>
         <div>
            <label htmlFor="specialRequestDate" className="block text-sm font-semibold mb-2">Anfrage für Termin außerhalb der Öffnungszeiten</label>
            <input type="date" id="specialRequestDate" name="specialRequestDate" value={formData.specialRequestDate} onChange={onChange} min={todayString} disabled={isRegularRequest}
                className={`w-full p-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 ${currentTheme.focusRing} transition disabled:bg-gray-100 disabled:cursor-not-allowed`} />
        </div>
      </div>
      
       {/* Step 4 Card */}
      <div className="bg-white/50 p-4 sm:p-6 rounded-xl border shadow-sm">
        <label htmlFor="comment" className="block text-sm font-semibold mb-2 text-gray-800">Schritt 4: Erzähl uns von deinem Reisewunsch (optional)</label>
        <textarea id="comment" name="comment" value={formData.comment} onChange={onChange} rows={3} placeholder="Je mehr wir wissen, desto besser können wir dich verzaubern! z.B. Flitterwochen auf den Malediven, Safari in Tansania, beste Reisezeit..."
          className={`w-full p-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 ${currentTheme.focusRing} transition`}></textarea>
      </div>

      {/* Rechtliche Hinweise & Datenschutz */}
      <div className="text-center text-[11px] text-gray-500 max-w-lg mx-auto pt-2 space-y-1">
        <p>
          Ihre Angaben werden vertraulich behandelt und verschlüsselt übertragen.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('impressum')}
            className="text-gray-500 hover:text-artreisen-blue underline cursor-pointer"
          >
            Impressum
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('datenschutz')}
            className="text-gray-500 hover:text-artreisen-blue underline cursor-pointer flex items-center gap-1 font-semibold"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Datenschutz (DSGVO)
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onOpenLegal && onOpenLegal('agb')}
            className="text-gray-500 hover:text-artreisen-blue underline cursor-pointer"
          >
            AGB
          </button>
        </div>
      </div>

      <div className="text-center pt-2">
        <button type="submit" disabled={isLoading}
          className={`w-full md:w-auto text-lg font-bold text-white px-10 py-4 rounded-full shadow-lg transition-transform transform hover:scale-105 ${currentTheme.accent} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto`}>
          {isLoading ? <LoadingSpinner /> : buttonText}
        </button>
      </div>
    </form>
  );
};
