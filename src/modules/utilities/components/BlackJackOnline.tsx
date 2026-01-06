import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { soundManager } from '../../../utils/SoundManager';
import './BlackJackGame.css';

const API_URL = import.meta.env.PROD ? 'https://raices.renace.tech/api' : 'http://localhost:3001/api';

export const BlackJackOnline = () => {
    const navigate = useNavigate();
    const [tableId, setTableId] = useState<string | null>(null);
    const [tableNumber, setTableNumber] = useState<number | null>(null);
    const [tableState, setTableState] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [joinInput, setJoinInput] = useState('');
    const [activeTables, setActiveTables] = useState<any[]>([]);

    // Polling for game state updates
    useEffect(() => {
        if (!tableId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/blackjack/table/${tableId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTableState(data);

                    // Auto-trigger bot moves when it's a bot's turn
                    if (data.status === 'PLAYING') {
                        const currentPlayer = data.players[data.turnIndex];
                        if (currentPlayer?.isBot) {
                            fetch(`${API_URL}/blackjack/bot-move`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tableId })
                            });
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }, 1500);

        return () => clearInterval(interval);
    }, [tableId]);

    // Load active tables when in lobby
    useEffect(() => {
        if (!tableId) {
            loadActiveTables();
        }
    }, [tableId]);

    const loadActiveTables = async () => {
        try {
            const res = await fetch(`${API_URL}/blackjack/tables/active`);
            if (res.ok) setActiveTables(await res.json());
        } catch (e) { console.error(e); }
    };

    const createTable = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/blackjack/table`, { method: 'POST' });
            const data = await res.json();
            setTableId(data.id);
            setTableNumber(data.tableNumber);
            soundManager.playClick();
            // Auto join as Seat 0
            joinGame(data.id, 0);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const joinByNumber = async () => {
        const num = parseInt(joinInput);
        if (isNaN(num) || num < 1) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/blackjack/table/number/${num}`);
            if (res.ok) {
                const data = await res.json();
                setTableId(data.id);
                setTableNumber(data.tableNumber);
                setTableState(data);
                soundManager.playClick();
            } else {
                alert('Mesa no encontrada');
            }
        } catch (e) {
            console.error(e);
            alert('Error al buscar mesa');
        } finally {
            setLoading(false);
        }
    };

    const joinGame = async (tId: string, seatIndex: number, isBot = false) => {
        try {
            const res = await fetch(`${API_URL}/blackjack/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    tableId: tId,
                    seatIndex,
                    name: isBot ? `Bot ${seatIndex + 1}` : 'Jugador',
                    avatar: isBot ? 'https://ui-avatars.com/api/?name=Bot&background=random' : 'https://ui-avatars.com/api/?name=Tu&background=047857',
                    isBot
                })
            });
            const data = await res.json();
            if (!isBot && !playerId) setPlayerId(data.id);
            soundManager.playClick();

            // Refresh table state
            const tableRes = await fetch(`${API_URL}/blackjack/table/${tId}`);
            setTableState(await tableRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    const placeBet = async (amount: number) => {
        if (!playerId) return;
        try {
            const res = await fetch(`${API_URL}/blackjack/bet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, amount })
            });
            if (res.ok) {
                soundManager.playClick();
                // Optimistic update
                setTableState((prev: any) => ({
                    ...prev,
                    players: prev.players.map((p: any) => p.id === playerId ? { ...p, currentBet: amount } : p)
                }));
            }
        } catch (e) { console.error(e); }
    };

    const sendAction = async (action: string) => {
        if (!playerId) return;
        try {
            await fetch(`${API_URL}/blackjack/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: playerId, action })
            });
            // Play appropriate sound for action
            if (action === 'hit') soundManager.playCard();
            else if (action === 'stand') soundManager.playClick();
            else if (action === 'double') { soundManager.playCard(); soundManager.playClick(); }
            else if (action === 'split') soundManager.playClick();
        } catch (e) {
            console.error(e);
        }
    };

    const deal = async () => {
        if (!tableId) return;
        await fetch(`${API_URL}/blackjack/table/${tableId}/deal`, { method: 'POST' });
        // Play dealing sound sequence
        soundManager.playCard();
        setTimeout(() => soundManager.playCard(), 200);
        setTimeout(() => soundManager.playCard(), 400);
    };

    const leaveTable = () => {
        setTableId(null);
        setTableNumber(null);
        setTableState(null);
        setPlayerId(null);
        localStorage.removeItem('lastTableId');
    };

    // --- RENDER ---

    if (!tableId) {
        return (
            <div className="blackjack-screen lobby">
                <header className="game-header">
                    <button className="back-btn" onClick={() => navigate('/utilities')}>← Volver</button>
                    <h3>🃏 Blackjack Online</h3>
                </header>
                <div className="lobby-content">
                    <div className="lobby-card">
                        <h2>Crear Nueva Mesa</h2>
                        <p>Inicia una partida y comparte el número</p>
                        <button className="action-btn deal" onClick={createTable} disabled={loading}>
                            {loading ? '⏳ Creando...' : '🎲 Crear Mesa'}
                        </button>
                    </div>

                    <div className="lobby-divider"><span>ó</span></div>

                    <div className="lobby-card">
                        <h2>Unirse a Mesa</h2>
                        <div className="join-sections">
                            <div className="join-input-row">
                                <input
                                    type="number"
                                    placeholder="# Mesa"
                                    value={joinInput}
                                    onChange={(e) => setJoinInput(e.target.value)}
                                    className="table-input"
                                />
                                <button className="action-btn hit" onClick={joinByNumber} disabled={!joinInput}>🚀</button>
                            </div>

                            <div className="active-tables-list">
                                <h4>Mesas Activas ({activeTables.length}) <button className="refresh-btn" onClick={loadActiveTables}>↻</button></h4>
                                {activeTables.length === 0 ? <p className="no-tables">No hay mesas disponibles</p> : (
                                    <div className="tables-scroll">
                                        {activeTables.map(t => (
                                            <div key={t.id} className="table-item" onClick={() => {
                                                setTableId(t.id);
                                                setTableNumber(t.tableNumber);
                                                localStorage.setItem('lastTableId', t.id);
                                            }}>
                                                <span>Mesa #{t.tableNumber}</span>
                                                <span className="player-count-badge">👥 {t.players.length}/3</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <FloatingDock />
            </div>
        );
    }

    if (!tableState) return <div className="blackjack-screen"><div className="loading-spinner">⏳ Cargando mesa...</div></div>;

    const isMyTurn = tableState.status === 'PLAYING' && tableState.players[tableState.turnIndex]?.id === playerId;
    const dealerHand = JSON.parse(tableState.dealerHand);
    const playerCount = tableState.players?.length || 0;

    return (
        <div className="blackjack-screen">
            <header className="game-header">
                <button className="back-btn" onClick={leaveTable}>← Salir</button>
                <div className="header-info">
                    <h3 className="table-title">🎰 Mesa #{tableNumber}</h3>
                    <span className={`status-badge status-${tableState.status.toLowerCase()}`}>
                        {tableState.status === 'WAITING' && '⏳ Esperando'}
                        {tableState.status === 'PLAYING' && '🎮 Jugando'}
                        {tableState.status === 'FINISHED' && '🏆 Terminado'}
                    </span>
                </div>
                <div className="player-count">👥 {playerCount}/3</div>
            </header>

            <div className="table-area online-table">
                {/* Dealer Section */}
                <div className="dealer-section">
                    <div className="hand dealer-hand">
                        <div className="hand-header">
                            <span className="dealer-label">🎩 Dealer</span>
                            <span className="score-badge">
                                {tableState.status === 'PLAYING' ? '?' : getScoreSum(dealerHand)}
                            </span>
                        </div>
                        <div className="cards">
                            {dealerHand.map((c: any, i: number) => (
                                <div
                                    key={i}
                                    className={`card ${tableState.status === 'PLAYING' && i === 0 ? 'hidden' : ''} ${['♥', '♦'].includes(c.suit) ? 'red' : ''}`}
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    {tableState.status === 'PLAYING' && i === 0 ? '?' : `${c.value}${c.suit}`}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Players Grid */}
                <div className="players-grid">
                    {[0, 1, 2].map(seat => {
                        const p = tableState.players.find((pl: any) => pl.seatIndex === seat);
                        const isCurrentTurn = tableState.turnIndex === seat && tableState.status === 'PLAYING';
                        const isMe = p?.id === playerId;

                        return (
                            <div
                                key={seat}
                                className={`seat ${p ? 'occupied' : 'empty'} ${isCurrentTurn ? 'active-turn' : ''} ${isMe ? 'my-seat' : ''}`}
                            >
                                {p ? (
                                    <div className="player-spot">
                                        <div className="player-avatar">
                                            <img src={p.avatar} alt={p.name} />
                                            {p.isBot && <span className="bot-badge">🤖</span>}
                                        </div>
                                        <div className="name-tag">
                                            {p.name}
                                            {isMe && <span className="you-badge">Tú</span>}
                                        </div>
                                        <div className="player-money">💰 ${p.money}</div>
                                        <div className="player-hands">
                                            {JSON.parse(p.hands).map((h: any, hi: number) => (
                                                <div key={hi} className={`hand-mini hand-${h.status.toLowerCase()}`}>
                                                    <div className="cards-mini">
                                                        {h.cards.map((c: any, ci: number) => (
                                                            <span key={ci} className={['♥', '♦'].includes(c.suit) ? 'red' : ''}>
                                                                {c.value}{c.suit}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="hand-info">
                                                        <span className="hand-score">{getScoreSum(h.cards)}</span>
                                                        <span className="bet-mini">${h.bet}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-seat-actions">
                                        <span className="seat-number">Asiento {seat + 1}</span>
                                        <button onClick={() => joinGame(tableId!, seat)}>👤 Sentarse</button>
                                        <button onClick={() => joinGame(tableId!, seat, true)}>🤖 +Bot</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="controls">
                {tableState.status === 'WAITING' || tableState.status === 'FINISHED' ? (
                    <div className="betting-phase">
                        {playerId && tableState.players.find((p: any) => p.id === playerId) && (
                            <div className="chips-selector">
                                <p>Tu Apuesta: ${tableState.players.find((p: any) => p.id === playerId)?.currentBet || 0}</p>
                                <div className="chips-row">
                                    {[10, 50, 100, 500].map(val => (
                                        <button
                                            key={val}
                                            className="chip-btn"
                                            onClick={() => placeBet(val)}
                                            style={{ borderColor: val === 10 ? '#fff' : val === 50 ? 'blue' : val === 100 ? 'red' : 'gold' }}
                                        >
                                            ${val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="deal-section">
                            {playerCount > 0 ? (
                                <button className="action-btn deal pulse" onClick={deal}>
                                    🃏 REPARTIR CARTAS
                                </button>
                            ) : (
                                <p className="waiting-msg">Esperando jugadores...</p>
                            )}
                        </div>
                    </div>
                ) : isMyTurn ? (
                    <div className="play-actions">
                        <button className="action-btn hit" onClick={() => sendAction('hit')}>➕ Pedir</button>
                        <button className="action-btn stand" onClick={() => sendAction('stand')}>✋ Plantarse</button>
                        <button className="action-btn double" onClick={() => sendAction('double')}>💰 Doblar</button>
                        <button className="action-btn split" onClick={() => sendAction('split')}>✂️ Dividir</button>
                    </div>
                ) : (
                    <div className="waiting-turn">
                        <span className="spinner">⏳</span>
                        <span>Esperando turno...</span>
                    </div>
                )}
            </div>
            <FloatingDock />
        </div>
    );
};

// Helper for score calculation
function getScoreSum(hand: any[]) {
    if (!hand || hand.length === 0) return 0;
    let score = 0;
    let aces = 0;
    hand.forEach(c => {
        score += c.points;
        if (c.value === 'A') aces++;
    });
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}
