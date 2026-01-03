import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Gift, Sparkles, PartyPopper, Clock, ArrowRight } from 'lucide-react';
import './EventsScreen.css';

interface BirthdayEvent {
    name: string;
    date: string;
    daysUntil: number;
    branch?: string;
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
        return new Date(dateStr).toLocaleDateString('es', { month: 'short' }).toUpperCase();
    };

    const getDay = (dateStr: string) => {
        return new Date(dateStr).getDate();
    };

    const getAge = (dateStr: string) => {
        const birth = new Date(dateStr);
        const today = new Date();
        return today.getFullYear() - birth.getFullYear();
    };

    const filteredEvents = activeFilter === 'Todos'
        ? events
        : activeFilter === 'Esta semana'
            ? events.filter(e => e.daysUntil <= 7)
            : events.filter(e => e.daysUntil <= 30);

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
                                    <h3>{event.name}</h3>
                                    <p className="event-age">Cumple {getAge(event.date)} años</p>

                                    <div className={`status-badge-pulse ${event.daysUntil === 0 ? 'today' : event.daysUntil <= 7 ? 'soon' : ''}`}>
                                        {event.daysUntil === 0 ? (
                                            <><PartyPopper size={14} /> ¡Hoy!</>
                                        ) : event.daysUntil === 1 ? (
                                            <><Clock size={14} /> Mañana</>
                                        ) : (
                                            <>En {event.daysUntil} días</>
                                        )}
                                    </div>
                                </div>

                                <button
                                    className="action-btn-glow"
                                    onClick={() => handleSendWish(event.name)}
                                >
                                    <span>Felicitar</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

            </main>

            {/* Nav */}
            <nav className="app-nav-glass">
                <div className="nav-item" onClick={() => navigate('/app')}>
                    <span>🏠</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/tree')}>
                    <span>🌳</span>
                </div>
                <div className="nav-item active">
                    <div className="active-indicator"></div>
                    <span>📅</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/feed')}>
                    <span>💬</span>
                </div>
            </nav>
        </div>
    );
};
