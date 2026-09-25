
import React from 'react';
import { type AvailabilityResponse, type AppTheme, type FormData, type AvailabilitySlot, type Consultant } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { berndImage, deliahImage } from '../consultants';

interface AvailabilityDisplayProps {
  availability: AvailabilityResponse[];
  selectedSlot: AvailabilitySlot | null;
  onSelectSlot: (date: string, time: string, consultantId: string) => void;
  onConfirmBooking: () => void;
  onBack: () => void;
  isLoading: boolean;
  theme: AppTheme;
  formData: FormData;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step: 'slots' | 'confirm';
  consultantNotAvailable: string | null;
  onCheckOtherConsultants: () => void;
  consultants: Consultant[];
  onOpenLegal?: (tab: 'impressum' | 'datenschutz' | 'agb') => void;
}

export const AvailabilityDisplay: React.FC<AvailabilityDisplayProps> = ({
  availability,
  selectedSlot,
  onSelectSlot,
  onConfirmBooking,
  onBack,
  isLoading,
  theme,
  formData,
  onFormChange,
  step,
  consultantNotAvailable,
  onCheckOtherConsultants,
  consultants,
  onOpenLegal
}) => {
  const themeClasses = {
    default: { accent: 'bg-artreisen-orange', text: 'text-artreisen-blue', focusRing: 'focus:ring-artreisen-orange' },
    'south-africa': { accent: 'bg-artreisen-orange', text: 'text-safari-brown', focusRing: 'focus:ring-artreisen-orange' }
  };
  const currentTheme = themeClasses[theme];

  const hasSlots = availability.some(day => day.freie_slots.length > 0);
  const isSpecialRequest = selectedSlot?.time === 'Sondertermin';
  const consultant = consultants.find(c => c.id === selectedSlot?.consultantId);

  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr + 'T00:00:00Z').getUTCDay();
    return day === 0 || day === 6;
  };

  return (
    <div className="space-y-8">
      <div>
        <button onClick={onBack} className="text-sm font-semibold hover:underline">&larr; Zurück zur Auswahl</button>
      </div>

      {step === 'slots' && <h3 className="text-2xl font-bold font-montserrat text-center">Verfügbare Termine</h3>}

      {step === 'slots' && availability.map(day => {
        const weekend = isWeekend(day.datum);
        return (
          <div key={day.datum} className={weekend ? "bg-orange-50 p-4 rounded-xl border border-orange-200" : ""}>
            <h4 className="text-lg font-semibold mb-2 border-b pb-2 flex justify-between items-center">
              <span>{new Date(day.datum + 'T00:00:00Z').toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</span>
              {weekend && <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Wochenende</span>}
            </h4>
            
            {weekend && (
              <div className="mb-4 p-3 bg-white border-l-4 border-artreisen-orange rounded shadow-sm">
                <p className="text-sm font-bold text-artreisen-orange flex items-center gap-2">
                  <span>⚠️</span> Hinweis: Termine am Wochenende müssen von uns manuell rückbestätigt werden.
                </p>
              </div>
            )}

            {day.freie_slots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {day.freie_slots.map(slot => {
                  const slotConsultant = consultants.find(c => c.id === slot.consultantId);
                  return (
                    <button key={slot.time} onClick={() => onSelectSlot(day.datum, slot.time, slot.consultantId)}
                      className={`p-3 rounded-lg text-center font-semibold border-2 transition-all duration-200 flex flex-col justify-center items-center ${selectedSlot?.date === day.datum && selectedSlot?.time === slot.time ? `${currentTheme.accent} text-white border-transparent` : 'border-gray-300 bg-white hover:border-artreisen-orange hover:text-artreisen-orange'}`}>
                      <span className="text-lg">{slot.time}</span>
                      {formData.consultantId === 'any' && <span className="text-xs font-normal text-gray-500 mt-1">{slotConsultant?.name.split(' ')[0]}</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500">Für diesen Tag sind leider keine Termine verfügbar.</p>
            )}
          </div>
        );
      })}
      
      {step === 'slots' && !hasSlots && (
        <div className="text-center bg-amber-100 p-6 rounded-lg border border-amber-300">
            <p className="font-semibold text-lg text-amber-900">Keine freien Termine gefunden.</p>
            {consultantNotAvailable ? (
                <>
                    <p className="mt-2 text-amber-800">Der gewählte Berater ist an diesen Tagen leider ausgebucht.</p>
                    <button onClick={onCheckOtherConsultants}
                        className={`mt-4 text-md font-bold text-white px-6 py-3 rounded-full shadow-lg transition-transform transform hover:scale-105 ${currentTheme.accent} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto`}>
                        {isLoading ? <LoadingSpinner/> : `Verfügbarkeit bei anderen Beratern prüfen`}
                    </button>
                </>
            ) : (
                <p className="mt-2 text-amber-800">Bitte wähle andere Tage aus oder kontaktiere uns direkt.</p>
            )}
        </div>
      )}

      {step === 'confirm' && selectedSlot && (
        <div className="mt-8 pt-6 border-t-2 border-dashed">
            <h3 className="text-xl font-bold font-montserrat text-center mb-4">Fast geschafft! {isSpecialRequest ? 'Anfrage bestätigen:' : 'Termin bestätigen:'}</h3>
            <div className="bg-blue-50 text-center p-4 rounded-lg mb-6 border border-artreisen-blue/30">
                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 mb-2">
                  {consultant && !isSpecialRequest && (
                    <img 
                      src={consultant.imageUrl} 
                      alt={consultant.name} 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = consultant.id.includes('deliah') || consultant.name.toLowerCase().includes('deliah') ? deliahImage : berndImage;
                      }}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-lg">{isSpecialRequest ? 'Deine Terminanfrage bei:' : 'Dein gewählter Termin bei:'}</p>
                    {consultant && !isSpecialRequest && <p className="font-bold text-artreisen-blue">{consultant.name}</p>}
                  </div>
                </div>
                <p className="text-2xl font-bold text-artreisen-blue">
                    {new Date(selectedSlot.date + 'T00:00:00Z').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                    {!isSpecialRequest && ` um ${selectedSlot.time} Uhr`}
                </p>
                 {isSpecialRequest && <p className="text-sm mt-1"> (Termin außerhalb der Öffnungszeiten - wird manuell bestätigt)</p>}
                 {isWeekend(selectedSlot.date) && !isSpecialRequest && (
                   <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded text-orange-900 text-sm font-bold">
                     ⚠️ Dieser Wochenend-Termin muss von uns manuell rückbestätigt werden.
                   </div>
                 )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="name" className="block text-sm font-semibold mb-1">Dein Name</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={onFormChange} required className={`w-full p-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 ${currentTheme.focusRing}`} placeholder="Max Mustermann"/>
                 </div>
                 <div>
                    <label htmlFor="email" className="block text-sm font-semibold mb-1">Deine E-Mail</label>
                    <input type="email" id="email" name="email" value={formData.email} onChange={onFormChange} required className={`w-full p-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 ${currentTheme.focusRing}`} placeholder="max@example.com"/>
                 </div>
                 <div className="md:col-span-2">
                    <label htmlFor="phone" className="block text-sm font-semibold mb-1">Deine Telefonnummer</label>
                    <input type="tel" id="phone" name="phone" value={formData.phone} onChange={onFormChange} required className={`w-full p-3 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 ${currentTheme.focusRing}`} placeholder="+49 123 456789"/>
                 </div>
                 <div className="md:col-span-2">
                    <fieldset>
                        <legend className="block text-sm font-semibold mb-2">Wie soll die Beratung stattfinden?</legend>
                        <div className="flex items-center gap-x-6">
                            <div className="flex items-center">
                                <input id="in-office" name="consultationType" type="radio" value="in-office" checked={formData.consultationType === 'in-office'} onChange={onFormChange} className="h-4 w-4 border-gray-300 text-artreisen-orange focus:ring-artreisen-orange"/>
                                <label htmlFor="in-office" className="ml-3 block text-sm font-medium leading-6 text-gray-900">Bei uns im Büro</label>
                            </div>
                            <div className="flex items-center">
                                <input id="zoom" name="consultationType" type="radio" value="zoom" checked={formData.consultationType === 'zoom'} onChange={onFormChange} className="h-4 w-4 border-gray-300 text-artreisen-orange focus:ring-artreisen-orange"/>
                                <label htmlFor="zoom" className="ml-3 block text-sm font-medium leading-6 text-gray-900">Per Zoom-Meeting</label>
                            </div>
                        </div>
                    </fieldset>
                 </div>
            </div>

            {/* WhatsApp Opt-In */}
            <div className="mt-8 relative">
                <div className="absolute -top-3 left-4 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                    Unser Tipp!
                </div>
                <div className="p-4 rounded-xl bg-green-50 border-2 border-green-200 transition-colors hover:bg-green-100 flex items-start gap-3">
                    <input 
                        id="whatsappAccepted" 
                        name="whatsappAccepted" 
                        type="checkbox" 
                        checked={formData.whatsappAccepted} 
                        onChange={onFormChange} 
                        className="mt-1 h-6 w-6 rounded border-gray-300 text-green-600 focus:ring-green-600 cursor-pointer"
                    />
                    <label htmlFor="whatsappAccepted" className="block cursor-pointer flex-grow">
                        <span className="text-green-800 font-bold text-lg flex items-center gap-2">
                             WhatsApp Kontakt erlauben <span className="text-2xl">💬</span>
                        </span>
                        <span className="block text-green-700 text-sm mt-1">
                            Erlaube uns, dich unkompliziert per WhatsApp zu kontaktieren. So können wir Rückfragen schneller klären und dir Infos direkt aufs Handy senden.
                        </span>
                    </label>
                </div>
            </div>

            <div className="mt-6">
                <div className="flex items-center">
                    <input id="privacyAccepted" name="privacyAccepted" type="checkbox" checked={formData.privacyAccepted} onChange={onFormChange} className="h-4 w-4 rounded border-gray-300 text-artreisen-orange focus:ring-artreisen-orange"/>
                    <label htmlFor="privacyAccepted" className="ml-3 block text-sm text-gray-700">
                        Ich stimme zu, dass meine Daten zur Verarbeitung dieser Terminanfrage verwendet werden. Lies unsere{' '}
                        <button 
                            type="button" 
                            onClick={() => onOpenLegal ? onOpenLegal('datenschutz') : window.open('https://artreisen.de/datenschutz/', '_blank')}
                            className="font-semibold underline hover:text-artreisen-blue cursor-pointer inline text-left p-0 bg-transparent border-0"
                        >
                            Datenschutzerklärung
                        </button>.
                    </label>
                </div>
            </div>
            <div className="text-center mt-6">
                <button
                    onClick={onConfirmBooking}
                    disabled={isLoading || !formData.name || !formData.email || !formData.phone || !formData.privacyAccepted}
                    className={`w-full md:w-auto text-lg font-bold text-white px-10 py-4 rounded-full shadow-lg transition-transform transform hover:scale-105 ${currentTheme.accent} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto`}>
                    {isLoading ? <LoadingSpinner /> : (isSpecialRequest ? 'Anfrage jetzt senden' : 'Termin jetzt buchen')}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
