import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Gift, Sparkles, PartyPopper, Clock, ArrowRight } from 'lucide-react';
import { FloatingDock } from '../../../components/FloatingDock';
import './EventsScreen.css';

interface BirthdayEvent {
    id: string;
    title: string;
    date: string; // ISO string from backend
    type: 'BIRTHDAY';
    memberId: string;
    photo?: string;
    age: number;
    daysUntil?: number; // Calculated in frontend or backend? Backend returns age and date. We might need daysUntil for sorting/display
    name?: string; // Backend sends title "Cumpleaños de X", we might want raw name? Let's check backend again.
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

// Countdown to next birthday
const NextBirthdayCountdown = ({ event }: { event: BirthdayEvent | null }) => {
    if (!event) return null;

    const targetDate = new Date(event.date);
    const now = new Date();
    targetDate.setFullYear(now.getFullYear());
    if (targetDate < now) targetDate.setFullYear(now.getFullYear() + 1);

    const diff = targetDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);

    return (
        <div className="countdown-card glass-panel">
            <div className="countdown-icon">
                <PartyPopper size={24} />
            </div>
            <div className="countdown-info">
                <span className="countdown-label">Próximo cumpleaños</span>
                <span className="countdown-name">{event.name}</span>
            </div>
            <div className="countdown-timer">
                <div className="time-block">
                    <span className="number">{days}</span>
                    <span className="label">días</span>
                </div>
                <div className="separator">:</div>
                <div className="time-block">
                    <span className="number">{hours}</span>
                    <span className="label">horas</span>
                </div>
            </div>
        </div>
    );
};

export const EventsScreen: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<BirthdayEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('Todos');
    const [toastMsg, setToastMsg] = useState('');
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        fetch('/api/events')
            .then(res => res.json())
            .then(data => {
                setEvents(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getMonth = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('es', { month: 'short' }).toUpperCase();
    };

    const getDay = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).getDate();
    };

    // Filter logic needs to adapt to new data structure if needed, or backend handles it.
    // Backend returns sorted list. Logic here seems to filter by 'All', 'This week', 'This month'
    // We need to calculate daysUntil if backend doesn't provide it directly in the new interface.
    // Looking at backend code: it returns { id, title, date, type, memberId, photo, age }.
    // It does NOT return 'daysUntil' strictly as a number in the root, but we can calculate it easily.

    const calculateDaysUntil = (dateStr: string) => {
        const target = new Date(dateStr);
        const now = new Date();
        target.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        // Handle year rollover if needed, but backend sends next birthday date already.
        const diff = target.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const eventsWithDays = events.map(e => ({
        ...e,
        daysUntil: calculateDaysUntil(e.date),
        name: e.title.replace('Cumpleaños de ', '') // Extract name from title
    }));

    const filteredEvents = activeFilter === 'Todos'
        ? eventsWithDays
        : activeFilter === 'Esta semana'
            ? eventsWithDays.filter(e => e.daysUntil <= 7)
            : eventsWithDays.filter(e => e.daysUntil <= 30);

    const handleSendWish = (name: string) => {
        setToastMsg(`🎉 Mensaje enviado a ${name}`);
        setShowToast(true);
    };

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
                    ←
                </button>
                <div className="header-content">
                    <h1>Cumpleaños</h1>
                    <p className="subtitle-glow">Celebra con la familia</p>
                    <NextBirthdayCountdown event={events[0] || null} />
                </div>
            </header>

            <main className="events-content">

                {/* Intro Card */}
                <section className="intro-card glass-panel">
                    <div className="intro-icon"><Gift size={24} color="#D4AF37" /></div>
                    <div className="intro-text">
                        <h3>No olvides felicitar</h3>
                        <p>Envía un mensaje especial a los que cumplen años.</p>
                    </div>
                </section>

                {/* Filters */}
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

                {/* Events Grid */}
                {filteredEvents.length === 0 ? (
                    <div className="empty-state glass-panel">
                        <Calendar size={48} />
                        <h3>Sin cumpleaños próximos</h3>
                        <p>No hay cumpleaños en este período</p>
                    </div>
                ) : (
                    <div className="events-grid-premium">
                        {filteredEvents.map((event, index) => (
                            <div
                                key={index}
                                className={`event-card-premium glass-panel ${event.daysUntil === 0 ? 'today' : ''}`}
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className="card-shine"></div>

                                <div className="event-date-badge">
                                    <span className="day">{getDay(event.date)}</span>
                                    <span className="month">{getMonth(event.date)}</span>
                                </div>

                                <div className="event-info">
                                    <h3 aria-label={`Cumpleaños de ${event.name}`}>{event.name}</h3>
                                    <p className="event-age" aria-label={`Cumplirá ${event.age} años`}>
                                        Cumple {event.age} años
                                    </p>

                                    <div
                                        className={`status-badge-pulse ${event.daysUntil === 0 ? 'today' : event.daysUntil <= 7 ? 'soon' : ''}`}
                                        aria-label={event.daysUntil === 0 ? "Es hoy" : `En ${event.daysUntil} días`}
                                    >
                                        {event.daysUntil === 0 ? (
                                            <><PartyPopper size={14} aria-hidden="true" /> ¡Hoy!</>
                                        ) : event.daysUntil === 1 ? (
                                            <><Clock size={14} aria-hidden="true" /> Mañana</>
                                        ) : (
                                            <>En {event.daysUntil} días</>
                                        )}
                                    </div>
                                </div>

                                <button
                                    className="action-btn-glow"
                                    onClick={() => handleSendWish(event.name || '')}
                                    aria-label={`Enviar felicitación a ${event.name}`}
                                >
                                    <span>Felicitar</span>
                                    <ArrowRight size={16} aria-hidden="true" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

            </main>

            <FloatingDock />
        </div>
    );
};
