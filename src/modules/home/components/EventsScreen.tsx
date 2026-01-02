import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './EventsScreen.css';

interface BirthdayEvent {
    name: string;
    date: string;
    daysUntil: number;
}

export const EventsScreen: React.FC = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<BirthdayEvent[]>([]);
    const [loading, setLoading] = useState(true);

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
            <header className="events-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1 className="events-title">Cumpleaños</h1>
            </header>

            <div className="events-content">
                {events.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🎂</span>
                        <p>No hay cumpleaños próximos</p>
                    </div>
                ) : (
                    <div className="events-list">
                        {events.map((event, i) => (
                            <div
                                key={i}
                                className={`event-card ${event.daysUntil === 0 ? 'today' : ''}`}
                            >
                                <div className="event-date-box">
                                    <div className="event-day">{getDay(event.date)}</div>
                                    <div className="event-month">{getMonth(event.date)}</div>
                                </div>
                                <div className="event-details">
                                    <h3 className="event-name">🎂 {event.name}</h3>
                                    <p className="event-age">Cumple {getAge(event.date)} años</p>
                                    <p className="event-countdown">
                                        {event.daysUntil === 0
                                            ? '🎉 ¡Hoy!'
                                            : event.daysUntil === 1
                                                ? '⏰ Mañana'
                                                : `en ${event.daysUntil} días`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <nav className="app-nav">
                <div className="nav-item" onClick={() => navigate('/app')}>
                    <span>🏠</span>
                    <span>Inicio</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/tree')}>
                    <span>🌳</span>
                    <span>Árbol</span>
                </div>
                <div className="nav-item active" onClick={() => navigate('/events')}>
                    <span>📅</span>
                    <span>Eventos</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/feed')}>
                    <span>💬</span>
                    <span>Feed</span>
                </div>
            </nav>
        </div>
    );
};
