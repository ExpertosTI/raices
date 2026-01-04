import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
    Trophy, Users, Sparkles, Medal, Activity,
    Heart, ArrowRight, CheckCircle
} from 'lucide-react';
import { useConfirm } from '../../../components/ConfirmDialog';
import { FloatingDock } from '../../../components/FloatingDock';
import './SportsScreen.css';

// --- Types ---
interface Sport {
    id: string;
    name: string;
    icon: React.ReactNode;
    desc: string;
    teams: number; // calculated locally based on API
    maxTeams: number;
    status: 'Inscripciones Abiertas' | 'Torneo Activo' | 'Planificación' | 'Evento Libre';
    date?: string;
    isRegistered?: boolean; // dynamic
}

interface Participant {
    userId: string;
    name: string;
    branch: string;
    color: string;
    image?: string;
}

const STATIC_SPORTS_CONFIG: Omit<Sport, 'teams' | 'isRegistered'>[] = [
    {
        id: 'softball',
        name: 'Softbol',
        icon: <Trophy size={40} aria-hidden="true" />,
        desc: 'El clásico de las tardes.',
        maxTeams: 8,
        status: 'Inscripciones Abiertas',
        date: '2026-06-15'
    },
    {
        id: 'basketball',
        name: 'Baloncesto',
        icon: <Activity size={40} aria-hidden="true" />,
        desc: '3x3 en la cancha.',
        maxTeams: 6,
        status: 'Inscripciones Abiertas',
        date: '2026-06-16'
    },
    {
        id: 'domino',
        name: 'Dominó',
        icon: <Users size={40} aria-hidden="true" />,
        desc: 'Para los estrategas.',
        maxTeams: 16,
        status: 'Torneo Activo',
        date: '2026-06-15'
    },
    {
        id: 'volleyball',
        name: 'Voleibol',
        icon: <Medal size={40} aria-hidden="true" />,
        desc: 'Diversión en equipo.',
        maxTeams: 4,
        status: 'Planificación'
    },
    {
        id: 'cardio',
        name: 'Caminata 5K',
        icon: <Heart size={40} aria-hidden="true" />,
        desc: 'Evento matutino familiar.',
        maxTeams: 100, // Unlimited basically
        status: 'Evento Libre'
    }
];

// --- Components ---

const Toast = ({ message, show, onClose }: { message: string, show: boolean, onClose: () => void }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <div
            className={`toast-notification ${show ? 'show' : ''}`}
            role="status"
            aria-live="polite"
        >
            <Sparkles size={18} color="#D4AF37" aria-hidden="true" />
            <span>{message}</span>
        </div>
    );
};

export const SportsScreen: React.FC = () => {
    const navigate = useNavigate();
    const handleConfirm = useConfirm();

    const [sports, setSports] = useState<Sport[]>([]);
    const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
    const [loading, setLoading] = useState(true);
    const [toastMsg, setToastMsg] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Initial Load
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        setCurrentUser(user);

        fetchData(user?.id);
    }, []);

    const fetchData = (userId?: string) => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        // Fetch Participants from backend
        fetch('/api/sports/participants', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then((data: Record<string, Participant[]>) => {
                setParticipants(data);

                // Merge static config with dynamic data
                const updatedSports = STATIC_SPORTS_CONFIG.map(sport => {
                    const sportParticipants = data[sport.name] || []; // Backend groups by Name
                    const isRegistered = userId ? sportParticipants.some(p => p.userId === userId) : false;

                    return {
                        ...sport,
                        teams: sportParticipants.length,
                        isRegistered
                    };
                });

                setSports(updatedSports);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load sports data', err);
                setLoading(false);
                // Fallback to static
                setSports(STATIC_SPORTS_CONFIG.map(s => ({ ...s, teams: 0, isRegistered: false })));
            });
    };

    const handleRegister = async (sport: Sport) => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        if (sport.isRegistered) {
            setToastMsg('¡Ya estás inscrito en este evento!');
            setShowToast(true);
            return;
        }

        const confirmed = await handleConfirm(
            `¿Seguro que quieres inscribirte en ${sport.name}?`,
            'Confirmar Inscripción'
        );

        if (confirmed) {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/sports/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        sportId: sport.id,
                        sportName: sport.name
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Error al inscribirse');
                }

                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#D4AF37', '#ffffff']
                });

                setToastMsg(`✅ Inscrito en ${sport.name}`);
                setShowToast(true);

                // Refresh data to update UI
                fetchData(currentUser.id);

            } catch (error: any) {
                setToastMsg(error.message || 'Error de conexión');
                setShowToast(true);
            }
        }
    };

    if (loading) {
        return (
            <div className="sports-screen loading" aria-live="polite">
                <div className="loading-spinner" aria-hidden="true">🏆</div>
                <p>Cargando Copa Familia...</p>
            </div>
        );
    }

    return (
        <div className="sports-screen">
            <main className="sports-content">
                <header className="sports-header-premium">
                    <h1>Copa Familia 2026</h1>
                    <p>Compite, diviértete y gana la gloria.</p>
                </header>

                <div className="sports-grid">
                    {sports.map((sport) => (
                        <article
                            key={sport.id}
                            className={`sport-card-premium ${sport.isRegistered ? 'registered' : ''}`}
                            aria-labelledby={`sport-title-${sport.id}`}
                        >
                            <div className="sport-icon-wrapper">
                                {sport.icon}
                            </div>

                            <div className="sport-info">
                                <div className="sport-header-row">
                                    <h3 id={`sport-title-${sport.id}`}>{sport.name}</h3>
                                    {sport.status === 'Torneo Activo' && <span className="live-badge" aria-label="Torneo activo">EN VIVO</span>}
                                </div>
                                <p className="sport-desc">{sport.desc}</p>

                                <div className="sport-meta">
                                    <div className="meta-item" aria-label={`${sport.teams} de ${sport.maxTeams} inscritos`}>
                                        <Users size={14} aria-hidden="true" />
                                        <span>{sport.teams} / {sport.maxTeams}</span>
                                    </div>
                                    {sport.date && (
                                        <div className="meta-item">
                                            <span>📅 {new Date(sport.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Participants List (Preview) */}
                                {participants[sport.name]?.length > 0 && (
                                    <div className="participants-preview">
                                        <p className="preview-label">Inscritos recientes:</p>
                                        <div className="avatars-row">
                                            {participants[sport.name].slice(0, 5).map((p, i) => (
                                                <div
                                                    key={i}
                                                    className="mini-avatar"
                                                    title={`${p.name} (${p.branch})`}
                                                    style={{ borderColor: p.color }}
                                                    aria-label={`Participante: ${p.name}`}
                                                >
                                                    {p.image ? (
                                                        <img src={p.image} alt="" />
                                                    ) : (
                                                        <span>{p.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                            ))}
                                            {participants[sport.name].length > 5 && (
                                                <div className="more-count" aria-label={`Y ${participants[sport.name].length - 5} más`}>
                                                    +{participants[sport.name].length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                className={`action-btn-premium ${sport.isRegistered ? 'registered' : ''}`}
                                onClick={() => handleRegister(sport)}
                                disabled={sport.isRegistered || sport.status === 'Planificación'}
                                aria-label={sport.isRegistered ? `Ya estás inscrito en ${sport.name}` : `Inscribirse en ${sport.name}`}
                            >
                                {sport.isRegistered ? (
                                    <>
                                        <CheckCircle size={18} aria-hidden="true" />
                                        <span>Inscrito</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Inscribirse</span>
                                        <ArrowRight size={18} aria-hidden="true" />
                                    </>
                                )}
                            </button>
                        </article>
                    ))}
                </div>
            </main>

            <Toast
                message={toastMsg}
                show={showToast}
                onClose={() => setShowToast(false)}
            />

            <FloatingDock />
        </div>
    );
};
