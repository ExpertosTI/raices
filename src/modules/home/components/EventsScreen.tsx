import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Gift, Sparkles, PartyPopper, Clock, ArrowRight, ChevronLeft, ChevronRight, Grid, List } from 'lucide-react';
import { FloatingDock } from '../../../components/FloatingDock';
import './EventsScreen.css';

interface AppEvent {
    id: string;
    title: string;
    date: string; // ISO string
    type: 'BIRTHDAY' | 'REUNION' | 'ANNIVERSARY' | 'OTHER';
    memberId?: string;
    photo?: string;
    age?: number;
    description?: string;
    location?: string;
    isAutomatic?: boolean;
    // Computed
    daysUntil?: number;
    name?: string;
}

// Toast Component
const Toast = ({ message, show, onClose }: { message: string, show: boolean, onClose: () => void }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <div className={`toast-notification ${show ? 'show' : ''}`}>
            <Sparkles size={18} color="#D4AF37" />
            <span>{message}</span>
        </div>
    );
};

// Countdown to next birthday/event
const NextEventCountdown = ({ event }: { event: AppEvent | null }) => {
    if (!event) return null;

    const targetDate = new Date(event.date);
    const now = new Date();
    // For manual events, date is absolute. For birthdays, it's computed next date.
    // If it's a past manual event, this might be weird, but API filters future events.

    const diff = targetDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Prevent negative display
    if (diff < 0) return null;

    return (
        <div className="countdown-card glass-panel">
            <div className="countdown-icon">
                {event.type === 'BIRTHDAY' ? <PartyPopper size={24} /> : <Calendar size={24} />}
            </div>
            <div className="countdown-info">
                <span className="countdown-label">Próximo Evento</span>
                <span className="countdown-name">{event.title}</span>
            </div>
            <div className="countdown-timer">
                <div className="time-block">
                    <span className="number">{days}</span>
                    <span className="label">días</span>
                </div>
            </div>
        </div>
    );
};

// Calendar Helper
const getCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Previous month filler
    const days = [];
    for (let i = 0; i < startingDay; i++) {
        days.push({ day: null, fullDate: null });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            day: i,
            fullDate: new Date(year, month, i)
        });
    }

    return days;
};

export const EventsScreen: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar');
    const [activeFilter, setActiveFilter] = useState('Todos');
    const [toastMsg, setToastMsg] = useState('');
    const [showToast, setShowToast] = useState(false);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    useEffect(() => {
        fetch('/api/events')
            .then(res => res.json())
            .then(data => {
                // Backend returns sorted list with manual + birthdays
                // Need to compute daysUntil for sorting locally if needed
                const processed = data.map((e: any) => {
                    const eventDate = new Date(e.date);
                    const now = new Date();
                    const diff = eventDate.getTime() - now.getTime();
                    const daysUntil = Math.ceil(diff / (1000 * 60 * 60 * 24));

                    return {
                        ...e,
                        daysUntil,
                        // Fix name for birthdays if title is "Cumpleaños de X"
                        name: e.type === 'BIRTHDAY' ? e.title.replace('Cumpleaños de ', '') : e.title
                    };
                });
                setEvents(Array.isArray(processed) ? processed : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSendWish = (name: string) => {
        setToastMsg(`🎉 Mensaje enviado a ${name}`);
        setShowToast(true);
    };

    // Calendar Navigation
    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const calendarDays = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
    const monthName = currentDate.toLocaleDateString('es', { month: 'long', year: 'numeric' });

    // Filter events for selected date (Calendar View) or filter (List View)
    const getEventsForDate = (date: Date) => {
        return events.filter(e => {
            const eDate = new Date(e.date);
            return eDate.getDate() === date.getDate() &&
                eDate.getMonth() === date.getMonth() &&
                eDate.getFullYear() === date.getFullYear();
        });
    };

    const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

    if (loading) {
        return (
            <div className="events-screen loading">
                <div className="loading-spinner">🎂</div>
                <p>Cargando Eventos...</p>
            </div>
        );
    }

    return (
        <div className="events-screen">
            <Toast
                message={toastMsg}
                show={showToast}
                onClose={() => setShowToast(false)}
            />

            <header className="events-header-premium">
                <div className="header-bg-anim"></div>
                <button className="back-btn-glass" onClick={() => navigate('/app')}>
                    <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <div className="header-content">
                    <h1>Eventos 2025</h1>
                    <p className="subtitle-glow">Reuniones y Celebraciones</p>
                    <NextEventCountdown event={events[0] || null} />
                </div>
            </header>

            <main className="events-content">

                {/* View Switcher */}
                <div className="view-switcher-container">
                    <div className="view-switcher glass-panel">
                        <button
                            className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                            onClick={() => setViewMode('calendar')}
                        >
                            <Grid size={18} /> Calendario
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List size={18} /> Lista
                        </button>
                    </div>
                </div>

                {viewMode === 'calendar' && (
                    <div className="calendar-section fade-in">
                        {/* Calendar Controls */}
                        <div className="calendar-header">
                            <button onClick={prevMonth} className="cal-nav-btn"><ChevronLeft /></button>
                            <h2 className="month-title">{monthName}</h2>
                            <button onClick={nextMonth} className="cal-nav-btn"><ChevronRight /></button>
                        </div>

                        {/* Calendar Grid */}
                        <div className="calendar-grid glass-panel">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                                <div key={day} className="cal-header-cell">{day}</div>
                            ))}

                            {calendarDays.map((d, i) => {
                                if (!d.day || !d.fullDate) return <div key={i} className="cal-cell empty" />;

                                const dayEvents = getEventsForDate(d.fullDate);
                                const isToday = new Date().toDateString() === d.fullDate.toDateString();
                                const isSelected = selectedDate?.toDateString() === d.fullDate.toDateString();
                                const hasBirthday = dayEvents.some(e => e.type === 'BIRTHDAY');
                                const hasManual = dayEvents.some(e => e.type !== 'BIRTHDAY');

                                return (
                                    <div
                                        key={i}
                                        className={`cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedDate(d.fullDate)}
                                    >
                                        <span className="day-number">{d.day}</span>
                                        <div className="day-dots">
                                            {hasBirthday && <span className="dot birthday" />}
                                            {hasManual && <span className="dot manual" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Selected Date Events */}
                        <div className="selected-date-events">
                            <h3>Eventos del {selectedDate?.toLocaleDateString()}</h3>
                            {selectedEvents.length === 0 ? (
                                <p className="no-events-text">No hay eventos para este día.</p>
                            ) : (
                                <div className="events-grid-premium">
                                    {selectedEvents.map((event) => (
                                        <EventCard key={event.id} event={event} onAction={handleSendWish} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="list-section fade-in">
                        <div className="tabs-container">
                            {['Todos', 'Esta semana', 'Este mes'].map(tab => (
                                <button
                                    key={tab}
                                    className={`tab-btn ${activeFilter === tab ? 'active' : ''}`}
                                    onClick={() => setActiveFilter(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="events-grid-premium">
                            {events
                                .filter(e => {
                                    if (activeFilter === 'Esta semana') return (e.daysUntil || 999) <= 7;
                                    if (activeFilter === 'Este mes') return (e.daysUntil || 999) <= 30;
                                    return true;
                                })
                                .map((event) => (
                                    <EventCard key={event.id} event={event} onAction={handleSendWish} />
                                ))}
                        </div>
                    </div>
                )}

            </main>

            <FloatingDock />
        </div>
    );
};

// Extracted Event Card for reuse
const EventCard = ({ event, onAction }: { event: AppEvent, onAction: (name: string) => void }) => {
    const getMonth = (d: string) => new Date(d).toLocaleDateString('es', { month: 'short' }).toUpperCase();
    const getDay = (d: string) => new Date(d).getDate();

    return (
        <div className={`event-card-premium glass-panel ${event.daysUntil === 0 ? 'today' : ''}`}>
            <div className="card-shine"></div>
            <div className="event-date-badge">
                <span className="day">{getDay(event.date)}</span>
                <span className="month">{getMonth(event.date)}</span>
            </div>

            <div className="event-avatar-container">
                {event.photo ? (
                    <img src={event.photo} alt={event.title} className="event-avatar-img" />
                ) : (
                    <div className="event-avatar-placeholder">
                        {event.type === 'BIRTHDAY' ? '🎂' : '📅'}
                    </div>
                )}
            </div>

            <div className="event-info">
                <h3>{event.title}</h3>
                {event.description && <p className="event-desc">{event.description}</p>}

                <div className={`status-badge-pulse ${event.daysUntil === 0 ? 'today' : (event.daysUntil || 99) <= 7 ? 'soon' : ''}`}>
                    {event.daysUntil === 0 ? (
                        <><PartyPopper size={14} className="icon-pulse" /> ¡Hoy!</>
                    ) : (event.daysUntil || 99) <= 7 ? (
                        <><Clock size={14} /> En {event.daysUntil} días</>
                    ) : (
                        `En ${event.daysUntil} días`
                    )}
                </div>
            </div>

            {event.type === 'BIRTHDAY' && (
                <button
                    className="action-btn-glow"
                    onClick={() => onAction(event.name || '')}
                >
                    <span>Felicitar</span>
                    <Gift size={16} />
                </button>
            )}
        </div>
    );
};
