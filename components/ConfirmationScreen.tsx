import React from 'react';
import { type AppTheme, type FormData, type AvailabilitySlot, type Consultant, type BookingConfirmation } from '../types';
import { SuccessIcon } from './SuccessIcon';
import { berndImage, deliahImage } from '../consultants';

interface ConfirmationScreenProps {
  onReset: () => void;
  theme: AppTheme;
  formData: FormData;
  selectedSlot: AvailabilitySlot | null;
  consultants: Consultant[];
  confirmation: BookingConfirmation | null;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ onReset, theme, formData, selectedSlot, consultants, confirmation }) => {
    const themeClasses = {
        default: { accent: 'bg-artreisen-orange' },
        'south-africa': { accent: 'bg-artreisen-orange' },
    };
    const currentTheme = themeClasses[theme];
    const isSpecialRequest = selectedSlot?.time === 'Sondertermin';
    
    const consultant = selectedSlot ? consultants.find(c => c.id === selectedSlot.consultantId) : null;
    
    const appointmentDuration = {
        '15': '15 Minuten',
        '30': '30 Minuten',
        '60': '60 Minuten',
    }[formData.appointmentType];

    const title = confirmation?.title || (isSpecialRequest ? 'Anfrage erhalten!' : 'Termin reserviert!');
    
    const message = confirmation?.message || (isSpecialRequest 
        ? `Danke für deine Anfrage, ${formData.name}! Wir prüfen die Verfügbarkeit und melden uns bei dir.`
        : `Vielen Dank für deine Buchung, ${formData.name}!`);

    return (
        <div className="text-center py-8 px-4">
            <div className="mb-6">
              <SuccessIcon />
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold font-montserrat mb-2">{title}</h2>
            
            <div className="font-montserrat text-lg font-bold text-artreisen-blue mb-8">
                {message.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                ))}
            </div>
            
            {/* Details Card for confirmed appointments */}
            {selectedSlot && !isSpecialRequest && consultant && (
                <div className="bg-white/80 p-6 rounded-2xl shadow-lg border border-artreisen-blue/20 max-w-md mx-auto mb-8 text-left">
                    <div className="flex items-center gap-4 pb-4 border-b border-artreisen-blue/20">
                        <img 
                          src={consultant.imageUrl} 
                          alt={consultant.name} 
                          referrerPolicy="no-referrer" 
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = consultant.id.includes('deliah') || consultant.name.toLowerCase().includes('deliah') ? deliahImage : berndImage;
                          }}
                          className="w-20 h-20 rounded-full object-cover shadow-md" 
                        />
                        <div>
                            <p className="font-bold font-montserrat text-xl text-artreisen-blue">{consultant.name}</p>
                            <p className="text-gray-500 text-sm">{consultant.specialty}</p>
                        </div>
                    </div>
                    <div className="space-y-4 pt-5">
                        <div className="flex items-start gap-4">
                           <span className="text-2xl mt-1 text-artreisen-blue">🗓️</span>
                           <div>
                                <p className="font-semibold text-gray-600">Wann</p>
                                <p className="font-bold text-lg text-gray-800">
                                    {new Date(selectedSlot.date + 'T00:00:00Z').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                                    <br/>um {selectedSlot.time} Uhr
                                </p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-2xl text-artreisen-blue">⏱️</span>
                            <div>
                                <p className="font-semibold text-gray-600">Dauer</p>
                                <p className="font-bold text-lg text-gray-800">{appointmentDuration}</p>
                            </div>
                        </div>
                         <div className="flex items-center gap-4">
                            <span className="text-2xl text-artreisen-blue">📍</span>
                            <div>
                                <p className="font-semibold text-gray-600">Wo</p>
                                <p className="font-bold text-lg text-gray-800">{formData.consultationType === 'zoom' ? 'Per Zoom-Meeting' : 'Bei uns im Büro'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Simple card for special requests */}
             {isSpecialRequest && selectedSlot && (
                <div className="bg-blue-50 text-center p-6 rounded-xl mb-10 border-2 border-dashed border-artreisen-blue/30 max-w-md mx-auto">
                    <p className="font-bold text-lg">Deine Anfrage für:</p>
                    <p className="font-bold text-xl text-artreisen-blue mt-1">
                        {new Date(selectedSlot.date + 'T00:00:00Z').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                    </p>
                    <p className="text-sm mt-2">(Sondertermin außerhalb der Öffnungszeiten)</p>
                </div>
            )}

            <button
                onClick={onReset}
                className={`w-full md:w-auto text-lg font-bold text-white px-10 py-4 rounded-full shadow-lg transition-transform transform hover:scale-105 ${currentTheme.accent}`}
            >
                Neue Terminanfrage
            </button>
        </div>
    );
};