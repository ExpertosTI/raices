import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ClaimProfileModal } from './ClaimProfileModal';
import { PWAInstall } from './PWAInstall';
import { FloatingDock } from '../../../components/FloatingDock';
import { EditProfileModal } from './EditProfileModal';
import './AppDashboard.css';

interface BranchData {
    id: string;
    name: string;
    color: string;
    order: number;
    birthDate: string;
}

interface BirthdayEvent {
    name: string;
    date: string;
    daysUntil: number;
}

export const AppDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [branches, setBranches] = useState<BranchData[]>([]);
    const [events, setEvents] = useState<BirthdayEvent[]>([]);
    const [user, setUser] = useState<any>(null);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        // Load User
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        Promise.all([
            fetch('/api/branches').then(r => r.json()),
            fetch('/api/events').then(r => r.json()),
            // Refresh user data (me) to get latest link status
            fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }).then(r => r.ok ? r.json() : null)
        ]).then(([branchData, eventData, userData]) => {
            setBranches(Array.isArray(branchData) ? branchData : []);
            setEvents(Array.isArray(eventData) ? eventData.slice(0, 3) : []);
            if (userData) {
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
            }
        }).catch(() => { });
    }, []);

    const getMonth = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es', { month: 'short' }).toUpperCase();
    };

    const getDay = (dateStr: string) => {
        return new Date(dateStr).getDate();
    };

    // Show claim option if user exists but has no familyMember linked
    const canClaim = user && !user.familyMember;

    return (
        <div className="app-screen active">
            <div className="app-content">
                {/* Header */}
                <div className="app-header">
                    <button
                        className="user-badge"
                        onClick={() => user?.familyMember && setShowEditModal(true)}
                        aria-label="Editar perfil de usuario"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        {user?.image ? (
                            <img src={user.image} alt="" className="user-avatar-img" style={{ width: 45, height: 45, borderRadius: '50%', border: '3px solid #D4AF37' }} />
                        ) : (
                            <div className="user-avatar" style={{ borderColor: '#D4AF37' }}>👤</div>
                        )}
                        <div className="user-info">
                            <h3>{user?.name || 'Familia Henríquez Cruz'}</h3>
                            <span>{user?.familyMember ? user.familyMember.name : 'Bienvenido a tu legado'}</span>
                        </div>
                    </button>
                    <button className="logout-btn" onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        navigate('/login');
                    }}>
                        🚪 Salir
                    </button>
                </div>

                {/* Family Banner */}
                <div className="banner-section">
                    <img
                        src="/img/familiacopleta.jpg"
                        alt="Familia"
                        className="family-banner"
                    />
                </div>

                {/* Stats Grid */}
                <div className="stats-section">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-number">{branches.length || 12}</div>
                            <div className="stat-label">Ramas</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">12</div>
                            <div className="stat-label">Hermanos</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">50+</div>
                            <div className="stat-label">Miembros</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">77</div>
                            <div className="stat-label">Años de Historia</div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="tree-section">
                    <div className="section-header">
                        <h2 className="section-title-small">Explora</h2>
                    </div>
                    <div className="quick-actions">
                        {canClaim && (
                            <button className="action-card claim" onClick={() => setShowClaimModal(true)}>
                                <span className="action-icon">👑</span>
                                <span className="action-label">Soy uno de los 12</span>
                            </button>
                        )}
                        <button className="action-card tree" onClick={() => navigate('/tree')}>
                            <span className="action-icon">🌳</span>
                            <span className="action-label">Árbol Genealógico</span>
                        </button>
                        <button className="action-card events" onClick={() => navigate('/events')}>
                            <span className="action-icon">🎂</span>
                            <span className="action-label">Cumpleaños</span>
                        </button>
                        <button className="action-card sports" onClick={() => navigate('/sports')}>
                            <span className="action-icon">🏆</span>
                            <span className="action-label">Copa Familia</span>
                        </button>
                        <button className="action-card feed" onClick={() => navigate('/feed')}>
                            <span className="action-icon">📰</span>
                            <span className="action-label">Actividad</span>
                        </button>
                        <button className="action-card register" onClick={() => navigate('/register')}>
                            <span className="action-icon">➕</span>
                            <span className="action-label">Registrar Descendiente</span>
                        </button>
                        {user?.role === 'PATRIARCH' && (
                            <button className="action-card admin" onClick={() => navigate('/admin')}>
                                <span className="action-icon">⚙️</span>
                                <span className="action-label">Panel Admin</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Upcoming Events */}
                {events.length > 0 && (
                    <div className="feed-section">
                        <div className="section-header">
                            <h2 className="section-title-small">Próximos Cumpleaños</h2>
                        </div>
                        {events.map((event, i) => (
                            <div key={i} className="event-card">
                                <div className="event-date">
                                    <div className="event-day">{getDay(event.date)}</div>
                                    <div className="event-month">{getMonth(event.date)}</div>
                                </div>
                                <div className="event-info">
                                    <h4>🎂 {event.name}</h4>
                                    <span>en {event.daysUntil} días</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <FloatingDock />

            <ClaimProfileModal
                isOpen={showClaimModal}
                onClose={() => setShowClaimModal(false)}
                onSuccess={() => {
                    // Force refresh user data
                    window.location.reload();
                }}
            />
            {user?.familyMember && (
                <EditProfileModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    member={user.familyMember}
                    onSuccess={() => {
                        window.location.reload(); // Refresh to show changes
                    }}
                />
            )}
            <PWAInstall />
        </div>
    );
};
