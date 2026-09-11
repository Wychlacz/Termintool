
import React, { useState, useEffect, useMemo } from 'react';
import { type Consultant, type OpeningHours, type WeeklySchedule, type ScheduleEntry } from '../types';
import { fetchWeeklySchedule, deleteAppointment } from '../services/bookingService';
import { LoadingSpinner } from './LoadingSpinner';

interface WeeklyCalendarProps {
  consultants: Consultant[];
  openingHours: OpeningHours;
  onClose: () => void;
}

const getMondayStr = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date.toISOString().split('T')[0];
};

const addDaysStr = (iso: string, days: number) => {
    const d = new Date(iso + 'T12:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const timeToMinutes = (time: string): number => {
    if (!time || !time.includes(':')) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const START_H = 8;
const END_H = 19;
const TOTAL_M = (END_H - START_H) * 60;

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ consultants, openingHours, onClose }) => {
    const [monday, setMonday] = useState<string>(getMondayStr(new Date()));
    const [schedule, setSchedule] = useState<WeeklySchedule | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selected, setSelected] = useState<{entry: ScheduleEntry; cName: string} | null>(null);

    const loadData = async (date: string) => {
        setIsLoading(true);
        try {
            const data = await fetchWeeklySchedule(date);
            setSchedule(data);
        } catch (e) {
            console.error("Ladefehler:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(monday); }, [monday]);

    const handleNext = () => setMonday(addDaysStr(monday, 7));
    const handlePrev = () => setMonday(addDaysStr(monday, -7));
    const handleToday = () => setMonday(getMondayStr(new Date()));

    const handleDelete = async () => {
        if (!selected?.entry.id) return;
        const name = selected.entry.details?.name || selected.entry.title || 'Kunde';
        if (!window.confirm(`Soll der Termin für "${name}" wirklich unwiderruflich gelöscht werden?`)) return;

        setIsDeleting(true);
        try {
            await deleteAppointment(selected.entry.id);
            alert("Termin erfolgreich gelöscht.");
            setSelected(null);
            await loadData(monday);
        } catch (err) {
            alert("Fehler beim Löschen. Bitte erneut versuchen.");
        } finally {
            setIsDeleting(false);
        }
    };

    const days = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(monday + 'T12:00:00');
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [monday]);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[250] flex flex-col sm:p-4">
            
            {/* TERMIN-DETAIL-AKTE (MODAL) */}
            {selected && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="bg-artreisen-blue p-6 text-white relative">
                            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-white/50 hover:text-white">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Termin-Akte</p>
                            <h3 className="text-2xl font-black mt-1 leading-tight">{selected.entry.details?.name || selected.entry.title}</h3>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Zeitpunkt</span>
                                    <span className="font-bold text-artreisen-blue">{selected.entry.startTime} Uhr</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] font-black uppercase text-gray-400">Berater</span>
                                    <span className="font-bold">{selected.cName.split(' ')[0]}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <a href={`mailto:${selected.entry.details?.email}`} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100 transition-colors">
                                    <span className="text-xl">📧</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-gray-400">E-Mail senden</p>
                                        <p className="font-bold text-xs truncate">{selected.entry.details?.email || 'n.v.'}</p>
                                    </div>
                                </a>
                                <a href={`tel:${selected.entry.details?.phone}`} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 active:bg-gray-100 transition-colors">
                                    <span className="text-xl">📞</span>
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black uppercase text-gray-400">Anrufen</p>
                                        <p className="font-bold text-xs">{selected.entry.details?.phone || 'n.v.'}</p>
                                    </div>
                                </a>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                                    <p className="text-[9px] font-black uppercase text-blue-400">Ort</p>
                                    <p className="font-bold text-[11px]">{selected.entry.details?.consultationType === 'zoom' ? '💻 Video' : '🏢 Büro'}</p>
                                </div>
                                <div className={`flex-1 p-3 rounded-2xl border text-center ${selected.entry.details?.whatsappAccepted ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                    <p className="text-[9px] font-black uppercase opacity-60">WhatsApp</p>
                                    <p className="font-bold text-[11px]">{selected.entry.details?.whatsappAccepted ? '✅ Erlaubt' : '❌ Nein'}</p>
                                </div>
                            </div>

                            {selected.entry.details?.comment && (
                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <p className="text-[10px] font-black uppercase text-amber-500 mb-1">Nachricht</p>
                                    <p className="text-xs italic leading-relaxed text-amber-900">"{selected.entry.details.comment}"</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t flex flex-col gap-2">
                            <button onClick={handleDelete} disabled={isDeleting} className="w-full h-14 bg-red-600 text-white font-black rounded-2xl uppercase shadow-lg shadow-red-100 active:scale-95 transition-all">
                                {isDeleting ? 'Wird gelöscht...' : 'Termin stornieren'}
                            </button>
                            <button onClick={() => setSelected(null)} className="w-full h-14 bg-white text-gray-400 font-black rounded-2xl uppercase border active:bg-gray-50 transition-all">Schließen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CALENDAR APP VIEW */}
            <div className="bg-white w-full h-full flex flex-col sm:rounded-3xl overflow-hidden shadow-2xl">
                
                {/* Top Navbar */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] text-artreisen-blue">Live-Kalender</h2>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">Übersicht</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex bg-gray-100 p-1.5 rounded-2xl">
                            <button onClick={handlePrev} className="p-2.5 hover:bg-white rounded-xl transition-all shadow-sm">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
                            </button>
                            <button onClick={handleToday} className="px-6 text-xs font-black uppercase text-gray-500 hover:text-artreisen-blue">Heute</button>
                            <button onClick={handleNext} className="p-2.5 hover:bg-white rounded-xl transition-all shadow-sm">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                            </button>
                        </div>
                        <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation Bar (Only visible on small screens) */}
                <div className="sm:hidden flex justify-between items-center px-4 py-2 bg-gray-50 border-b">
                    <button onClick={handlePrev} className="p-2 font-black text-artreisen-blue">← Vorherige</button>
                    <button onClick={handleToday} className="text-[10px] font-black uppercase">Woche vom {new Date(monday).toLocaleDateString('de-DE')}</button>
                    <button onClick={handleNext} className="p-2 font-black text-artreisen-blue">Nächste →</button>
                </div>

                {/* The Scrolling Grid */}
                <div className="flex-grow flex flex-col overflow-hidden bg-gray-50/30">
                    {/* Header: Days */}
                    <div className="flex-shrink-0 flex bg-white border-b overflow-x-auto no-scrollbar">
                        <div className="w-12 sm:w-20 flex-shrink-0"></div>
                        <div className="flex-grow grid grid-cols-7 min-w-[700px] sm:min-w-0">
                            {days.map(d => (
                                <div key={d.toISOString()} className="py-4 border-l text-center">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{new Intl.DateTimeFormat('de-DE', {weekday:'short'}).format(d)}</p>
                                    <p className={`text-lg font-black mt-1 ${d.toDateString() === new Date().toDateString() ? 'text-artreisen-orange' : 'text-artreisen-blue'}`}>
                                        {d.getDate()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Body: Hours & Slots */}
                    <div className="flex-grow overflow-x-auto overflow-y-auto relative no-scrollbar">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm">
                                <LoadingSpinner className="text-artreisen-blue h-12 w-12"/>
                            </div>
                        )}
                        <div className="flex min-w-[700px] sm:min-w-0 h-[800px]">
                            {/* Time Axis */}
                            <div className="w-12 sm:w-20 flex-shrink-0 border-r bg-white">
                                {Array.from({length: END_H-START_H}).map((_, i) => (
                                    <div key={i} className="h-[72.7px] flex items-center justify-center border-b border-gray-50">
                                        <span className="text-[10px] font-black text-gray-300">{START_H+i}:00</span>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Day Columns */}
                            <div className="flex-grow grid grid-cols-7 relative">
                                {days.map(day => {
                                    const dStr = day.toISOString().split('T')[0];
                                    return (
                                        <div key={dStr} className="border-l border-gray-100 relative bg-white">
                                            <div className="absolute inset-0 grid" style={{gridTemplateColumns: `repeat(${consultants.length}, 1fr)`}}>
                                                {consultants.map(c => (
                                                    <div key={c.id} className="relative h-full border-r border-gray-100/30 last:border-0">
                                                        {(schedule?.[dStr]?.[c.id] || []).map((e, idx) => {
                                                            const startM = timeToMinutes(e.startTime);
                                                            const endM = timeToMinutes(e.endTime);
                                                            const top = ((startM - START_H * 60) / TOTAL_M) * 100;
                                                            const h = ((endM - startM) / TOTAL_M) * 100;
                                                            if (top < 0 || h <= 0) return null;

                                                            const style: any = {
                                                                appointment: 'bg-red-500 border-red-600 text-white cursor-pointer z-10 shadow-lg active:scale-[0.98] ring-1 ring-white/20',
                                                                blocked: 'bg-purple-100 border-purple-200 text-purple-400 opacity-60',
                                                                vacation: 'bg-gray-100 text-gray-400 opacity-40',
                                                                lunch: 'bg-amber-50/40 border-amber-100/20 text-amber-200',
                                                            };

                                                            return (
                                                                <div key={idx} 
                                                                    onClick={e.type === 'appointment' ? () => setSelected({entry: e, cName: c.name}) : undefined}
                                                                    style={{top: `${top}%`, height: `${h}%`}} 
                                                                    className={`absolute left-[2px] right-[2px] rounded-md border p-1 text-[8px] sm:text-[9px] font-black uppercase overflow-hidden transition-all flex items-center justify-center text-center leading-tight ${style[e.type] || ''}`}
                                                                >
                                                                    {e.title}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
