import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './SportsScreen.css';

const SPORTS = [
    {
        id: 'basketball',
        name: 'Baloncesto',
        icon: '🏀',
        desc: '3x3 en la cancha.',
        teams: 4,
        status: 'Inscripciones Abiertas'
    },
    {
        id: 'softball',
        name: 'Softbol',
        icon: '🥎',
        desc: 'El clásico de las tardes.',
        teams: 4,
        status: 'Inscripciones Abiertas'
    },
    {
        id: 'domino',
        name: 'Dominó',
        icon: '🁇',
        desc: 'Para los estrategas.',
        teams: 8,
        status: 'Torneo Activo'
    },
    {
        id: 'volleyball',
        name: 'Voleibol',
        icon: '🏐',
        desc: 'Diversión en equipo.',
        teams: 2,
        status: 'Planificación'
    },
    {
        id: 'cardio',
        name: 'Caminata',
        icon: '🏃',
        desc: '5K Familiar matutino.',
        teams: 1,
        status: 'Evento Libre'
    }
];

export const SportsScreen = () => {
    const navigate = useNavigate();
    const [voteSport, setVoteSport] = useState('');

    const handleRegister = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Debes iniciar sesión para inscribirte.');
                return;
            }

            const res = await fetch('/api/sports/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sportId: 'softball', // Defaulting to Softball for now as general registration
                    sportName: 'Softbol'
                })
            });

            if (res.ok) {
                alert('✅ ¡Solicitud enviada! Recibirás un correo de confirmación.');
            } else {
                alert('❌ Error al enviar solicitud. Intenta luego.');
            }
        } catch (e) {
            console.error(e);
            alert('❌ Error de conexión.');
        }
    };

    const handleVote = async () => {
        if (!voteSport.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/votes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sportName: voteSport })
            });

            if (res.ok) {
                alert('✅ ¡Gracias por tu voto!');
                setVoteSport('');
            } else {
                const data = await res.json();
                alert(`❌ ${data.error || 'Error al votar'}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="sports-screen">
            <header className="sports-header">
                <button className="back-btn" onClick={() => navigate('/app')}>
                    ← Volver
                </button>
                <h1>Copa Familia</h1>
                <p className="sports-subtitle">Henríquez Cruz 2026</p>

                {/* Countdown Mockup */}
                <div className="countdown-card">
                    <div className="time-block">
                        <span className="number">45</span>
                        <span className="label">Días</span>
                    </div>
                    <div className="separator">:</div>
                    <div className="time-block">
                        <span className="number">12</span>
                        <span className="label">Horas</span>
                    </div>
                    <div className="separator">:</div>
                    <div className="time-block">
                        <span className="number">00</span>
                        <span className="label">Mins</span>
                    </div>
                </div>
            </header>

            <main className="sports-content">
                <section className="intro-text">
                    <h2>¡A mover el cuerpo!</h2>
                    <p>
                        El deporte es la excusa perfecta para abrazarnos.
                        Inscribe a tu rama en las diferentes disciplinas.
                    </p>
                </section>

                <div className="sports-grid">
                    {SPORTS.map(sport => (
                        <div key={sport.id} className="sport-card">
                            <div className="sport-icon">{sport.icon}</div>
                            <h3>{sport.name}</h3>
                            <p>{sport.desc}</p>
                            <span className={`status-badge ${sport.status.toLowerCase().replace(' ', '-')}`}>
                                {sport.status}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Voting Section */}
                <div className="voting-section" style={{ marginTop: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px' }}>
                    <h3 style={{ color: '#D4AF37', marginBottom: '1rem' }}>¿Falta tu deporte favorito?</h3>
                    <div className="vote-input-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <input
                            type="text"
                            placeholder="Ej. Dominó, Ajedrez..."
                            value={voteSport}
                            onChange={(e) => setVoteSport(e.target.value)}
                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
                        />
                        <button
                            onClick={handleVote}
                            style={{ background: '#D4AF37', color: 'black', fontWeight: 'bold', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Votar
                        </button>
                    </div>
                </div>

                <div className="cta-container">
                    <button className="register-team-btn" onClick={handleRegister}>
                        Inscribir mi Equipo (Softbol)
                    </button>
                </div>
            </main>

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
                <div className="nav-item active">
                    <span>🏆</span>
                    <span>Deportes</span>
                </div>
                <div className="nav-item" onClick={() => navigate('/feed')}>
                    <span>💬</span>
                    <span>Feed</span>
                </div>
            </nav>
        </div>
    );
};
