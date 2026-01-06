import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingDock } from '../../../components/FloatingDock';
import { soundManager } from '../../../utils/SoundManager';
import './BlackJackGame.css'; // Reusing styles

const API_URL = import.meta.env.PROD ? 'https://raices.renace.tech/api' : 'http://localhost:3001/api';

export const BlackJackOnline = () => {
    const navigate = useNavigate();
    const [tableId, setTableId] = useState<string | null>(null);
    const [tableState, setTableState] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [playerId, setPlayerId] = useState<string | null>(null);

    // Polling
    useEffect(() => {
        if (!tableId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/blackjack/table/${tableId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTableState(data);

                    // Check for Bot Turn to trigger it
                    if (data.status === 'PLAYING') {
                        const currentPlayer = data.players[data.turnIndex];
                        if (currentPlayer && currentPlayer.isBot && !currentPlayer.processing) {
                            // Trigger bot move
                            // Check local flag or time to avoid spam
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
        }, 2000);

        return () => clearInterval(interval);
    }, [tableId]);

    const createTable = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/blackjack/table`, { method: 'POST' });
            const data = await res.json();
            setTableId(data.id);
            // Auto join as Seat 0
            joinGame(data.id, 0);
        } catch (e) {
            console.error(e);
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
                    name: isBot ? `Bot ${seatIndex}` : 'Jugador',
                    avatar: isBot ? 'https://ui-avatars.com/api/?name=Bot' : 'https://ui-avatars.com/api/?name=Player',
                    isBot
                })
            });
            const data = await res.json();
            if (!isBot && !playerId) setPlayerId(data.id);
            // Refresh
            const tableRes = await fetch(`${API_URL}/blackjack/table/${tId}`);
            setTableState(await tableRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    const sendAction = async (action: string) => {
        if (!playerId) return;
        try {
            await fetch(`${API_URL}/blackjack/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: playerId, action })
            });
            soundManager.playTone(500, 'sine', 0.1);
        } catch (e) {
            console.error(e);
        }
    };

    const deal = async () => {
        if (!tableId) return;
        await fetch(`${API_URL}/blackjack/table/${tableId}/deal`, { method: 'POST' });
        soundManager.playTone(600, 'square', 0.05);
    };

    if (!tableId) {
        return (
            <div className="blackjack-screen lobby">
                <header className="game-header">
                    <button className="back-btn" onClick={() => navigate('/utilities')}>←</button>
                    <h3>Blackjack Online</h3>
                </header>
                <div className="lobby-content">
                    <button className="action-btn deal" onClick={createTable} disabled={loading}>
                        {loading ? 'Creando...' : 'Crear Mesa Nueva'}
                    </button>
                    <div className="join-manual">
                        <input type="text" placeholder="ID de Mesa" id="join-id" />
                        <button className="action-btn hit" onClick={() => {
                            const val = (document.getElementById('join-id') as HTMLInputElement).value;
                            if (val) {
                                setTableId(val);
                                // Prompt for seat or auto-find? For now just view.
                            }
                        }}>Unirse</button>
                    </div>
                </div>
            </div>
        );
    }

    if (!tableState) return <div className="loading">Cargando mesa...</div>;

    const isMyTurn = tableState.status === 'PLAYING' && tableState.players[tableState.turnIndex]?.id === playerId;

    // Parse Hands
    const dealerHand = JSON.parse(tableState.dealerHand);

    return (
        <div className="blackjack-screen">
            <header className="game-header">
                <button className="back-btn" onClick={() => setTableId(null)}>Salir</button>
                <div className="header-info">
                    <h3>Mesa: {tableId.slice(0, 4)}</h3>
                    <span className="status-badge">{tableState.status}</span>
                </div>
            </header>

            <div className="table-area online-table">
                {/* Dealer */}
                <div className="hand dealer-hand">
                    <div className="hand-header">
                        <h2>Dealer ({tableState.status === 'PLAYING' ? '?' : getScoreSum(dealerHand)})</h2>
                    </div>
                    <div className="cards">
                        {dealerHand.map((c: any, i: number) => (
                            <div key={i} className={`card ${tableState.status === 'PLAYING' && i === 0 ? 'hidden' : ''} ${['♥', '♦'].includes(c.suit) ? 'red' : ''}`}>
                                {tableState.status === 'PLAYING' && i === 0 ? '?' : `${c.value}${c.suit}`}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Players Grid */}
                <div className="players-grid">
                    {[0, 1, 2].map(seat => {
                        const p = tableState.players.find((pl: any) => pl.seatIndex === seat);
                        return (
                            <div key={seat} className={`seat ${p ? 'occupied' : 'empty'} ${tableState.turnIndex === seat && tableState.status === 'PLAYING' ? 'active-turn' : ''}`}>
                                {p ? (
                                    <div className="player-spot">
                                        <div className="name-tag">{p.name} {p.isBot && '🤖'}</div>
                                        <div className="player-hands">
                                            {JSON.parse(p.hands).map((h: any, hi: number) => (
                                                <div key={hi} className={`hand-mini ${h.status}`}>
                                                    <div className="cards-mini">
                                                        {h.cards.map((c: any, ci: number) => (
                                                            <span key={ci} className={['♥', '♦'].includes(c.suit) ? 'red' : ''}>{c.value}{c.suit}</span>
                                                        ))}
                                                    </div>
                                                    <div className="bet-mini">${h.bet}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-seat-actions">
                                        <button onClick={() => joinGame(tableId, seat)}>Sentarse</button>
                                        <button onClick={() => joinGame(tableId, seat, true)}>+Bot</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="controls">
                {tableState.status === 'WAITING' || tableState.status === 'FINISHED' ? (
                    <button className="action-btn deal" onClick={deal}>REPARTIR MANO</button>
                ) : isMyTurn ? (
                    <div className="play-actions">
                        <button className="action-btn hit" onClick={() => sendAction('hit')}>Pedir</button>
                        <button className="action-btn stand" onClick={() => sendAction('stand')}>Plantarse</button>
                        <button className="action-btn double" onClick={() => sendAction('double')}>Doblar</button>
                        {/* Split check logic simplified */}
                        <button className="action-btn" onClick={() => sendAction('split')}>Dividir</button>
                    </div>
                ) : (
                    <div className="waiting-msg">Esperando turno...</div>
                )}
            </div>

            <FloatingDock />
        </div>
    );
};

// Helper for score (client side display only)
function getScoreSum(hand: any[]) {
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
