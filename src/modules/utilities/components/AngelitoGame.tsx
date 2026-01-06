
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import {
    getExchanges,
    createExchange,
    joinExchange,
    getExchangeDetails,
    getMyMatch,
    runMatching,
    getFamilyMembers
} from '../../../services/api';
import type { FamilyMember } from '../../../types';
import './AngelitoGame.css';

interface GameExchange {
    id: string;
    title: string;
    description: string;
    year: number;
    budget: string;
    status: 'REGISTRATION_OPEN' | 'MATCHED' | 'COMPLETED';
    createdAt: string;
    _count?: { participants: number };
}

interface Participant {
    id: string;
    memberId: string;
    userId: string;
    status: 'PENDING' | 'CONFIRMED';
    member: FamilyMember;
}

interface MatchResult {
    myMember: FamilyMember;
    targetMember: FamilyMember;
    targetWishes: string;
}

export const AngelitoGame = () => {
    const navigate = useNavigate();
    const [view, setView] = useState<'LIST' | 'DETAIL' | 'CREATE'>('LIST');
    const [exchanges, setExchanges] = useState<GameExchange[]>([]);
    const [selectedExchange, setSelectedExchange] = useState<GameExchange | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [myMatches, setMyMatches] = useState<MatchResult[]>([]);
    const [loading, setLoading] = useState(false);

    // Create Form
    const [newExchange, setNewExchange] = useState({
        title: `Angelito ${new Date().getFullYear()}`,
        year: new Date().getFullYear(),
        description: '',
        budget: 'RD$ 1,500 - 2,000'
    });

    // Join Form
    const [myFamilyMembers, setMyFamilyMembers] = useState<FamilyMember[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [wishes, setWishes] = useState('');
    const [joining, setJoining] = useState(false);

    // Auth
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdmin();
        loadExchanges();
    }, []);

    const checkAdmin = () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.role === 'ADMIN' || payload.role === 'PATRIARCH') {
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error("Invalid token", e);
            }
        }
    };

    const loadExchanges = async () => {
        setLoading(true);
        try {
            const data = await getExchanges();
            setExchanges(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetail = async (ex: GameExchange) => {
        setLoading(true);
        try {
            const details: any = await getExchangeDetails(ex.id);
            setSelectedExchange({ ...ex, ...details }); // Merge details
            setParticipants(details.participants);

            // Check matches
            if (ex.status === 'MATCHED') {
                const matches = await getMyMatch(ex.id);
                setMyMatches(matches);
            } else {
                setMyMatches([]);
            }

            // Load members for join dropdown
            const members = await getFamilyMembers();
            // Filter members I can manage? For now all standard members can self-join
            setMyFamilyMembers(members); // Just list all for simplicity or filter by user?
            // Ideally filter by `userId` but getFamilyMembers returns all.
            // We'll let user select ANY member for now (trust based) or filter locally if we knew which user ID.
            // But getFamilyMembers doesn't return owner ID usually?
            // Assuming open selection for MVP.

            setView('DETAIL');
        } catch (e) {
            console.error(e);
            alert('Error al cargar detalles');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createExchange(newExchange);
            alert('Intercambio creado exitosamente');
            setView('LIST');
            loadExchanges();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleJoin = async () => {
        if (!selectedMemberId) return alert('Selecciona un miembro');
        setJoining(true);
        try {
            if (!selectedExchange) return;
            await joinExchange(selectedExchange.id, selectedMemberId, wishes);
            alert('¡Te has unido al Angelito!');
            handleOpenDetail(selectedExchange); // Reload
        } catch (err: any) {
            alert(err.message);
        } finally {
            setJoining(false);
        }
    };

    const handleRunMatch = async () => {
        if (!confirm('¿Estás seguro de cerrar inscripciones y realizar el sorteo? Esto es irreversible.')) return;
        try {
            if (!selectedExchange) return;
            await runMatching(selectedExchange.id);
            alert('¡Sorteo realizado! Los participantes ya pueden ver sus angelitos.');
            handleOpenDetail({ ...selectedExchange, status: 'MATCHED' });
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="angelito-screen">
            <header className="angelito-header">
                <button className="back-btn" onClick={() => view === 'LIST' ? navigate('/utilities') : setView('LIST')}>
                    ←
                </button>
                <h1>🎅 Angelito {new Date().getFullYear()}</h1>
                {view === 'LIST' && isAdmin && (
                    <button className="create-btn" onClick={() => setView('CREATE')}>+</button>
                )}
            </header>

            {view === 'LIST' && (
                <div className="exchanges-grid">
                    {loading && <p>Cargando...</p>}
                    {!loading && exchanges.length === 0 && (
                        <div className="empty-state">
                            <p>No hay intercambios activos.</p>
                            {isAdmin && <p>¡Crea uno para empezar!</p>}
                        </div>
                    )}
                    {exchanges.map(ex => (
                        <div key={ex.id} className="exchange-card" onClick={() => handleOpenDetail(ex)}>
                            <div className="card-header">
                                <h3>{ex.title}</h3>
                                <span className={`status-badge ${ex.status === 'REGISTRATION_OPEN' ? 'open' : 'matched'}`}>
                                    {ex.status === 'REGISTRATION_OPEN' ? 'Inscripciones Abiertas' : 'En Curso'}
                                </span>
                            </div>
                            <div className="exchange-info">
                                <p>🗓 {ex.year}</p>
                                <p>💰 {ex.budget}</p>
                                <p>👥 {ex._count?.participants || 0} participantes</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {view === 'CREATE' && (
                <div className="exchange-detail">
                    <div className="detail-header">
                        <h2>Nuevo Intercambio</h2>
                    </div>
                    <form onSubmit={handleCreate}>
                        <div className="form-group">
                            <label>Título</label>
                            <input
                                className="form-input"
                                value={newExchange.title}
                                onChange={e => setNewExchange({ ...newExchange, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Año</label>
                            <input
                                type="number"
                                className="form-input"
                                value={newExchange.year}
                                onChange={e => setNewExchange({ ...newExchange, year: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Presupuesto Sugerido</label>
                            <input
                                className="form-input"
                                value={newExchange.budget}
                                onChange={e => setNewExchange({ ...newExchange, budget: e.target.value })}
                                placeholder="Ej: RD$ 1,500 - 2,000"
                            />
                        </div>
                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                className="form-textarea"
                                value={newExchange.description}
                                onChange={e => setNewExchange({ ...newExchange, description: e.target.value })}
                            />
                        </div>
                        <button className="cta-btn" type="submit">Crear Evento</button>
                    </form>
                </div>
            )}

            {view === 'DETAIL' && selectedExchange && (
                <div className="exchange-detail">
                    <div className="detail-header">
                        <h2>{selectedExchange.title}</h2>
                        <span className="budget-tag">{selectedExchange.budget}</span>
                        <p>{selectedExchange.description}</p>
                    </div>

                    {selectedExchange.status === 'MATCHED' && myMatches.length > 0 && (
                        <div className="my-matches-area">
                            <h3>🎁 Tienes asignado a:</h3>
                            {myMatches.map((m, idx) => (
                                <div key={idx} className="match-card">
                                    <p className="giver-hint">Para: {m.myMember.name}</p>
                                    <div className="match-reveal">
                                        <div className="revealed-match">
                                            {m.targetMember.photo ? (
                                                <img src={m.targetMember.photo} alt="target" className="match-avatar" />
                                            ) : (
                                                <div className="match-avatar" style={{ background: '#fff', color: '#000' }}>?</div>
                                            )}
                                            <h2>{m.targetMember.name}</h2>
                                            {m.targetWishes && (
                                                <p className="wishes">💡 Deseo: {m.targetWishes}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedExchange.status === 'REGISTRATION_OPEN' && (
                        <div className="join-section">
                            <h3>¡Únete al intercambio!</h3>
                            <div className="form-group">
                                <label>¿Quién participa?</label>
                                <select
                                    className="form-select"
                                    value={selectedMemberId}
                                    onChange={e => setSelectedMemberId(e.target.value)}
                                >
                                    <option value="">Selecciona un miembro...</option>
                                    {myFamilyMembers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Lista de Deseos / Gustos</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Libros, calcetines, chocolates..."
                                    value={wishes}
                                    onChange={e => setWishes(e.target.value)}
                                />
                            </div>
                            <button
                                className="cta-btn"
                                onClick={handleJoin}
                                disabled={joining || !selectedMemberId}
                            >
                                {joining ? 'Inscribiendo...' : 'Confirmar Participación'}
                            </button>
                        </div>
                    )}

                    <div className="participants-list">
                        <h3>Participantes ({participants.length})</h3>
                        {participants.map(p => (
                            <div key={p.id} className="participant-row">
                                <div className="p-avatar">
                                    {p.member.photo ? <img src={p.member.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : '👤'}
                                </div>
                                <span className="p-name">{p.member.name}</span>
                                {p.status === 'CONFIRMED' && <span>✅</span>}
                            </div>
                        ))}
                    </div>

                    {isAdmin && selectedExchange.status === 'REGISTRATION_OPEN' && (
                        <div className="admin-actions">
                            <p>Zona de Peligro (Admin)</p>
                            <button className="admin-btn" onClick={handleRunMatch}>
                                🎲 Cerrar Inscripciones y Sortear
                            </button>
                        </div>
                    )}
                </div>
            )}

            <FloatingDock />
        </div>
    );
};
