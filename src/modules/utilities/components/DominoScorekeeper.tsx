import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DominoScorekeeper.css';

interface Round {
    team1: number;
    team2: number;
}

export const DominoScorekeeper = () => {
    const navigate = useNavigate();
    const [team1Name, setTeam1Name] = useState('Equipo 1');
    const [team2Name, setTeam2Name] = useState('Equipo 2');
    const [team1Score, setTeam1Score] = useState(0);
    const [team2Score, setTeam2Score] = useState(0);
    const [targetScore, setTargetScore] = useState(150);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [winner, setWinner] = useState<1 | 2 | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [currentRound, setCurrentRound] = useState({ team1: 0, team2: 0 });

    const pointButtons = [5, 10, 15, 20, 25, 30];

    useEffect(() => {
        // Check winner
        if (team1Score >= targetScore) {
            setWinner(1);
        } else if (team2Score >= targetScore) {
            setWinner(2);
        }
    }, [team1Score, team2Score, targetScore]);

    const addPoints = (team: 1 | 2, points: number) => {
        if (winner) return;

        if (team === 1) {
            setCurrentRound(prev => ({ ...prev, team1: prev.team1 + points }));
        } else {
            setCurrentRound(prev => ({ ...prev, team2: prev.team2 + points }));
        }
    };

    const confirmRound = () => {
        if (currentRound.team1 === 0 && currentRound.team2 === 0) return;

        setTeam1Score(prev => prev + currentRound.team1);
        setTeam2Score(prev => prev + currentRound.team2);
        setRounds(prev => [...prev, currentRound]);
        setCurrentRound({ team1: 0, team2: 0 });
    };

    const undoLastRound = () => {
        if (rounds.length === 0) return;

        const lastRound = rounds[rounds.length - 1];
        setTeam1Score(prev => prev - lastRound.team1);
        setTeam2Score(prev => prev - lastRound.team2);
        setRounds(prev => prev.slice(0, -1));
        setWinner(null);
    };

    const resetGame = () => {
        setTeam1Score(0);
        setTeam2Score(0);
        setRounds([]);
        setCurrentRound({ team1: 0, team2: 0 });
        setWinner(null);
    };

    const resetCurrentRound = () => {
        setCurrentRound({ team1: 0, team2: 0 });
    };

    return (
        <div className="domino-screen">
            <header className="domino-header">
                <button className="back-btn" onClick={() => navigate('/utilities')}>
                    ← Volver
                </button>
                <h1>🁩 Dominó</h1>
                <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
                    ⚙️
                </button>
            </header>

            {/* Settings Panel */}
            {showSettings && (
                <div className="settings-panel">
                    <h3>Configuración</h3>
                    <div className="setting-row">
                        <label>Meta de puntos:</label>
                        <div className="target-options">
                            {[100, 150, 200].map(t => (
                                <button
                                    key={t}
                                    className={targetScore === t ? 'active' : ''}
                                    onClick={() => setTargetScore(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="setting-row">
                        <label>Equipo 1:</label>
                        <input
                            type="text"
                            value={team1Name}
                            onChange={e => setTeam1Name(e.target.value)}
                        />
                    </div>
                    <div className="setting-row">
                        <label>Equipo 2:</label>
                        <input
                            type="text"
                            value={team2Name}
                            onChange={e => setTeam2Name(e.target.value)}
                        />
                    </div>
                </div>
            )}

            <div className="target-display">
                Meta: <strong>{targetScore}</strong> puntos
            </div>

            {/* Score Boards */}
            <div className="score-boards">
                <div className={`score-board team1 ${winner === 1 ? 'winner' : ''} ${team1Score > team2Score ? 'leading' : ''}`}>
                    <input
                        className="team-name"
                        value={team1Name}
                        onChange={e => setTeam1Name(e.target.value)}
                    />
                    <div className="score">{team1Score}</div>
                    {currentRound.team1 > 0 && (
                        <div className="pending-points">+{currentRound.team1}</div>
                    )}
                    <div className="point-buttons">
                        {pointButtons.map(p => (
                            <button key={p} onClick={() => addPoints(1, p)} disabled={!!winner}>
                                +{p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="vs-divider">VS</div>

                <div className={`score-board team2 ${winner === 2 ? 'winner' : ''} ${team2Score > team1Score ? 'leading' : ''}`}>
                    <input
                        className="team-name"
                        value={team2Name}
                        onChange={e => setTeam2Name(e.target.value)}
                    />
                    <div className="score">{team2Score}</div>
                    {currentRound.team2 > 0 && (
                        <div className="pending-points">+{currentRound.team2}</div>
                    )}
                    <div className="point-buttons">
                        {pointButtons.map(p => (
                            <button key={p} onClick={() => addPoints(2, p)} disabled={!!winner}>
                                +{p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Round Actions */}
            <div className="round-actions">
                <button
                    className="confirm-round-btn"
                    onClick={confirmRound}
                    disabled={currentRound.team1 === 0 && currentRound.team2 === 0}
                >
                    ✓ Confirmar Ronda
                </button>
                <button className="reset-round-btn" onClick={resetCurrentRound}>
                    ↩ Limpiar
                </button>
            </div>

            {/* Rounds History */}
            {rounds.length > 0 && (
                <div className="rounds-history">
                    <h3>Historial de Rondas</h3>
                    <div className="rounds-list">
                        {rounds.map((r, i) => (
                            <div key={i} className="round-row">
                                <span className="round-num">R{i + 1}</span>
                                <span className={r.team1 > r.team2 ? 'highlight' : ''}>{r.team1}</span>
                                <span className="separator">-</span>
                                <span className={r.team2 > r.team1 ? 'highlight' : ''}>{r.team2}</span>
                            </div>
                        ))}
                    </div>
                    <button className="undo-btn" onClick={undoLastRound}>
                        ↩ Deshacer última ronda
                    </button>
                </div>
            )}

            {/* Winner Modal */}
            {winner && (
                <div className="winner-modal">
                    <div className="winner-content">
                        <div className="trophy">🏆</div>
                        <h2>¡{winner === 1 ? team1Name : team2Name} Gana!</h2>
                        <p>{team1Score} - {team2Score}</p>
                        <button onClick={resetGame}>Nueva Partida</button>
                    </div>
                </div>
            )}

            {/* Game Actions */}
            <div className="game-actions">
                <button className="reset-game-btn" onClick={resetGame}>
                    🔄 Reiniciar Partida
                </button>
            </div>
        </div>
    );
};
