import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
    Trophy, Users, Timer, Sparkles, Medal, Activity,
    Calendar, Heart, ArrowRight, Share2, Info
} from 'lucide-react';
import './SportsScreen.css';

// --- Types ---
interface Sport {
    id: string;
    name: string;
    icon: React.ReactNode;
    desc: string;
    teams: number;
    maxTeams: number;
    status: 'Inscripciones Abiertas' | 'Torneo Activo' | 'Planificación' | 'Evento Libre';
    date?: string;
}

const SPORTS: Sport[] = [
    {
        id: 'softball',
        name: 'Softbol',
        icon: <Trophy size={40} />,
        desc: 'El clásico de las tardes.',
        teams: 4,
        maxTeams: 8,
        status: 'Inscripciones Abiertas',
        date: '2026-06-15'
    },
    {
        id: 'basketball',
        name: 'Baloncesto',
        icon: <Activity size={40} />,
        desc: '3x3 en la cancha.',
        teams: 4,
        maxTeams: 6,
        status: 'Inscripciones Abiertas',
        date: '2026-06-16'
    },
    {
        id: 'domino',
        name: 'Dominó',
        icon: <Users size={40} />,
        desc: 'Para los estrategas.',
        teams: 8,
        maxTeams: 16,
        status: 'Torneo Activo',
        date: '2026-06-15'
    },
    {
        id: 'volleyball',
        name: 'Voleibol',
        icon: <Medal size={40} />,
        desc: 'Diversión en equipo.',
        teams: 2,
        maxTeams: 4,
        status: 'Planificación'
    },
    {
        id: 'cardio',
        name: 'Caminata 5K',
        icon: <Heart size={40} />,
        desc: 'Evento matutino familiar.',
        teams: 1,
        maxTeams: 1,
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
        <div className={`toast-notification ${show ? 'show' : ''}`}>
            <Sparkles size={18} color="#D4AF37" />
            <span>{message}</span>
        </div>
    );
};

const CountdownToEvent = () => {
    const targetDate = new Date('2026-06-15T09:00:00');
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const difference = +targetDate - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                días: Math.floor(difference / (1000 * 60 * 60 * 24)),
                horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
                min: Math.floor((difference / 1000 / 60) % 60),
                seg: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        return () => clearTimeout(timer);
    });

    return (
        <div className="countdown-card glass-panel">
            {Object.keys(timeLeft).map((interval, index) => (
                <React.Fragment key={interval}>
                    <div className="time-block">
                        {/* @ts-ignore */}
                        <span className="number">{timeLeft[interval] || '0'}</span>
                        <span className="label">{interval}</span>
                    </div>
                    {index < 3 && <div className="separator">:</div>}
                </React.Fragment>
            ))}
        </div>
    );
};

const VoteVisualization = () => {
    // Mock Data for "Live" votes
    const votes = [
        { name: 'Ajedrez', count: 45 },
        { name: 'Pádel', count: 32 },
        { name: 'Natación', count: 28 },
        { name: 'FIFA', count: 15 }
    ];
    const max = Math.max(...votes.map(v => v.count));

    return (
        <div className="vote-chart glass-panel">
            <h4 className="chart-title">❤️ Lo más pedido</h4>
            <div className="bars-container">
                {votes.map(v => (
                    <div key={v.name} className="vote-bar-row">
                        <span className="vote-label">{v.name}</span>
                        <div className="vote-track">
                            <div
                                className="vote-fill"
                                style={{ width: `${(v.count / max) * 100}%` }}
                            />
                        </div>
                        <span className="vote-count">{v.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const SportsScreen = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Todos');
    const [voteSport, setVoteSport] = useState('');
    const [toastMsg, setToastMsg] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [selectedSport, setSelectedSport] = useState<Sport | null>(null); // For modal if needed

    const triggerConfetti = () => {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#D4AF37', '#ffffff', '#B8962E']
        });
    };

    const successToast = (msg: string) => {
        setToastMsg(msg);
        setShowToast(true);
        triggerConfetti();
    };

    const handleRegister = async (sport: Sport) => {
        // Logic to register
        successToast(`¡Inscrito en ${sport.name}!`);
    };

    const handleVote = () => {
        if (!voteSport) return;
        successToast(`Voto registrado para: ${voteSport}`);
        setVoteSport('');
    };

    const filteredSports = activeTab === 'Todos'
        ? SPORTS
        : SPORTS.filter(s => s.status.includes(activeTab));

    return (
        <div className="sports-screen">
            <Toast
                message={toastMsg}
                show={showToast}
                onClose={() => setShowToast(false)}
            />

            <header className="sports-header-premium">
                <div className="header-bg-anim"></div>
                <button className="back-btn-glass" onClick={() => navigate('/app')}>
                    ←
                </button>
                <div className="header-content">
                    <h1>Copa Familia</h1>
                    <p className="subtitle-glow">Henríquez Cruz 2026</p>
                    <CountdownToEvent />
                </div>
            </header>

            <main className="sports-content">

                {/* Intro */}
                <section className="intro-card glass-panel">
                    <div className="intro-icon"><Sparkles size={24} color="#D4AF37" /></div>
                    <div className="intro-text">
                        <h3>El deporte nos une</h3>
                        <p>Inscribe a tu rama y compite por la <strong>Gran Copa Dorada</strong>.</p>
                    </div>
                </section>

                {/* Filters */}
                <div className="tabs-container">
                    {['Todos', 'Inscripciones', 'Activo'].map(tab => (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="sports-grid-premium">
                    {filteredSports.map((sport, index) => (
                        <div
                            key={sport.id}
                            className="sport-card-premium glass-panel"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="card-shine"></div>
                            <div className="sport-icon-glow">
                                {sport.icon}
                            </div>
                            <h3>{sport.name}</h3>

                            <div className="progress-section">
                                <div className="progress-info">
                                    <span>Equipos</span>
                                    <span>{sport.teams}/{sport.maxTeams}</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${(sport.teams / sport.maxTeams) * 100}%` }}
                                    ></div>
                                </div>
                            </div>

                            <p className="sport-desc">{sport.desc}</p>

                            <div className={`status-badge-pulse ${sport.status === 'Inscripciones Abiertas' ? 'open' : ''}`}>
                                {sport.status}
                            </div>

                            <button
                                className="action-btn-glow"
                                onClick={() => handleRegister(sport)}
                            >
                                {sport.status === 'Inscripciones Abiertas' ? 'Inscribirme' : 'Ver Detalles'}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Voting & Leaderboard Hybrid */}
                <div className="community-section">
                    <VoteVisualization />

                    <div className="voting-input-glass glass-panel">
                        <h4>¿Falta tu deporte?</h4>
                        <div className="input-row">
                            <input
                                type="text"
                                placeholder="Ej. Parchís..."
                                value={voteSport}
                                onChange={e => setVoteSport(e.target.value)}
                            />
                            <button onClick={handleVote}>
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>

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
                    <span>🏆</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/feed')}>
                    <span>💬</span>
                </div>
            </nav>
        </div>
    );
};
